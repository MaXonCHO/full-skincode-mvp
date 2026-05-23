"""Общие утилиты для каталога продуктов."""

import re
from typing import Optional

DEFAULT_PRODUCT_IMAGE = "Скинкод%20фотки%20сайт/product-1.png"

BRAND_IMAGE_MAP = {
    "MAC": "Скинкод%20фотки%20сайт/product-1.png",
    "Estée Lauder": "Скинкод%20фотки%20сайт/product-2.png",
    "Dior": "Скинкод%20фотки%20сайт/product-3.png",
    "NARS": "Скинкод%20фотки%20сайт/product-4.png",
    "Fenty Beauty": "Скинкод%20фотки%20сайт/product-5.png",
    "Lancôme": "Скинкод%20фотки%20сайт/product-1.png",
    "YSL Beauty": "Скинкод%20фотки%20сайт/product-2.png",
    "Clinique": "Скинкод%20фотки%20сайт/product-3.png",
    "Clarins": "Скинкод%20фотки%20сайт/product-4.png",
    "Shiseido": "Скинкод%20фотки%20сайт/product-5.png",
    "Kevyn Aucoin": "Скинкод%20фотки%20сайт/product-1.png",
    "SCINIC": "Скинкод%20фотки%20сайт/product-2.png",
    "Cellcosmet & Cellmen": "Скинкод%20фотки%20сайт/product-3.png",
}


def product_image_url(brand: str) -> str:
    return BRAND_IMAGE_MAP.get(brand, DEFAULT_PRODUCT_IMAGE)


def infer_category(shade: str, shade_name: str = "") -> str:
    """Определяет category (depth_undertone) по названию оттенка."""
    text = f"{shade} {shade_name}".upper()
    depth = "medium"
    if re.search(r"\b(0[0-9]|10|11|12|FAIR|PORCELAIN|SIBERIA|IVOIRE|LIGHT|СВЕТЛ)\b", text):
        depth = "light"
    elif re.search(r"\b(DEEP|TAN|MOCHA|ESPRESSO|COCOA|540|550|560)\b", text):
        depth = "deep"
    elif re.search(r"\b(TAN|SAND|HONEY|AMBER|GOLDEN|430|440|450)\b", text):
        depth = "tan"

    undertone = "neutral"
    if re.search(r"(\bW\b|WARM|GOLD|YELLOW|PEACH|NC\d|GOLDEN|ЗОЛОТ)", text):
        undertone = "warm"
    elif re.search(r"(\bC\b|COOL|PINK|ROSE|NW\d|R\d{2}\b)", text):
        undertone = "cool"
    elif re.search(r"(\bN\b|NEUTRAL|NATURAL|BEIGE|IVORY|N\d)", text):
        undertone = "neutral"
    elif re.search(r"(OLIVE|OLIV)", text):
        undertone = "olive"

    return f"{depth}_{undertone}"
