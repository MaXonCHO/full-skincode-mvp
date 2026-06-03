from sqlalchemy.orm import Session
from sqlalchemy import text, func, or_
from models import (
    User,
    Product,
    UserProduct,
    ProductCoOccurrence,
    BlockedCoOccurrence,
    Recommendation,
)
from typing import List, Dict, Optional, Any


class RecommendationEngine:
    """
    Recommendation engine для SkinCode.
    Collaborative filtering + co-occurrence + weighted scoring.
    """

    SESSION_SUPPORT_WEIGHT = 5.0
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
        session_matches = self._find_similar_sessions(product_ids, user_id)
        if not session_matches:
            session_matches = self._find_overlapping_sessions(
                product_ids,
                undertone,
                skin_type,
                user_id,
            )
        if not session_matches:
            return []

        # Кандидаты — только продукты из ТЕХ ЖЕ сессий, не входящие в ввод пользователя
        candidates = self._get_candidates_from_sessions(product_ids, session_matches)
        if not candidates:
            candidates = self._get_candidates_from_manual_links(product_ids)
        if not candidates:
            return []

        similar_user_ids = list({match["user_id"] for match in session_matches})

        scored_products = self._score_products(
            candidates,
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
    ) -> List[Dict[str, Any]]:
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

        matches: List[Dict[str, Any]] = []
        for uid, sid, cnt in rows:
            if cnt == required:
                matches.append({
                    "user_id": uid,
                    "session_id": sid,
                    "match_ratio": 1.0,
                    "overlap_count": cnt,
                    "match_type": "exact",
                })
        return matches

    def _find_overlapping_sessions(
        self,
        product_ids: List[int],
        undertone: Optional[str],
        skin_type: Optional[str],
        exclude_user_id: Optional[int] = None,
        min_overlap: int = 1,
    ) -> List[Dict[str, Any]]:
        """
        Если нет точного совпадения связки, ищем сессии с пересечением.
        Требуем совпадение по подтону/типу кожи (если заданы) и минимум min_overlap общих продуктов.
        """
        unique_ids = list({pid for pid in product_ids if pid})
        if not unique_ids:
            return []

        min_required_overlap = max(min_overlap, len(unique_ids) - 1 if len(unique_ids) > 1 else 1)

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
        rows = query.having(func.count(func.distinct(UserProduct.product_id)) >= min_required_overlap).all()

        matches: List[Dict[str, Any]] = []
        for uid, sid, overlap_count in rows:
            matches.append({
                "user_id": uid,
                "session_id": sid,
                "match_ratio": min(1.0, overlap_count / max(1, len(unique_ids))),
                "overlap_count": overlap_count,
                "match_type": "partial",
            })
        return matches

    def _get_candidates_from_sessions(
        self,
        user_product_ids: List[int],
        session_matches: List[Dict[str, Any]],
    ) -> Dict[int, Dict[str, Any]]:
        """
        Возвращает продукты из конкретных сессий, исключая уже введённые продукты.
        Продукты из других сессий этого же пользователя НЕ попадают.
        """
        if not session_matches:
            return {}

        result: Dict[int, Dict[str, Any]] = {}

        for match in session_matches:
            uid = match["user_id"]
            sid = match["session_id"]
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
                data = result.setdefault(pid, {
                    "support": 0,
                    "weighted_support": 0.0,
                    "max_ratio": 0.0,
                })
                data["support"] += 1
                data["weighted_support"] += match["match_ratio"]
                data["max_ratio"] = max(data["max_ratio"], match["match_ratio"])

        return result

    def _get_candidates_from_manual_links(
        self,
        user_product_ids: List[int],
    ) -> Dict[int, Dict[str, Any]]:
        """Fallback: используем вручную заведённые связи из product_co_occurrences."""
        if not user_product_ids:
            return {}

        blocked_pairs = {
            tuple(sorted([row.product_a_id, row.product_b_id]))
            for row in self.db.query(BlockedCoOccurrence).all()
        }

        unblocked_pairs = set()
        links = (
            self.db.query(ProductCoOccurrence)
            .filter(
                ProductCoOccurrence.co_occurrence_count > 0,
                or_(
                    ProductCoOccurrence.product_a_id.in_(user_product_ids),
                    ProductCoOccurrence.product_b_id.in_(user_product_ids),
                ),
            )
            .all()
        )

        candidates: Dict[int, Dict[str, Any]] = {}
        for link in links:
            if link.product_a_id in user_product_ids and link.product_b_id in user_product_ids:
                continue
            pair = tuple(sorted([link.product_a_id, link.product_b_id]))
            if pair in blocked_pairs:
                unblocked_pairs.add(pair)
            other_id = link.product_b_id if link.product_a_id in user_product_ids else link.product_a_id

            if other_id in user_product_ids:
                continue

            data = candidates.setdefault(
                other_id,
                {
                    "support": 0,
                    "weighted_support": 0.0,
                    "max_ratio": 0.0,
                },
            )
            weight = max(1.0, float(link.co_occurrence_count))
            data["support"] += 1
            data["weighted_support"] += weight
            data["max_ratio"] = max(data["max_ratio"], 1.0)

        if unblocked_pairs:
            conditions = [
                and_(
                    BlockedCoOccurrence.product_a_id == pair[0],
                    BlockedCoOccurrence.product_b_id == pair[1],
                )
                for pair in unblocked_pairs
            ]
            self.db.query(BlockedCoOccurrence).filter(or_(*conditions)).delete(synchronize_session=False)
            self.db.commit()

        return candidates

    def _score_products(
        self,
        candidates: Dict[int, Dict[str, Any]],
        user_product_ids: List[int],
        undertone: str,
        skin_type: str,
        similar_user_ids: List[int],
    ) -> List[Dict]:
        scored_products = []

        for product_id, stats in candidates.items():
            product = self.db.query(Product).filter(Product.id == product_id).first()
            if not product:
                continue

            co_count = stats["weighted_support"]
            undertone_match = self._match_flag_from_similar_users(
                product_id, similar_user_ids, "undertone", undertone
            )
            skin_match = self._match_flag_from_similar_users(
                product_id, similar_user_ids, "skin_type", skin_type
            )

            product_undertone_bonus = self._product_undertone_bonus(product, undertone)

            total_score = (
                co_count * self.SESSION_SUPPORT_WEIGHT
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
                    "support_count": stats["support"],
                    "match_ratio": stats["max_ratio"],
                    "confidence_label": self._confidence_label(stats["max_ratio"], stats["support"]),
                }
            )

        return scored_products

    @staticmethod
    def _confidence_label(match_ratio: float, support_count: int) -> str:
        if match_ratio >= 0.95 and support_count >= 2:
            return "Точное совпадение"
        if match_ratio >= 0.66 and support_count >= 2:
            return "Сильное совпадение"
        if match_ratio >= 0.33:
            return "Есть схожие связки"
        return "Редкое совпадение"

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
        blocked_pairs = {
            (row.product_a_id, row.product_b_id)
            for row in self.db.query(BlockedCoOccurrence).all()
        }
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
            pair = tuple(sorted([product_a_id, product_b_id]))
            if pair in blocked_pairs:
                continue
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
