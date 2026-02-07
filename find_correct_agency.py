import sys
sys.path.insert(0, '.')
from app.infra.db import SessionLocal, SKU

db = SessionLocal()

# 查找所有 PRIVATE 的 ACTIVITY SKU
activity_skus = db.query(SKU).filter(
    SKU.owner_type == 'private',
    SKU.sku_type == 'activity'
).all()

print(f'找到 {len(activity_skus)} 个私有的 Activity SKU:\n')
for sku in activity_skus:
    print(f'名称: {sku.sku_name}')
    print(f'agency_id: {sku.agency_id}')
    print('-' * 40)

# 根据图片，阳朔大榕古道漂流显示在私有库中
# 查找这个SKU
yangshuo = db.query(SKU).filter(SKU.sku_name.like('%阳朔%')).first()
if not yangshuo:
    yangshuo = db.query(SKU).filter(SKU.sku_name.like('%大榕%')).first()
if not yangshuo:
    yangshuo = db.query(SKU).filter(SKU.sku_name.like('%漂流%')).first()

if yangshuo:
    print(f'\n✅ 找到阳朔相关SKU:')
    print(f'名称: {yangshuo.sku_name}')
    print(f'正确的 agency_id: {yangshuo.agency_id}')
    
    # 更新敦煌宾馆
    dunhuang = db.query(SKU).filter(SKU.id == 'TFRM-ACTIVITY-75A8253E').first()
    if dunhuang:
        dunhuang.agency_id = yangshuo.agency_id
        db.commit()
        print(f'\n✅ 已将敦煌宾馆的 agency_id 更新为: {yangshuo.agency_id}')
else:
    print('\n未找到阳朔SKU')

db.close()
