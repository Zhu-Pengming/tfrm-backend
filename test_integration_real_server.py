#!/usr/bin/env python
"""
TFRM 集成测试 - 真实服务器 + 真实LLM

使用方式:
1. 先启动服务器:
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

2. 再运行此脚本:
   python test_integration_real_server.py

此脚本会:
- 通过HTTP请求调用真实的API接口
- 使用真实的LLM进行AI解析
- 模拟完整的业务流程
"""

import requests
import time
import json
from typing import Dict, Optional


class TFRMIntegrationTest:
    """TFRM集成测试类"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.token = None
        self.agency_id = None
        self.user_id = None
        
    def _request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """发送HTTP请求"""
        url = f"{self.base_url}{endpoint}"
        headers = kwargs.pop('headers', {})
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        response = requests.request(method, url, headers=headers, **kwargs)
        return response
    
    def check_server(self) -> bool:
        """检查服务器是否运行"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def register_and_login(self, username: str, password: str, agency_name: str) -> bool:
        """注册并登录"""
        print(f"\n[认证] 注册用户: {username}")
        
        # 注册
        response = self._request(
            'POST',
            '/auth/register',
            params={'agency_name': agency_name},
            json={
                'username': username,
                'password': password,
                'email': f'{username}@test.com',
                'full_name': username
            }
        )
        
        if response.status_code != 200:
            print(f"  ⚠ 用户可能已存在，尝试直接登录...")
        else:
            print(f"  ✓ 用户注册成功")
        
        # 登录
        response = self._request(
            'POST',
            '/auth/login',
            json={
                'username': username,
                'password': password
            }
        )
        
        if response.status_code != 200:
            print(f"  ✗ 登录失败: {response.text}")
            return False
        
        data = response.json()
        self.token = data['access_token']
        print(f"  ✓ 登录成功，获取token")
        
        # 获取用户信息
        response = self._request('GET', '/auth/me')
        if response.status_code == 200:
            user_data = response.json()
            self.agency_id = user_data['agency_id']
            self.user_id = user_data['id']
            print(f"  ✓ 用户信息: agency_id={self.agency_id}")
        
        return True
    
    def create_import_task(self, input_text: str) -> Optional[Dict]:
        """创建导入任务"""
        print(f"\n[步骤1] 碎片输入 - 创建导入任务")
        
        response = self._request(
            'POST',
            '/imports',
            json={
                'input_text': input_text,
                'input_files': []
            }
        )
        
        if response.status_code != 200:
            print(f"  ✗ 创建失败: {response.text}")
            return None
        
        task = response.json()
        print(f"  ✓ 导入任务已创建")
        print(f"    Task ID: {task['id']}")
        print(f"    状态: {task['status']}")
        
        return task
    
    def wait_for_parsing(self, task_id: str, max_wait: int = 60) -> Optional[Dict]:
        """等待AI解析完成"""
        print(f"\n[步骤2] AI解析成草稿 - 等待真实LLM解析...")
        print(f"  ⏳ 最多等待 {max_wait} 秒...")
        
        waited = 0
        while waited < max_wait:
            response = self._request('GET', f'/imports/{task_id}')
            
            if response.status_code != 200:
                print(f"  ✗ 获取任务失败: {response.text}")
                return None
            
            task = response.json()
            status = task['status']
            
            if status == 'parsed':
                print(f"  ✓ AI解析完成 (耗时: {waited}秒)")
                
                extracted = task.get('extracted_fields', {})
                evidence = task.get('evidence', {})
                confidence = task.get('confidence', 0)
                
                print(f"  提取的字段:")
                for key, value in extracted.items():
                    if key in ['sku_name', 'destination_city', 'hotel_name', 'daily_sell_price', 'daily_cost_price']:
                        print(f"    - {key}: {value}")
                
                print(f"  置信度: {confidence}")
                print(f"  证据数量: {len(evidence)} 个字段")
                
                return task
            
            elif status == 'failed':
                print(f"  ✗ 解析失败: {task.get('error_message', 'Unknown error')}")
                return None
            
            elif status in ['parsing', 'uploaded', 'created']:
                print(f"  ⏳ 状态: {status}, 继续等待...")
                time.sleep(2)
                waited += 2
            else:
                print(f"  ⚠ 未知状态: {status}")
                time.sleep(2)
                waited += 2
        
        print(f"  ✗ 等待超时")
        return None
    
    def confirm_import(self, task_id: str, sku_type: str, extracted_fields: Dict) -> Optional[str]:
        """确认导入"""
        print(f"\n[步骤3] 人确认 - 确认AI提取的信息")
        
        response = self._request(
            'POST',
            f'/imports/{task_id}/confirm',
            json={
                'sku_type': sku_type,
                'extracted_fields': extracted_fields
            }
        )
        
        if response.status_code != 200:
            print(f"  ✗ 确认失败: {response.text}")
            return None
        
        result = response.json()
        sku_id = result['sku_id']
        
        print(f"  ✓ 导入已确认")
        print(f"    SKU ID: {sku_id}")
        
        return sku_id
    
    def get_sku(self, sku_id: str) -> Optional[Dict]:
        """获取SKU"""
        response = self._request('GET', f'/skus/{sku_id}')
        
        if response.status_code != 200:
            return None
        
        return response.json()
    
    def search_skus(self, **filters) -> list:
        """搜索SKU"""
        response = self._request('GET', '/skus', params=filters)
        
        if response.status_code != 200:
            return []
        
        return response.json()
    
    def create_sku(self, sku_data: Dict) -> Optional[Dict]:
        """创建SKU"""
        response = self._request('POST', '/skus', json=sku_data)
        
        if response.status_code != 200:
            print(f"  ✗ 创建SKU失败: {response.text}")
            return None
        
        return response.json()
    
    def create_quotation(self, quotation_data: Dict) -> Optional[Dict]:
        """创建报价单"""
        response = self._request('POST', '/quotations', json=quotation_data)
        
        if response.status_code != 200:
            print(f"  ✗ 创建报价单失败: {response.text}")
            return None
        
        return response.json()
    
    def get_quotation_items(self, quotation_id: str) -> list:
        """获取报价单项目"""
        response = self._request('GET', f'/quotations/{quotation_id}/items')
        
        if response.status_code != 200:
            return []
        
        return response.json()
    
    def publish_quotation(self, quotation_id: str) -> Optional[str]:
        """发布报价单"""
        response = self._request('POST', f'/quotations/{quotation_id}/publish')
        
        if response.status_code != 200:
            print(f"  ✗ 发布失败: {response.text}")
            return None
        
        result = response.json()
        return result.get('url')
    
    def run_full_workflow_test(self):
        """运行完整流程测试"""
        print("=" * 80)
        print("TFRM 完整流程集成测试 - 真实服务器 + 真实LLM")
        print("=" * 80)
        
        # 检查服务器
        print("\n[检查] 检查服务器状态...")
        if not self.check_server():
            print("  ✗ 服务器未运行！")
            print("\n请先启动服务器:")
            print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
            return False
        print("  ✓ 服务器运行正常")
        
        # 注册登录
        if not self.register_and_login('test_user', 'test123', '测试旅行社'):
            return False
        
        # ====================================================================
        # 步骤1-3: 碎片输入 → AI解析 → 确认
        # ====================================================================
        hotel_input = """
        清迈亲子酒店套餐
        酒店：清迈假日酒店
        房型：家庭房
        价格：499元/晚
        成本：350元/晚
        地址：清迈市中心
        有效期：2024年全年
        标签：亲子、酒店
        """
        
        import_task = self.create_import_task(hotel_input)
        if not import_task:
            return False
        
        task_id = import_task['id']
        
        # 等待AI解析（真实LLM）
        parsed_task = self.wait_for_parsing(task_id)
        if not parsed_task:
            return False
        
        extracted_fields = parsed_task['extracted_fields']
        
        # 确认导入
        hotel_sku_id = self.confirm_import(task_id, 'hotel', extracted_fields)
        if not hotel_sku_id:
            return False
        
        # ====================================================================
        # 步骤4: 入库验证
        # ====================================================================
        print(f"\n[步骤4] 入库 - 验证SKU已保存")
        
        hotel_sku = self.get_sku(hotel_sku_id)
        if not hotel_sku:
            print("  ✗ SKU未找到")
            return False
        
        print(f"  ✓ SKU已成功入库")
        print(f"    名称: {hotel_sku['sku_name']}")
        print(f"    类型: {hotel_sku['sku_type']}")
        print(f"    状态: {hotel_sku['status']}")
        
        # ====================================================================
        # 创建第二个SKU（门票）
        # ====================================================================
        print(f"\n[额外] 创建第二个SKU（景点门票）")
        
        ticket_sku_data = {
            "sku_name": "清迈夜间动物园门票",
            "sku_type": "ticket",
            "owner_type": "private",
            "destination_city": "清迈",
            "destination_country": "泰国",
            "tags": ["亲子", "景点"],
            "attrs": {
                "attraction_name": "清迈夜间动物园",
                "ticket_type": "成人票",
                "entry_method": "电子票",
                "cost_price": 80.0,
                "sell_price": 120.0
            }
        }
        
        ticket_sku = self.create_sku(ticket_sku_data)
        if not ticket_sku:
            return False
        
        ticket_sku_id = ticket_sku['id']
        print(f"  ✓ 第二个SKU已创建: {ticket_sku['sku_name']}")
        print(f"    SKU ID: {ticket_sku_id}")
        
        # ====================================================================
        # 步骤5: 可检索
        # ====================================================================
        print(f"\n[步骤5] 可检索 - 测试搜索功能")
        
        search_results = self.search_skus(keyword="清迈")
        print(f"  ✓ 关键词搜索 '清迈': 找到 {len(search_results)} 个SKU")
        
        search_results = self.search_skus(city="清迈")
        print(f"  ✓ 城市搜索 '清迈': 找到 {len(search_results)} 个SKU")
        
        search_results = self.search_skus(tags="亲子")
        print(f"  ✓ 标签搜索 '亲子': 找到 {len(search_results)} 个SKU")
        
        # ====================================================================
        # 步骤6: 组合成报价
        # ====================================================================
        print(f"\n[步骤6] 组合成报价 - 创建报价单")
        
        quotation_data = {
            "title": "清迈4天3晚亲子游套餐",
            "items": [
                {"sku_id": hotel_sku_id, "quantity": 3},
                {"sku_id": ticket_sku_id, "quantity": 2},
            ],
            "customer_name": "张先生",
            "customer_contact": "13800138000",
            "notes": "包含接送机服务"
        }
        
        quotation = self.create_quotation(quotation_data)
        if not quotation:
            return False
        
        quotation_id = quotation['id']
        
        print(f"  ✓ 报价单已创建")
        print(f"    报价单ID: {quotation_id}")
        print(f"    标题: {quotation['title']}")
        print(f"    客户: {quotation['customer_name']}")
        print(f"    总价: {quotation['total_amount']}元")
        print(f"    状态: {quotation['status']}")
        
        # 获取报价项目
        items = self.get_quotation_items(quotation_id)
        print(f"  报价项目:")
        for idx, item in enumerate(items, 1):
            item_name = item.get('custom_title') or item['snapshot'].get('item_name', 'Unknown')
            print(f"    {idx}. {item_name} x {item['quantity']} = {item['subtotal']}元")
        
        # ====================================================================
        # 步骤7: 对外分享
        # ====================================================================
        print(f"\n[步骤7] 对外分享 - 发布报价单")
        
        share_url = self.publish_quotation(quotation_id)
        if not share_url:
            return False
        
        print(f"  ✓ 报价单已发布")
        print(f"    分享链接: {share_url}")
        
        # ====================================================================
        # 测试完成
        # ====================================================================
        print("\n" + "=" * 80)
        print("✓✓✓ 完整流程集成测试通过！")
        print("=" * 80)
        print("\n测试覆盖:")
        print("  1. ✓ 碎片输入 - 创建导入任务")
        print("  2. ✓ AI解析成草稿 - 真实LLM异步解析")
        print("  3. ✓ 人确认 - 用户确认字段")
        print("  4. ✓ 入库 - SKU保存到数据库")
        print("  5. ✓ 可检索 - 多种搜索方式")
        print("  6. ✓ 组合成报价 - 多SKU组合")
        print("  7. ✓ 对外分享 - 发布报价单")
        print("\n数据统计:")
        print(f"  - 导入任务: 1个 (ID: {task_id})")
        print(f"  - SKU创建: 2个 (酒店 + 门票)")
        print(f"  - 报价单: 1个 (ID: {quotation_id})")
        print(f"  - 报价项目: {len(items)}个")
        print(f"  - 总价: {quotation['total_amount']}元")
        print(f"  - 分享链接: {share_url}")
        print("=" * 80 + "\n")
        
        return True


def main():
    """主函数"""
    test = TFRMIntegrationTest()
    
    try:
        success = test.run_full_workflow_test()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n测试被用户中断")
        exit(1)
    except Exception as e:
        print(f"\n\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    main()
