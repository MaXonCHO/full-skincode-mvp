"""
Скрипт для инициализации базы данных и загрузки начальных данных.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, Base, SessionLocal
from models import Product
from sqlalchemy.orm import Session


# Начальные данные из data.js
INITIAL_PRODUCTS = [
    # MAC
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NC15", "hex": "#F5E6D3", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "light_warm"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NC20", "hex": "#F0D5B8", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "light_warm"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NC25", "hex": "#EDD0AA", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "light_warm"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NC30", "hex": "#E8C9A0", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "medium_warm"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NC35", "hex": "#E5C296", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "medium_warm"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NC40", "hex": "#E0B88D", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "tan_warm"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NC42", "hex": "#D9B085", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "tan_warm"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NC45", "hex": "#D4A87C", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "deep_warm"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NC50", "hex": "#C99A70", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "deep_warm"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NW10", "hex": "#F0DDD1", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "light_cool"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NW13", "hex": "#EDD5C5", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "light_cool"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NW15", "hex": "#E8CDB8", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "light_cool"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NW20", "hex": "#E3C4AA", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "medium_cool"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NW25", "hex": "#DDBA9E", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "medium_cool"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NW30", "hex": "#D8B192", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "tan_cool"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NW35", "hex": "#D4A88A", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "tan_cool"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NW40", "hex": "#CD9E80", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "deep_cool"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NW43", "hex": "#C79678", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "deep_cool"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NW45", "hex": "#C18E70", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "deep_cool"},
    {"brand": "MAC", "line": "Studio Fix Fluid SPF 15", "shade": "NW50", "hex": "#B88365", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 2890, "category": "deep_cool"},
    
    # Estée Lauder
    {"brand": "Estée Lauder", "line": "Double Wear", "shade": "1N0 Porcelain", "hex": "#F2E0D5", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3690, "category": "light_neutral"},
    {"brand": "Estée Lauder", "line": "Double Wear", "shade": "2N1 Desert Beige", "hex": "#DEC0AA", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3690, "category": "medium_neutral"},
    {"brand": "Estée Lauder", "line": "Double Wear", "shade": "3N1 Medium Beige", "hex": "#D0B09A", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3690, "category": "medium_neutral"},
    {"brand": "Estée Lauder", "line": "Double Wear", "shade": "4N1 Shell Beige", "hex": "#CAB898", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3690, "category": "tan_neutral"},
    {"brand": "Estée Lauder", "line": "Double Wear", "shade": "5N1 Deep Tan", "hex": "#B09072", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3690, "category": "deep_neutral"},
    
    # Dior
    {"brand": "Dior", "line": "Forever Skin Glow", "shade": "0N Neutral", "hex": "#F2DDD0", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4290, "category": "light_neutral"},
    {"brand": "Dior", "line": "Forever Skin Glow", "shade": "1N Neutral", "hex": "#E8D0C0", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4290, "category": "light_neutral"},
    {"brand": "Dior", "line": "Forever Skin Glow", "shade": "2N Neutral", "hex": "#DEC5B0", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4290, "category": "medium_neutral"},
    {"brand": "Dior", "line": "Forever Skin Glow", "shade": "3N Neutral", "hex": "#D4B8A0", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4290, "category": "medium_neutral"},
    
    # NARS
    {"brand": "NARS", "line": "Light Reflecting", "shade": "Siberia", "hex": "#F5EBE0", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4490, "category": "light_neutral"},
    {"brand": "NARS", "line": "Light Reflecting", "shade": "Deauville", "hex": "#EBDDD0", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4490, "category": "light_neutral"},
    {"brand": "NARS", "line": "Light Reflecting", "shade": "Fiji", "hex": "#E6D7C8", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4490, "category": "medium_neutral"},
    {"brand": "NARS", "line": "Light Reflecting", "shade": "Punjab", "hex": "#E1D1C0", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4490, "category": "medium_neutral"},
    
    # Fenty Beauty
    {"brand": "Fenty Beauty", "line": "Pro Filt'r Soft Matte", "shade": "100", "hex": "#FAF0E6", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3290, "category": "light_neutral"},
    {"brand": "Fenty Beauty", "line": "Pro Filt'r Soft Matte", "shade": "120", "hex": "#F0E6DB", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3290, "category": "light_neutral"},
    {"brand": "Fenty Beauty", "line": "Pro Filt'r Soft Matte", "shade": "140", "hex": "#E6DCD1", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3290, "category": "light_neutral"},
    {"brand": "Fenty Beauty", "line": "Pro Filt'r Soft Matte", "shade": "160", "hex": "#DCD2C7", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3290, "category": "medium_neutral"},
    {"brand": "Fenty Beauty", "line": "Pro Filt'r Soft Matte", "shade": "180", "hex": "#D2C8BD", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3290, "category": "medium_neutral"},
    
    # Lancôme
    {"brand": "Lancôme", "line": "Teint Idole Ultra Wear", "shade": "090 Ivoire N", "hex": "#F5E8DD", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3890, "category": "light_neutral"},
    {"brand": "Lancôme", "line": "Teint Idole Ultra Wear", "shade": "110 C", "hex": "#EBDDD0", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3890, "category": "light_neutral"},
    {"brand": "Lancôme", "line": "Teint Idole Ultra Wear", "shade": "130 W", "hex": "#D7C5B0", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3890, "category": "medium_neutral"},
    {"brand": "Lancôme", "line": "Teint Idole Ultra Wear", "shade": "145 W", "hex": "#C8B398", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3890, "category": "tan_neutral"},
    {"brand": "Lancôme", "line": "Teint Idole Ultra Wear", "shade": "170 C", "hex": "#AF9570", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 3890, "category": "deep_neutral"},
    
    # YSL Beauty
    {"brand": "YSL Beauty", "line": "All Hours", "shade": "B5 Porcelain", "hex": "#F5E6D3", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4590, "category": "light_warm"},
    {"brand": "YSL Beauty", "line": "All Hours", "shade": "B20 Ivory", "hex": "#E8D0C0", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4590, "category": "light_neutral"},
    {"brand": "YSL Beauty", "line": "All Hours", "shade": "B30 Almond", "hex": "#DEC0AA", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4590, "category": "medium_warm"},
    {"brand": "YSL Beauty", "line": "All Hours", "shade": "B40 Sand", "hex": "#D4B096", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4590, "category": "tan_warm"},
    {"brand": "YSL Beauty", "line": "All Hours", "shade": "B50 Honey", "hex": "#CAA082", "image_url": "Скинкод%20фотки%20сайт/example.png", "product_url": "https://goldapple.ru/", "price": 4590, "category": "deep_warm"},
]


def init_database():
    """Создает таблицы и загружает начальные данные."""
    print("Создание таблиц...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Проверяем, есть ли уже продукты
        existing_products = db.query(Product).count()
        if existing_products > 0:
            print(f"База данных уже содержит {existing_products} продуктов. Пропуск загрузки.")
            return
        
        print("Загрузка начальных данных...")
        for product_data in INITIAL_PRODUCTS:
            product = Product(**product_data)
            db.add(product)
        
        db.commit()
        print(f"Загружено {len(INITIAL_PRODUCTS)} продуктов.")
        
    except Exception as e:
        print(f"Ошибка при загрузке данных: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
