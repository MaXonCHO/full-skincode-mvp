"""Backward-compatible CSV sync wrapper."""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from catalog_sync import sync_catalog_from_csv, sync_default_catalog


def load_csv_to_database(csv_file_path=None, csv_url=None):
    """Synchronizes CSV data into the product catalog without deleting existing data."""
    db = SessionLocal()
    try:
        if csv_file_path or csv_url:
            return sync_catalog_from_csv(db, csv_file_path=csv_file_path, csv_url=csv_url)
        return sync_default_catalog(db)
    finally:
        db.close()


if __name__ == "__main__":
    csv_path = os.path.join(os.path.dirname(__file__), "products.csv")
    load_csv_to_database(csv_path)
