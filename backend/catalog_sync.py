"""Helpers for syncing product catalog data from CSV sources."""

from __future__ import annotations

import csv
import io
import os
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import requests
from sqlalchemy.orm import Session

from models import Product
from product_utils import infer_category, product_image_url


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CSV_SOURCES = [
    ROOT_DIR / "tonal_products.csv",
    ROOT_DIR / "backend" / "products.csv",
]


def _normalize_row(row: Dict[str, str]) -> Dict[str, str]:
    normalized: Dict[str, str] = {}
    for key, value in row.items():
        clean_key = (key or "").replace("\ufeff", "").strip().lower()
        if not clean_key:
            continue
        normalized[clean_key] = (value or "").strip()
    return normalized


def _sniff_delimiter(sample: str) -> str:
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,")
        return dialect.delimiter
    except Exception:
        return ";" if sample.count(";") > sample.count(",") else ","


def _iter_csv_rows(csv_file_path: Optional[str] = None, csv_url: Optional[str] = None) -> Iterable[Dict[str, str]]:
    if csv_url:
        response = requests.get(csv_url, timeout=30)
        response.raise_for_status()
        content = response.text
    elif csv_file_path:
        with open(csv_file_path, "r", encoding="utf-8-sig") as file_obj:
            content = file_obj.read()
    else:
        raise ValueError("Either csv_file_path or csv_url must be provided")

    delimiter = _sniff_delimiter(content[:4096])
    reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)
    for row in reader:
        yield _normalize_row(row)


def _parse_price(row: Dict[str, str]) -> float:
    for key in ("price", "price_actual", "old_price", "price_regular"):
        raw = row.get(key)
        if raw:
            try:
                return float(str(raw).replace(",", "."))
            except ValueError:
                continue
    return 0.0


def build_product_payload(row: Dict[str, str], source_name: str = "") -> Optional[Dict[str, str]]:
    brand = row.get("brand", "").strip()
    line = row.get("name", "").strip() or row.get("product_type", "").strip()
    if not brand or not line:
        return None

    hex_value = row.get("hex", "").strip().upper() or None
    shade = (
        row.get("shade", "").strip()
        or row.get("shade_value", "").strip()
        or row.get("shade_name", "").strip()
    )

    if not shade:
        product_type = row.get("product_type", "").strip()
        if hex_value and product_type:
            shade = f"{product_type} {hex_value}"
        elif hex_value:
            shade = f"Оттенок {hex_value}"
        else:
            shade = product_type or "Оттенок"

    image_url = row.get("image_url", "").strip() or product_image_url(brand)
    product_url = row.get("url", "").strip() or row.get("product_url", "").strip()
    category_source = row.get("product_type", "").strip() or shade

    return {
        "brand": brand,
        "line": line,
        "shade": shade,
        "hex": hex_value,
        "image_url": image_url,
        "product_url": product_url,
        "price": _parse_price(row),
        "category": infer_category(shade, category_source),
    }


def upsert_product(db: Session, payload: Dict[str, str]) -> str:
    existing = db.query(Product).filter(
        Product.brand == payload["brand"],
        Product.line == payload["line"],
        Product.shade == payload["shade"],
    ).first()

    if existing:
        existing.hex = payload.get("hex") or existing.hex
        existing.image_url = payload.get("image_url") or existing.image_url
        existing.product_url = payload.get("product_url") or existing.product_url
        existing.price = payload.get("price") if payload.get("price") is not None else existing.price
        existing.category = payload.get("category") or existing.category
        return "updated"

    db.add(Product(**payload))
    return "created"


def sync_catalog_from_csv(db: Session, csv_file_path: Optional[str] = None, csv_url: Optional[str] = None) -> Dict[str, int]:
    created = 0
    updated = 0
    for row in _iter_csv_rows(csv_file_path=csv_file_path, csv_url=csv_url):
        payload = build_product_payload(row)
        if not payload:
            continue
        result = upsert_product(db, payload)
        if result == "created":
            created += 1
        else:
            updated += 1

    db.commit()
    return {"created": created, "updated": updated}


def sync_default_catalog(db: Session) -> Dict[str, int]:
    created = 0
    updated = 0
    for source in DEFAULT_CSV_SOURCES:
        if not source.exists():
            continue
        stats = sync_catalog_from_csv(db, csv_file_path=str(source))
        created += stats["created"]
        updated += stats["updated"]
    return {"created": created, "updated": updated}
