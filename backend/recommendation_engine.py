from sqlalchemy.orm import Session
from sqlalchemy import text, func
from models import User, Product, UserProduct, ProductCoOccurrence, Recommendation
from typing import List, Dict, Optional, Set


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

        similar_user_ids = self._find_similar_users(product_ids, user_id)
        candidate_product_ids = self._get_candidate_products(product_ids, similar_user_ids)

        if not candidate_product_ids:
            return self._cold_start_fallback(product_ids, undertone, skin_type, top_k)

        scored_products = self._score_products(
            candidate_product_ids,
            product_ids,
            undertone,
            skin_type,
            similar_user_ids,
        )

        ranked = sorted(scored_products, key=lambda x: x["score"], reverse=True)
        return ranked[:top_k]

    def _find_similar_users(
        self,
        product_ids: List[int],
        exclude_user_id: Optional[int] = None,
    ) -> List[int]:
        """Пользователи с хотя бы одним общим продуктом (без жёсткого фильтра по коже)."""
        query = self.db.query(UserProduct.user_id).filter(
            UserProduct.product_id.in_(product_ids)
        )
        if exclude_user_id is not None:
            query = query.filter(UserProduct.user_id != exclude_user_id)

        return list({row[0] for row in query.distinct().all()})

    def _get_candidate_products(
        self,
        user_product_ids: List[int],
        similar_user_ids: List[int],
    ) -> List[int]:
        if not similar_user_ids:
            return []

        rows = (
            self.db.query(UserProduct.product_id)
            .filter(
                UserProduct.user_id.in_(similar_user_ids),
                ~UserProduct.product_id.in_(user_product_ids),
            )
            .distinct()
            .all()
        )
        return [row[0] for row in rows]

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

    def _cold_start_fallback(
        self,
        user_product_ids: List[int],
        undertone: Optional[str],
        skin_type: Optional[str],
        top_k: int,
    ) -> List[Dict]:
        """Популярные продукты + совпадение category, когда мало пользовательских данных."""
        popular = (
            self.db.query(
                UserProduct.product_id,
                func.count(UserProduct.id).label("cnt"),
            )
            .filter(~UserProduct.product_id.in_(user_product_ids))
            .group_by(UserProduct.product_id)
            .order_by(func.count(UserProduct.id).desc())
            .limit(top_k * 3)
            .all()
        )

        candidates: List[int] = [row[0] for row in popular]

        if len(candidates) < top_k:
            query = self.db.query(Product.id).filter(~Product.id.in_(user_product_ids))
            if undertone:
                query = query.filter(Product.category.ilike(f"%_{undertone}"))
            extra = [row[0] for row in query.limit(top_k * 2).all()]
            seen: Set[int] = set(candidates)
            for pid in extra:
                if pid not in seen:
                    candidates.append(pid)
                    seen.add(pid)

        if not candidates:
            fallback = (
                self.db.query(Product.id)
                .filter(~Product.id.in_(user_product_ids))
                .limit(top_k)
                .all()
            )
            candidates = [row[0] for row in fallback]

        scored = []
        for rank, product_id in enumerate(candidates[: top_k * 2]):
            product = self.db.query(Product).filter(Product.id == product_id).first()
            if not product:
                continue
            undertone_bonus = self._product_undertone_bonus(product, undertone)
            score = 10.0 + undertone_bonus * 20.0 - rank * 0.1
            scored.append(
                {
                    "product_id": product_id,
                    "score": score,
                    "co_occurrence_score": 0.0,
                    "undertone_match_score": undertone_bonus,
                    "skin_type_match_score": 0.0,
                }
            )

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

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
