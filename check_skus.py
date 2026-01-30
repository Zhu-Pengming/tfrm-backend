from app.infra.db import SessionLocal, SKU

db = SessionLocal()
try:
    skus = db.query(SKU).all()
    print(f'Total SKUs in database: {len(skus)}')
    for sku in skus:
        print(f'  - ID: {sku.id}, Name: {sku.sku_name}, Agency: {sku.agency_id}')
finally:
    db.close()
