"""
Скрипт для загрузки данных из CSV файла в базу данных.
"""
import sys
import os
import csv
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, Base, SessionLocal
from models import Product
from sqlalchemy.orm import Session


def load_csv_to_database(csv_file_path):
    """Загружает данные из CSV файла в базу данных."""
    db = SessionLocal()
    try:
        # Очищаем существующие продукты
        db.query(Product).delete()
        db.commit()

        # Читаем CSV файл
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)

            products_count = 0
            for row in reader:
                brand = row.get('brand', '')
                line = row.get('name', '')
                shade = row.get('shade_value', '')

                # Генерируем URL изображения на основе бренда
                # Используем product-1.png, product-2.png и т.д. для разных брендов
                image_mapping = {
                    'MAC': 'assets/product-1.png',
                    'Estée Lauder': 'assets/product-2.png',
                    'Dior': 'assets/product-3.png',
                    'NARS': 'assets/product-4.png',
                    'Fenty Beauty': 'assets/product-5.png',
                    'Lancôme': 'assets/product-1.png',
                    'YSL Beauty': 'assets/product-2.png',
                    'Clinique': 'assets/product-3.png',
                    'Clarins': 'assets/product-4.png',
                    'Shiseido': 'assets/product-5.png',
                    'Kevyn Aucoin': 'assets/product-1.png',
                    'SCINIC': 'assets/product-2.png',
                    'Cellcosmet & Cellmen': 'assets/product-3.png'
                }

                image_url = image_mapping.get(brand, 'assets/example.png')

                # Маппинг полей CSV на структуру базы данных
                product = Product(
                    brand=brand,
                    line=line,  # Используем name как линейку
                    shade=shade,  # Используем shade_value как оттенок
                    hex=shade or '#FFFFFF',  # Используем shade_value как hex
                    image_url=image_url,
                    product_url=row.get('product_url', ''),
                    price=float(row.get('price_actual', 0)) if row.get('price_actual') else 0,
                    category='neutral'  # Заглушка для категории
                )

                db.add(product)
                products_count += 1

            db.commit()
            print(f"Загружено {products_count} продуктов из CSV файла.")

    except Exception as e:
        print(f"Ошибка при загрузке данных из CSV: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    csv_path = os.path.join(os.path.dirname(__file__), 'products.csv')
    load_csv_to_database(csv_path)
