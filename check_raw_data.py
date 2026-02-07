import sys
import json
sys.path.insert(0, '.')
from app.infra.db import SessionLocal, SKU

db = SessionLocal()

sku = db.query(SKU).filter(SKU.id == 'TFRM-ACTIVITY-75A8253E').first()

if sku:
    print(f'SKU: {sku.sku_name}')
    print(f'类别: {sku.category}')
    print(f'位置: {sku.destination_city}, {sku.destination_country}')
    print(f'\nraw_extracted 内容:')
    if sku.raw_extracted:
        print(json.dumps(sku.raw_extracted, indent=2, ensure_ascii=False))
    else:
        print('无 raw_extracted 数据')
else:
    print('未找到SKU')

db.close()
