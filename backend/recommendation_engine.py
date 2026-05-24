from sqlalchemy.orm import Session
from sqlalchemy import text, func
from models import User, Product, UserProduct, ProductCoOccurrence, Recommendation
from typing import List, Dict, Optional


class RecommendationEngine:
    """
    Recommendation engine для SkinCode.
    Collaborative filtering + co-occurrence + weighted scoring.
    """

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
        top_k: int = 5,
    ) -> List[Dict]:
        if not product_ids:
            return []

        # Находим сессии (user_id, session_id), которые содержат ВСЕ введённые продукты
        session_pairs = self._find_similar_sessions(product_ids, user_id)
        if not session_pairs:
            session_pairs = self._find_overlapping_sessions(
                product_ids,
                undertone,
                skin_type,
                user_id,
            )
        if not session_pairs:
            return []

        # Кандидаты — только продукты из ТЕХ ЖЕ сессий, не входящие в ввод пользователя
        candidate_product_ids = self._get_candidates_from_sessions(product_ids, session_pairs)
        if not candidate_product_ids:
            return []

        similar_user_ids = list({uid for uid, _ in session_pairs})

        scored_products = self._score_products(
            candidate_product_ids,
            product_ids,
            undertone,
            skin_type,
            similar_user_ids,
        )

        ranked = sorted(scored_products, key=lambda x: x["score"], reverse=True)
        return ranked[:top_k]

    def _find_similar_sessions(
        self,
        product_ids: List[int],
        exclude_user_id: Optional[int] = None,
    ) -> List[tuple]:
        """
        Возвращает список (user_id, session_id), где сессия содержит ровно все product_ids.
        Только сессии с session_id != NULL (связки, отправленные через /recommendations/).
        """
        unique_ids = list({pid for pid in product_ids if pid})
        if not unique_ids:
            return []
        required = len(unique_ids)

        query = (
            self.db.query(
                UserProduct.user_id,
                UserProduct.session_id,
                func.count(func.distinct(UserProduct.product_id)).label("match_count"),
            )
            .filter(
                UserProduct.product_id.in_(unique_ids),
                UserProduct.session_id.isnot(None),
            )
        )
        if exclude_user_id is not None:
            query = query.filter(UserProduct.user_id != exclude_user_id)

        rows = query.group_by(UserProduct.user_id, UserProduct.session_id).all()

        return [
            (uid, sid)
            for uid, sid, cnt in rows
            if cnt == required
        ]

    def _find_overlapping_sessions(
        self,
        product_ids: List[int],
        undertone: Optional[str],
        skin_type: Optional[str],
        exclude_user_id: Optional[int] = None,
        min_overlap: int = 1,
    ) -> List[tuple]:
        """
        Если нет точного совпадения связки, ищем сессии с пересечением.
        Требуем совпадение по подтону/типу кожи (если заданы) и минимум min_overlap общих продуктов.
        """
        unique_ids = list({pid for pid in product_ids if pid})
        if not unique_ids:
            return []

        query = (
            self.db.query(
                UserProduct.user_id,
                UserProduct.session_id,
                func.count(func.distinct(UserProduct.product_id)).label("overlap_count"),
            )
            .join(User, User.id == UserProduct.user_id)
            .filter(
                UserProduct.product_id.in_(unique_ids),
                UserProduct.session_id.isnot(None),
            )
        )

        if exclude_user_id is not None:
            query = query.filter(UserProduct.user_id != exclude_user_id)
        if undertone:
            query = query.filter(User.undertone == undertone)
        if skin_type:
            query = query.filter(User.skin_type == skin_type)

        query = query.group_by(UserProduct.user_id, UserProduct.session_id)
        rows = query.having(func.count(func.distinct(UserProduct.product_id)) >= min_overlap).all()

        return [(uid, sid) for uid, sid, _ in rows]

    def _get_candidates_from_sessions(
        self,
        user_product_ids: List[int],
        session_pairs: List[tuple],
    ) -> List[int]:
        """
        Возвращает продукты из конкретных сессий, исключая уже введённые продукты.
        Продукты из других сессий этого же пользователя НЕ попадают.
        """
        if not session_pairs:
            return []

        seen: set = set()
        result: List[int] = []

        for uid, sid in session_pairs:
            rows = (
                self.db.query(UserProduct.product_id)
                .filter(
                    UserProduct.user_id == uid,
                    UserProduct.session_id == sid,
                    ~UserProduct.product_id.in_(user_product_ids),
                )
                .distinct()
                .all()
            )
            for (pid,) in rows:
                if pid not in seen:
                    seen.add(pid)
                    result.append(pid)

        return result

    def _score_products(
        self,
        candidate_product_ids: List[int],
        user_product_ids: List[int],
        undertone: str,
        skin_type: str,
        similar_user_ids: List[int],
    ) -> List[Dict]:
        scored_products = []

        for product_id in candidate_product_ids:
            product = self.db.query(Product).filter(Product.id == product_id).first()
            if not product:
                continue

            co_count = self._co_occurrence_count(product_id, similar_user_ids)
            undertone_match = self._match_flag_from_similar_users(
                product_id, similar_user_ids, "undertone", undertone
            )
            skin_match = self._match_flag_from_similar_users(
                product_id, similar_user_ids, "skin_type", skin_type
            )

            product_undertone_bonus = self._product_undertone_bonus(product, undertone)

            total_score = (
                co_count * self.CO_OCCURRENCE_WEIGHT
                + undertone_match * self.UNDERTONE_MATCH_WEIGHT
                + skin_match * self.SKIN_TYPE_MATCH_WEIGHT
                + product_undertone_bonus * self.UNDERTONE_MATCH_WEIGHT * 0.25
            )

            scored_products.append(
                {
                    "product_id": product_id,
                    "score": total_score,
                    "co_occurrence_score": float(co_count),
                    "undertone_match_score": float(undertone_match + product_undertone_bonus * 0.25),
                    "skin_type_match_score": float(skin_match),
                }
            )

        return scored_products

    def _co_occurrence_count(self, product_id: int, similar_user_ids: List[int]) -> int:
        if not similar_user_ids:
            return 0
        return (
            self.db.query(UserProduct)
            .filter(
                UserProduct.product_id == product_id,
                UserProduct.user_id.in_(similar_user_ids),
            )
            .count()
        )

    def _match_flag_from_similar_users(
        self,
        product_id: int,
        similar_user_ids: List[int],
        field: str,
        target_value: Optional[str],
    ) -> float:
        """1.0 если среди похожих пользователей с этим продуктом есть совпадение по полю."""
        if not target_value or not similar_user_ids:
            return 0.0

        user_ids_with_product = [
            row[0]
            for row in self.db.query(UserProduct.user_id)
            .filter(
                UserProduct.product_id == product_id,
                UserProduct.user_id.in_(similar_user_ids),
            )
            .all()
        ]
        if not user_ids_with_product:
            return 0.0

        users = (
            self.db.query(User)
            .filter(User.id.in_(user_ids_with_product))
            .all()
        )

        for user in users:
            value = getattr(user, field, None)
            if value and value == target_value:
                return 1.0
        return 0.0

    def _product_undertone_bonus(self, product: Product, user_undertone: Optional[str]) -> float:
        if not user_undertone or not product.category:
            return 0.0
        parts = product.category.split("_")
        product_undertone = parts[-1] if parts else None
        return 1.0 if product_undertone == user_undertone else 0.0

    def update_co_occurrence_matrix(self) -> None:
        results = self.db.execute(
            text(
                """
                SELECT
                    up1.product_id AS product_a_id,
                    up2.product_id AS product_b_id,
                    COUNT(*) AS co_occurrence_count
                FROM user_products up1
                JOIN user_products up2 ON up1.user_id = up2.user_id
                WHERE up1.product_id < up2.product_id
                GROUP BY up1.product_id, up2.product_id
                """
            )
        ).fetchall()

        for row in results:
            product_a_id, product_b_id, count = row
            co_occurrence = (
                self.db.query(ProductCoOccurrence)
                .filter(
                    ProductCoOccurrence.product_a_id == product_a_id,
                    ProductCoOccurrence.product_b_id == product_b_id,
                )
                .first()
            )
            if co_occurrence:
                co_occurrence.co_occurrence_count = count
            else:
                self.db.add(
                    ProductCoOccurrence(
                        product_a_id=product_a_id,
                        product_b_id=product_b_id,
                        co_occurrence_count=count,
                    )
                )

        self.db.commit()

    def save_recommendations(self, user_id: int, recommendations: List[Dict]) -> None:
        self.db.query(Recommendation).filter(Recommendation.user_id == user_id).delete()

        for rank, rec in enumerate(recommendations, start=1):
            self.db.add(
                Recommendation(
                    user_id=user_id,
                    product_id=rec["product_id"],
                    score=rec["score"],
                    rank=rank,
                    co_occurrence_score=rec["co_occurrence_score"],
                    undertone_match_score=rec["undertone_match_score"],
                    skin_type_match_score=rec["skin_type_match_score"],
                )
            )

        self.db.commit()
