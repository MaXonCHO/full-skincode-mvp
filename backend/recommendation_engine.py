from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from models import User, Product, UserProduct, ProductCoOccurrence, Recommendation
from typing import List, Dict, Tuple
import math


class RecommendationEngine:
    """
    Recommendation engine для SkinCode.
    
    Использует collaborative filtering и co-occurrence analysis
    для генерации рекомендаций тональных средств.
    """
    
    # Веса для скоринга
    CO_OCCURRENCE_WEIGHT = 1.0
    UNDERTONE_MATCH_WEIGHT = 40.0
    SKIN_TYPE_MATCH_WEIGHT = 30.0
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_recommendations(
        self,
        user_id: int,
        undertone: str,
        skin_type: str,
        product_ids: List[int],
        top_k: int = 5
    ) -> List[Dict]:
        """
        Генерирует рекомендации для пользователя.
        
        Args:
            user_id: ID пользователя
            undertone: подтон кожи (warm, cool, neutral, olive)
            skin_type: тип кожи (dry, oily, combination, normal)
            product_ids: список ID продуктов, которые выбрал пользователь
            top_k: количество рекомендаций для возврата
            
        Returns:
            Список словарей с рекомендациями и score
        """
        if not product_ids:
            return []
        
        # 1. Находим похожих пользователей через co-occurrence
        similar_users = self._find_similar_users(product_ids, undertone, skin_type)
        
        # 2. Собираем кандидатов для рекомендаций
        candidate_products = self._get_candidate_products(product_ids, similar_users)
        
        # 3. Считаем score для каждого кандидата
        scored_products = self._score_products(
            candidate_products,
            product_ids,
            undertone,
            skin_type,
            similar_users
        )
        
        # 4. Ранжируем и возвращаем топ-k
        ranked_products = sorted(scored_products, key=lambda x: x['score'], reverse=True)
        return ranked_products[:top_k]
    
    def _find_similar_users(
        self,
        product_ids: List[int],
        undertone: str,
        skin_type: str
    ) -> List[int]:
        """
        Находит пользователей с похожими продуктами и характеристиками кожи.
        """
        # Базовый запрос: пользователи с теми же продуктами
        query = self.db.query(UserProduct.user_id).filter(
            UserProduct.product_id.in_(product_ids)
        ).distinct()
        
        similar_user_ids = [row[0] for row in query.all()]
        
        # Если есть undertone и skin_type, фильтруем по ним
        if undertone or skin_type:
            user_query = self.db.query(User.id).filter(User.id.in_(similar_user_ids))
            
            if undertone:
                user_query = user_query.filter(User.undertone == undertone)
            
            if skin_type:
                user_query = user_query.filter(User.skin_type == skin_type)
            
            similar_user_ids = [row[0] for row in user_query.all()]
        
        return similar_user_ids
    
    def _get_candidate_products(
        self,
        user_product_ids: List[int],
        similar_user_ids: List[int]
    ) -> List[int]:
        """
        Собирает продукты, которые используют похожие пользователи.
        """
        if not similar_user_ids:
            return []
        
        # Находим продукты похожих пользователей
        query = self.db.query(UserProduct.product_id).filter(
            UserProduct.user_id.in_(similar_user_ids),
            ~UserProduct.product_id.in_(user_product_ids)  # исключаем уже выбранные
        ).distinct()
        
        return [row[0] for row in query.all()]
    
    def _score_products(
        self,
        candidate_product_ids: List[int],
        user_product_ids: List[int],
        undertone: str,
        skin_type: str,
        similar_user_ids: List[int]
    ) -> List[Dict]:
        """
        Считает финальный score для каждого продукта-кандидата.
        
        Score = (co_occurrence_count * CO_OCCURRENCE_WEIGHT)
               + (undertone_match * UNDERTONE_MATCH_WEIGHT)
               + (skin_type_match * SKIN_TYPE_MATCH_WEIGHT)
        """
        scored_products = []
        
        for product_id in candidate_product_ids:
            # Получаем информацию о продукте
            product = self.db.query(Product).filter(Product.id == product_id).first()
            if not product:
                continue
            
            # 1. Co-occurrence score
            co_occurrence_score = self._calculate_co_occurrence_score(
                product_id, user_product_ids, similar_user_ids
            )
            
            # 2. Undertone match score
            undertone_match_score = self._calculate_undertone_match_score(
                product, undertone
            )
            
            # 3. Skin type match score
            skin_type_match_score = self._calculate_skin_type_match_score(
                product, skin_type
            )
            
            # Финальный score
            total_score = (
                co_occurrence_score * self.CO_OCCURRENCE_WEIGHT +
                undertone_match_score * self.UNDERTONE_MATCH_WEIGHT +
                skin_type_match_score * self.SKIN_TYPE_MATCH_WEIGHT
            )
            
            scored_products.append({
                'product_id': product_id,
                'score': total_score,
                'co_occurrence_score': co_occurrence_score,
                'undertone_match_score': undertone_match_score,
                'skin_type_match_score': skin_type_match_score
            })
        
        return scored_products
    
    def _calculate_co_occurrence_score(
        self,
        product_id: int,
        user_product_ids: List[int],
        similar_user_ids: List[int]
    ) -> float:
        """
        Считает co-occurrence score на основе частоты совместного использования.
        """
        if not similar_user_ids:
            return 0.0
        
        # Считаем сколько похожих пользователей используют этот продукт
        count = self.db.query(UserProduct).filter(
            UserProduct.product_id == product_id,
            UserProduct.user_id.in_(similar_user_ids)
        ).count()
        
        # Нормализуем по количеству похожих пользователей
        return count / len(similar_user_ids) if similar_user_ids else 0.0
    
    def _calculate_undertone_match_score(
        self,
        product: Product,
        user_undertone: str
    ) -> float:
        """
        Считает score на основе совпадения категории продукта с подтоном пользователя.
        """
        if not user_undertone or not product.category:
            return 0.0
        
        # Extract undertone from category (e.g., "light_warm" -> "warm")
        product_undertone = product.category.split('_')[-1] if '_' in product.category else None
        
        if product_undertone == user_undertone:
            return 1.0
        
        return 0.0
    
    def _calculate_skin_type_match_score(
        self,
        product: Product,
        user_skin_type: str
    ) -> float:
        """
        Считает score на основе типа кожи.
        
        В текущей версии это упрощенная логика.
        В будущем можно добавить маппинг продуктов к типам кожи.
        """
        if not user_skin_type:
            return 0.0
        
        # В будущем можно добавить логику на основе finish/coverage продукта
        # Сейчас возвращаем 0.5 как базовый score
        return 0.5
    
    def update_co_occurrence_matrix(self):
        """
        Обновляет матрицу co-occurrence на основе текущих данных.
        Должен вызываться периодически или после добавления новых пользователей.
        """
        # Получаем все пары продуктов, которые используются вместе
        query = """
            SELECT 
                up1.product_id as product_a_id,
                up2.product_id as product_b_id,
                COUNT(*) as co_occurrence_count
            FROM user_products up1
            JOIN user_products up2 ON up1.user_id = up2.user_id
            WHERE up1.product_id < up2.product_id
            GROUP BY up1.product_id, up2.product_id
        """
        
        results = self.db.execute(query).fetchall()
        
        # Обновляем или создаем записи в product_co_occurrences
        for row in results:
            product_a_id, product_b_id, count = row
            
            co_occurrence = self.db.query(ProductCoOccurrence).filter(
                ProductCoOccurrence.product_a_id == product_a_id,
                ProductCoOccurrence.product_b_id == product_b_id
            ).first()
            
            if co_occurrence:
                co_occurrence.co_occurrence_count = count
            else:
                co_occurrence = ProductCoOccurrence(
                    product_a_id=product_a_id,
                    product_b_id=product_b_id,
                    co_occurrence_count=count
                )
                self.db.add(co_occurrence)
        
        self.db.commit()
    
    def save_recommendations(
        self,
        user_id: int,
        recommendations: List[Dict]
    ) -> None:
        """
        Сохраняет рекомендации в базу данных.
        """
        # Удаляем старые рекомендации для этого пользователя
        self.db.query(Recommendation).filter(Recommendation.user_id == user_id).delete()
        
        # Сохраняем новые рекомендации
        for rank, rec in enumerate(recommendations, start=1):
            recommendation = Recommendation(
                user_id=user_id,
                product_id=rec['product_id'],
                score=rec['score'],
                rank=rank,
                co_occurrence_score=rec['co_occurrence_score'],
                undertone_match_score=rec['undertone_match_score'],
                skin_type_match_score=rec['skin_type_match_score']
            )
            self.db.add(recommendation)
        
        self.db.commit()
