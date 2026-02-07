#!/usr/bin/env python3
"""
检查公共库SKU状态的脚本
查看哪些SKU被标记为公共但状态不正确
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.infra.db import SessionLocal, SKU


def check_public_skus():
    """
    检查所有公共库SKU的状态
    """
    db = SessionLocal()
    try:
        print("="*80)
        print("检查公共库SKU状态")
        print("="*80)
        
        # 查找所有is_public=True的SKU
        public_skus = db.query(SKU).filter(SKU.is_public == True).all()
        
        print(f"\n找到 {len(public_skus)} 个标记为公共的SKU:\n")
        
        for sku in public_skus:
            print(f"ID: {sku.id}")
            print(f"  名称: {sku.sku_name}")
            print(f"  类型: {sku.sku_type}")
            print(f"  is_public: {sku.is_public}")
            print(f"  public_status: {sku.public_status}")
            print(f"  agency_id: {sku.agency_id}")
            
            if sku.public_status != "published":
                print(f"  ⚠️ 警告: public_status不是'published'，而是'{sku.public_status}'")
            print()
        
        # 查找public_status为published的SKU
        print("="*80)
        print("查询public_status='published'的SKU")
        print("="*80)
        
        published_skus = db.query(SKU).filter(
            SKU.is_public == True,
            SKU.public_status == "published"
        ).all()
        
        print(f"\n找到 {len(published_skus)} 个正确发布到公共库的SKU:\n")
        
        for sku in published_skus:
            print(f"- {sku.sku_name} (ID: {sku.id})")
        
        # 查找"阳关大道"
        print("\n" + "="*80)
        print("搜索'阳关大道'")
        print("="*80)
        
        yangguandadao = db.query(SKU).filter(
            SKU.sku_name.like('%阳关大道%')
        ).all()
        
        if yangguandadao:
            print(f"\n找到 {len(yangguandadao)} 个包含'阳关大道'的SKU:\n")
            for sku in yangguandadao:
                print(f"ID: {sku.id}")
                print(f"  名称: {sku.sku_name}")
                print(f"  类型: {sku.sku_type}")
                print(f"  is_public: {sku.is_public}")
                print(f"  public_status: {sku.public_status}")
                print(f"  owner_type: {sku.owner_type}")
                print()
        else:
            print("\n未找到包含'阳关大道'的SKU")
        
    finally:
        db.close()


def fix_public_sku_status(sku_name_pattern: str):
    """
    修复指定SKU的公共库状态
    """
    db = SessionLocal()
    try:
        skus = db.query(SKU).filter(
            SKU.sku_name.like(f'%{sku_name_pattern}%'),
            SKU.is_public == True
        ).all()
        
        if not skus:
            print(f"\n未找到匹配'{sku_name_pattern}'的公共SKU")
            return
        
        print(f"\n找到 {len(skus)} 个匹配的SKU，准备修复:")
        
        for sku in skus:
            print(f"\n修复SKU: {sku.sku_name} (ID: {sku.id})")
            print(f"  当前状态: is_public={sku.is_public}, public_status={sku.public_status}")
            
            if sku.public_status != "published":
                sku.public_status = "published"
                print(f"  ✓ 已设置 public_status='published'")
        
        db.commit()
        print("\n修复完成！")
        
    except Exception as e:
        db.rollback()
        print(f"\n错误: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    
    # 检查所有公共库SKU
    check_public_skus()
    
    # 如果提供了参数，修复指定SKU
    if len(sys.argv) > 1:
        sku_pattern = sys.argv[1]
        print(f"\n{'='*80}")
        print(f"修复包含'{sku_pattern}'的SKU")
        print("="*80)
        fix_public_sku_status(sku_pattern)
        
        # 再次检查
        print("\n" + "="*80)
        print("修复后再次检查")
        print("="*80)
        check_public_skus()
    else:
        print("\n提示: 运行 'py check_public_skus.py 阳关大道' 来修复指定SKU的状态")
