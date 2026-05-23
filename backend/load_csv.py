"""
Скрипт для загрузки данных из CSV файла в базу данных.
"""
import sys
import os
import csv
import requests
import io

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Product
from product_utils import product_image_url, infer_category, DEFAULT_PRODUCT_IMAGE


def load_csv_to_database(csv_file_path=None, csv_url=None):
    """Загружает данные из CSV файла или URL в базу данных."""
    db = SessionLocal()
    try:
        db.query(Product).delete()
        db.commit()

        if csv_url:
            response = requests.get(csv_url)
            response.raise_for_status()
            csv_file = io.StringIO(response.text)
            close_after = False
        elif csv_file_path:
            csv_file = open(csv_file_path, "r", encoding="utf-8")
            close_after = True
        else:
            raise ValueError("Either csv_file_path or csv_url must be provided")

        reader = csv.DictReader(csv_file)
        products_count = 0

        for row in reader:
            brand = (row.get("brand") or "").strip()
            line = (row.get("name") or "").strip()
            shade = (row.get("shade_value") or row.get("shade_name") or "").strip()
            shade_name = (row.get("shade_name") or "").strip()

            if not brand or not line:
                continue
            if not shade and not shade_name:
                continue

            display_shade = shade or shade_name
            category = infer_category(display_shade, shade_name)

            product = Product(
                brand=brand,
                line=line,
                shade=display_shade,
                hex="#E8D5C4",
                image_url=product_image_url(brand),
                product_url=row.get("product_url", ""),
                price=float(row.get("price_actual") or 0) if row.get("price_actual") else 0,
                category=category,
            )
            db.add(product)
            products_count += 1

        db.commit()
        print(f"Загружено {products_count} продуктов из CSV файла.")

        if close_after:
            csv_file.close()

    except Exception as e:
        print(f"Ошибка при загрузке данных из CSV: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    csv_path = os.path.join(os.path.dirname(__file__), "products.csv")
    load_csv_to_database(csv_path)
