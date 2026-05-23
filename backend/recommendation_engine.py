from typing import Dict, List, Optional, Sequence

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from models import Product, ProductCoOccurrence, Recommendation, UserProduct


class RecommendationEngine:
    """
    Recommendation engine for SkinCode.
    Collaborative filtering and co-occurrence only.
    """

    CO_OCCURRENCE_WEIGHT = 1.0
    UNDERTONE_MATCH_WEIGHT = 40.0
    SKIN_TYPE_MATCH_WEIGHT = 30.0

    def __init__(self, db: Session):
        self.db = db

    def generate_recommendations(
        self,
        user_id: int,
        undertone: Optional[str],
        skin_type: Optional[str],
        product_ids: List[int],
        top_k: int = 5,
    ) -> List[Dict]:
        selected_product_ids = list(dict.fromkeys(product_ids))
        if not selected_product_ids:
            return []

        similar_users = self._find_similar_users(selected_product_ids, exclude_user_id=user_id)
        candidate_product_ids = self._get_candidate_products(
            selected_product_ids,
            similar_users,
        )

        if not candidate_product_ids:
            return []

        scored_products = self._score_products(
            candidate_product_ids,
            selected_product_ids,
            similar_users,
        )

        ranked = sorted(scored_products, key=lambda x: x["score"], reverse=True)
        return ranked[:top_k]

    def _find_similar_users(
        self,
        product_ids: List[int],
        exclude_user_id: Optional[int] = None,
    ) -> List[Dict]:
        """
        Возвращает похожих пользователей только по overlap выбранных продуктов.
        """
        base_query = (
            self.db.query(
                UserProduct.user_id,
                func.count(func.distinct(UserProduct.product_id)).label("shared_count"),
            )
            .filter(UserProduct.product_id.in_(product_ids))
            .group_by(UserProduct.user_id)
        )
        if exclude_user_id is not None:
            base_query = base_query.filter(UserProduct.user_id != exclude_user_id)

        rows = base_query.all()
        if not rows:
            return []

        user_product_counts = {
            row[0]: row[1]
            for row in self.db.query(
                UserProduct.user_id,
                func.count(UserProduct.id).label("total_count"),
            )
            .filter(UserProduct.user_id.in_(user_ids))
            .group_by(UserProduct.user_id)
            .all()
        }

        similar_users: List[Dict] = []

        for user_id_value, shared_count in rows:
            other_count = max(user_product_counts.get(user_id_value, 0), 1)
            similarity_score = (shared_count / max(len(set(product_ids)), 1)) * 100.0
            similarity_score += (shared_count / other_count) * 25.0

            if similarity_score <= 0:
                continue

            similar_users.append(
                {
                    "user_id": user_id_value,
                    "shared_count": int(shared_count),
                    "similarity_score": similarity_score,
                }
            )

        similar_users.sort(key=lambda item: item["similarity_score"], reverse=True)
        return similar_users

    def _get_candidate_products(
        self,
        user_product_ids: List[int],
        similar_users: List[Dict],
    ) -> List[int]:
        candidates = set()

        similar_user_ids = [user["user_id"] for user in similar_users]
        if similar_user_ids:
            rows = (
                self.db.query(UserProduct.product_id)
                .filter(
                    UserProduct.user_id.in_(similar_user_ids),
                    ~UserProduct.product_id.in_(user_product_ids),
                )
                .distinct()
                .all()
            )
            candidates.update(row[0] for row in rows)

        # Подстраховка: если похожих пользователей мало, используем матрицу co-occurrence
        for product_id in user_product_ids:
            rows = (
                self.db.query(
                    ProductCoOccurrence.product_a_id,
                    ProductCoOccurrence.product_b_id,
                )
                .filter(
                    (ProductCoOccurrence.product_a_id == product_id)
                    | (ProductCoOccurrence.product_b_id == product_id)
                )
                .all()
            )
            for product_a_id, product_b_id in rows:
                candidate_id = product_b_id if product_a_id == product_id else product_a_id
                if candidate_id not in user_product_ids:
                    candidates.add(candidate_id)

        return list(candidates)

    def _score_products(
        self,
        candidate_product_ids: List[int],
        user_product_ids: List[int],
        similar_users: List[Dict],
    ) -> List[Dict]:
        scored_products = []
        similar_user_ids = [user["user_id"] for user in similar_users]

        for product_id in candidate_product_ids:
            product = self.db.query(Product).filter(Product.id == product_id).first()
            if not product:
                continue

            co_count = self._co_occurrence_score(product_id, user_product_ids)
            similarity_bonus = self._candidate_support_bonus(product_id, similar_user_ids)
            total_score = co_count * self.CO_OCCURRENCE_WEIGHT + similarity_bonus

            scored_products.append(
                {
                    "product_id": product_id,
                    "score": total_score,
                    "co_occurrence_score": float(co_count),
                    "undertone_match_score": 0.0,
                    "skin_type_match_score": 0.0,
                }
            )

        return scored_products

    def _co_occurrence_score(self, product_id: int, selected_product_ids: Sequence[int]) -> float:
        if not selected_product_ids:
            return 0.0

        score = 0.0
        for selected_product_id in selected_product_ids:
            if selected_product_id == product_id:
                continue
            pair_count = self._get_pair_co_occurrence_count(product_id, selected_product_id)
            if pair_count:
                score += float(pair_count)

        # Если матрица пустая, fallback на live overlap по пользователям.
        if score == 0.0:
            for selected_product_id in selected_product_ids:
                shared_count = (
                    self.db.query(UserProduct.user_id)
                    .filter(
                        UserProduct.product_id.in_([product_id, selected_product_id]),
                    )
                    .group_by(UserProduct.user_id)
                    .having(func.count(UserProduct.product_id) == 2)
                    .count()
                )
                score += float(shared_count)

        return score

    def _get_pair_co_occurrence_count(self, product_a_id: int, product_b_id: int) -> int:
        left_id, right_id = sorted((product_a_id, product_b_id))
        record = (
            self.db.query(ProductCoOccurrence)
            .filter(
                ProductCoOccurrence.product_a_id == left_id,
                ProductCoOccurrence.product_b_id == right_id,
            )
            .first()
        )
        return record.co_occurrence_count if record else 0

    def _candidate_support_bonus(self, product_id: int, similar_user_ids: List[int]) -> float:
        if not similar_user_ids:
            return 0.0

        support_count = (
            self.db.query(UserProduct.user_id)
            .filter(
                UserProduct.product_id == product_id,
                UserProduct.user_id.in_(similar_user_ids),
            )
            .group_by(UserProduct.user_id)
            .count()
        )
        return float(support_count)

    def update_co_occurrence_matrix(self) -> None:
        self.db.query(ProductCoOccurrence).delete()
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
