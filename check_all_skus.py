import sys
sys.path.insert(0, '.')
from app.infra.db import SessionLocal, SKU

db = SessionLocal()

print("=== 所有SKU列表 ===\n")
skus = db.query(SKU).all()

for s in skus:
    print(f'名称: {s.sku_name}')
    print(f'ID: {s.id}')
    print(f'类别: {s.category}')
    print(f'SKU类型: {s.sku_type}')
    print(f'owner_type: {s.owner_type}')
    print(f'is_public: {s.is_public}')
    print(f'public_status: {s.public_status}')
    print(f'agency_id: {s.agency_id}')
    print(f'raw_extracted: {"有" if s.raw_extracted else "无"}')
    print('-' * 60)

print(f'\n总共: {len(skus)} 个SKU')
db.close()
