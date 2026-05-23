"""Database initialization and catalog synchronization."""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, Base, SessionLocal
from catalog_sync import sync_default_catalog


def init_database():
    """Creates tables and syncs the catalog from CSV sources without deleting user data."""
    print("Создание таблиц...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Синхронизация каталога из CSV...")
        stats = sync_default_catalog(db)
        print(f"Каталог синхронизирован: добавлено {stats['created']}, обновлено {stats['updated']}.")
    except Exception as e:
        print(f"Ошибка при инициализации базы: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
