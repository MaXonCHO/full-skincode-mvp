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
                # Маппинг полей CSV на структуру базы данных
                product = Product(
                    brand=row.get('brand', ''),
                    line=row.get('product_type', ''),  # Используем product_type как линейку
                    shade=row.get('shade_name', ''),
                    hex=row.get('shade_value', '') or '#FFFFFF',  # Заглушка если нет hex
                    image_url='assets/example.png',  # Заглушка для изображений
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
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'results — копия 2.csv')
    load_csv_to_database(csv_path)
