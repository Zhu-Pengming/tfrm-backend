from typing import Dict, Any, Optional, List
import httpx
import json
import base64
from app.config import get_settings

settings = get_settings()


class KimiClient:
    """
    Kimi K2.5 client with native multimodal support (vision + text)
    Compatible with OpenAI API format
    Supports file upload, extraction, and structured parsing
    """
    
    def __init__(self):
        self.api_key = settings.kimi_api_key
        self.model = settings.kimi_model
        self.base_url = "https://api.moonshot.cn/v1"
        
        if not self.api_key or self.api_key == "your-kimi-api-key-here":
            raise ValueError("Kimi API key is not configured. Please set a valid KIMI_API_KEY in .env file")
    
    async def upload_file(self, file_data: bytes, filename: str) -> str:
        """
        Upload file to Kimi and return file_id
        
        Args:
            file_data: File bytes
            filename: Original filename
            
        Returns:
            file_id from Kimi API
        """
        print(f"\n{'='*80}")
        print(f"KIMI FILE UPLOAD:")
        print(f"  - Filename: {filename}")
        print(f"  - Size: {len(file_data)} bytes")
        print(f"{'='*80}\n")
        
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                files = {
                    'file': (filename, file_data)
                }
                response = await client.post(
                    f"{self.base_url}/files",
                    headers={
                        "Authorization": f"Bearer {self.api_key}"
                    },
                    files=files
                )
                
                if response.status_code not in (200, 201):
                    error_detail = response.text
                    print(f"\n{'='*80}")
                    print(f"KIMI FILE UPLOAD ERROR:")
                    print(f"  Status: {response.status_code}")
                    print(f"  Detail: {error_detail}")
                    print(f"  URL: {self.base_url}/files")
                    print(f"  Filename: {filename}")
                    print(f"{'='*80}\n")
                    raise Exception(f"Kimi file upload failed (HTTP {response.status_code}): {error_detail}")
                
                result = response.json()
                file_id = result.get('id')
                
                print(f"\n{'='*80}")
                print(f"KIMI FILE UPLOAD SUCCESS:")
                print(f"  - File ID: {file_id}")
                print(f"  - Filename: {result.get('filename')}")
                print(f"{'='*80}\n")
                
                return file_id
        except httpx.TimeoutException as e:
            raise Exception(f"Kimi file upload timeout: Request took longer than 600 seconds")
        except httpx.NetworkError as e:
            raise Exception(f"Kimi file upload network error: {str(e)}")
        except httpx.HTTPError as e:
            raise Exception(f"Kimi file upload HTTP error: {str(e)}")
    
    async def get_file(self, file_id: str) -> Dict[str, Any]:
        """
        Retrieve file metadata to confirm upload success
        
        Args:
            file_id: File ID from upload_file
            
        Returns:
            File metadata dict
        """
        print(f"\n{'='*80}")
        print(f"KIMI FILE RETRIEVE:")
        print(f"  - File ID: {file_id}")
        print(f"{'='*80}\n")
        
        async with httpx.AsyncClient(timeout=600.0) as client:
            response = await client.get(
                f"{self.base_url}/files/{file_id}",
                headers={
                    "Authorization": f"Bearer {self.api_key}"
                }
            )
            
            if response.status_code != 200:
                error_detail = response.text
                print(f"\n{'='*80}")
                print(f"KIMI FILE RETRIEVE ERROR:")
                print(f"  Status: {response.status_code}")
                print(f"  Detail: {error_detail}")
                print(f"{'='*80}\n")
                raise Exception(f"Kimi file retrieve error ({response.status_code}): {error_detail}")
            
            result = response.json()
            
            print(f"\n{'='*80}")
            print(f"KIMI FILE RETRIEVE SUCCESS:")
            print(f"  - File ID: {result.get('id')}")
            print(f"  - Filename: {result.get('filename')}")
            print(f"  - Status: {result.get('status')}")
            print(f"{'='*80}\n")
            
            return result
    
    async def get_file_content(self, file_id: str) -> str:
        """
        Extract file content using Kimi's file content API
        This is the correct way to get text from uploaded files
        
        Args:
            file_id: File ID from upload_file
            
        Returns:
            Extracted text content from the file
        """
        print(f"\n{'='*80}")
        print(f"KIMI FILE CONTENT EXTRACTION:")
        print(f"  - File ID: {file_id}")
        print(f"{'='*80}\n")
        
        async with httpx.AsyncClient(timeout=600.0) as client:
            response = await client.get(
                f"{self.base_url}/files/{file_id}/content",
                headers={
                    "Authorization": f"Bearer {self.api_key}"
                }
            )
            
            if response.status_code != 200:
                error_detail = response.text
                print(f"\n{'='*80}")
                print(f"KIMI FILE CONTENT EXTRACTION ERROR:")
                print(f"  Status: {response.status_code}")
                print(f"  Detail: {error_detail}")
                print(f"{'='*80}\n")
                raise Exception(f"Kimi file content extraction error ({response.status_code}): {error_detail}")
            
            content = response.text
            
            print(f"\n{'='*80}")
            print(f"KIMI FILE CONTENT EXTRACTION SUCCESS:")
            print(f"  - Content length: {len(content)} chars")
            print(f"  - Preview: {content[:200]}...")
            print(f"{'='*80}\n")
            
            return content
    
    async def parse_sku_input(
        self, 
        input_text: str, 
        images: Optional[List[Dict[str, Any]]] = None,
        file_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Parse SKU input using Kimi K2.5 multimodal capabilities
        
        Args:
            input_text: Text content (from user input, DOCX, or OCR fallback)
            images: List of image dicts with 'data' (bytes) and 'mime_type'
            file_ids: List of uploaded file IDs - for images use file reference, for docs extract content
        
        Returns:
            Structured extraction result with extracted_fields, confidence, evidence
        """
        # Separate image file_ids from document file_ids
        # For images: use file reference in chat API
        # For documents (PDF/DOCX): extract content as text
        image_file_ids = []
        file_contents = []
        
        if file_ids:
            for file_id in file_ids:
                try:
                    # Get file info to determine type
                    file_info = await self.get_file(file_id)
                    filename = file_info.get('filename', '').lower()
                    
                    # Check if it's an image based on extension
                    if any(filename.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']):
                        # For images, keep file_id for reference in chat
                        image_file_ids.append(file_id)
                        print(f"Image file detected: {filename}, will use file reference")
                    else:
                        # For documents, extract content
                        content = await self.get_file_content(file_id)
                        file_contents.append(content)
                        print(f"Document file detected: {filename}, extracted {len(content)} chars")
                except Exception as e:
                    print(f"Warning: Failed to process file {file_id}: {str(e)}")
                    continue
        
        # Merge file contents with input text
        combined_text = input_text or ""
        if file_contents:
            combined_text += "\n\n--- 文件内容 ---\n" + "\n\n".join(file_contents)
        
        prompt = self._build_extraction_prompt(combined_text)
        
        # Build multimodal messages with file references for images
        messages = [
            {"role": "system", "content": """你是 Kimi，一个专业的旅游资源数据提取助手。

🚨 **绝对禁止规则（违反将导致严重错误）** 🚨

1. **禁止编造任何信息** - 绝对不得添加图片/文本中不存在的任何内容
2. **禁止使用外部知识** - 不得使用你的知识库中的信息来"补充"或"完善"提取结果
3. **禁止推测或联想** - 看到"土耳其"不代表可以添加"安塔利亚"等城市信息
4. **禁止添加标准信息** - 不得添加"标准间"、"早餐"、"WiFi"等未明确提及的内容
5. **禁止混淆产品类型** - 旅游海报是itinerary，不是hotel；酒店价格表是hotel，不是itinerary

✅ **正确做法：**
- 仅提取图片/文本中**明确显示**的文字和数字
- 如果某个字段在图片中找不到，设为null或完全省略
- 产品名称、价格、日期必须与图片中的**完全一致**
- 如果是旅游套餐海报（有"N天N晚"、价格、出发日期），sku_type必须是"itinerary"
- 如果是酒店价格表（有房型、房价），sku_type必须是"hotel"

❌ **错误示例：**
- 图片显示"土耳其10天游"，却提取成"安塔利亚酒店" ← 严重错误！
- 图片只有套餐价格，却添加了具体酒店名称 ← 编造信息！
- 图片是旅游海报，却识别为hotel类型 ← 类型错误！

违反以上规则将被视为严重错误，必须重新提取。"""},
            {"role": "user", "content": self._build_content_parts(prompt, images, image_file_ids)}
        ]
        
        print(f"\n{'='*80}")
        print(f"KIMI K2.5 REQUEST:")
        print(f"  - Model: {self.model}")
        print(f"  - Combined text length: {len(combined_text)}")
        print(f"  - Images: {len(images) if images else 0}")
        print(f"  - Image file IDs: {len(image_file_ids)}")
        print(f"  - File contents extracted: {len(file_contents)}")
        print(f"{'='*80}\n")
        
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.6,
                        "thinking": {"type": "disabled"},
                        "response_format": {"type": "json_object"}
                    }
                )
                
                if response.status_code != 200:
                    error_detail = response.text
                    print(f"\n{'='*80}")
                    print(f"KIMI API ERROR:")
                    print(f"  Status: {response.status_code}")
                    print(f"  Detail: {error_detail}")
                    print(f"  Model: {self.model}")
                    print(f"  URL: {self.base_url}/chat/completions")
                    print(f"{'='*80}\n")
                    raise Exception(f"Kimi API request failed (HTTP {response.status_code}): {error_detail}")
                
                result = response.json()
                
                if "choices" not in result or not result["choices"]:
                    raise Exception("No response from Kimi API")
                
                content = result["choices"][0]["message"]["content"]
                parsed_result = json.loads(content)
                
                print(f"\n{'='*80}")
                print(f"KIMI EXTRACTION SUCCESS:")
                print(f"  - SKU Type: {parsed_result.get('sku_type', 'unknown')}")
                print(f"  - Fields extracted: {len(parsed_result.get('extracted_fields', {}))}")
                print(f"{'='*80}\n")
                
                return parsed_result
        except httpx.TimeoutException as e:
            raise Exception(f"Kimi API timeout: Request took longer than 600 seconds")
        except httpx.NetworkError as e:
            raise Exception(f"Kimi API network error: {str(e)}")
        except httpx.HTTPError as e:
            raise Exception(f"Kimi API HTTP error: {str(e)}")
    
    def _build_content_parts(
        self, 
        text_prompt: str, 
        images: Optional[List[Dict[str, Any]]] = None,
        file_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Build multimodal content parts for Kimi K2.5
        Supports: text + images (base64 encoded) + file references
        """
        parts = []
        
        # Add file references for uploaded images (preferred method - avoids timeout)
        if file_ids:
            for file_id in file_ids:
                parts.append({
                    "type": "file",
                    "file_url": {
                        "url": f"file://{file_id}"
                    }
                })
                print(f"  - Added file reference: {file_id}")
        
        # Add images as base64 (fallback for non-Kimi providers or direct image data)
        if images:
            for img_data in images:
                try:
                    if isinstance(img_data, dict):
                        data = img_data.get('data')
                        mime_type = img_data.get('mime_type', 'image/jpeg')
                    else:
                        data = img_data
                        mime_type = 'image/jpeg'
                    
                    # Handle both PDF and images - send directly to Kimi API
                    if mime_type == 'application/pdf' or mime_type.startswith('image/'):
                        file_b64 = base64.b64encode(data).decode('utf-8')
                        
                        parts.append({
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{file_b64}"
                            }
                        })
                        
                        file_type = "PDF" if mime_type == 'application/pdf' else "image"
                        print(f"  - Added {file_type} ({mime_type}, {len(data)} bytes)")
                    
                    else:
                        print(f"  - Unsupported mime type: {mime_type}, skipping")
                
                except Exception as e:
                    print(f"Warning: Failed to process image/file: {str(e)}")
                    continue
        
        # Add text prompt
        parts.append({
            "type": "text",
            "text": text_prompt
        })
        
        return parts
    
    def _build_extraction_prompt(self, input_text: str) -> str:
        """
        Build extraction prompt optimized for Kimi K2.5
        Emphasizes visual understanding for posters, pricing tables, itineraries
        """
        return f"""你是一个专业的旅游资源数据提取专家。请从提供的图片和文本中提取结构化信息。

🔍 **第一步：识别文档类型（非常重要）**
在提取任何信息之前，先判断这是什么类型的文档：

**旅游套餐海报特征：**
- 有"N天N晚"、"双飞"、"双卧"等行程天数描述
- 显示出发日期和价格（如"4月15日 13999元起"）
- 有景点图片拼贴、热气球、海滩等旅游场景
- 包含"精选航空"、"尊享质量"、"携家赠送"等营销文案
- 标题通常是"XX游"、"XX之旅"
→ 这是 **itinerary（行程/旅游套餐）**，不是hotel！

**酒店价格表特征：**
- 有明确的酒店名称（如"XX大酒店"、"XX宾馆"、"XX饭店"）
- 有房型列表（标准间、豪华套房、商务单间、套房等）
- 有按房型和季节划分的价格表（旺季/平季/淡季或其他季节定价）
- 可能包含餐饮、会议室价格（但主要内容是房间定价）
- 即使同时提供餐饮和会议服务，只要有房型价格表就是hotel
→ 这是 **hotel（酒店）**，不是activity！

⚠️ **严重警告：绝对不得混淆或编造信息** ⚠️
- 如果是旅游套餐海报，sku_type必须是"itinerary"，不要编造具体酒店名称
- 如果图片显示"土耳其10天游"，就提取"土耳其10天游"，不要添加"安塔利亚酒店"等不存在的信息
- 如果图片只显示国家名（如"土耳其"），destination_country填"土耳其"，destination_city留空或null
- 不得使用外部知识来"补充"城市信息

**关键规则（违反将导致拒绝）：**
1. **仅从实际内容提取** - 不得使用外部知识或编造信息
2. **缺失信息处理** - 如果文本/图片中没有某个字段，完全省略该字段或设为 null
3. **不得添加标准设施** - 除非明确提到，不得添加游泳池、健身房、迷你吧、欢迎水果等
4. **不得编造退改政策** - 除非文档明确说明，否则不包含取消政策
5. **价格表完整提取** - 提取所有行和列，不得跳过任何条目
6. **中文文本注意** - 准确识别中文名称、城市、价格
7. **正确识别 SKU 类型** - 根据实际内容判断（优先级从高到低）：
   - 如果有房型/房间价格表 → hotel（即使同时提供餐饮和会议服务）
   - 如果包含"N天N晚"、"双飞"、"双卧"、"行程"等多日旅游套餐 → itinerary
   - 如果只有餐饮价格 → restaurant
   - 如果有车辆/用车服务 → car
   - 如果有导游服务 → guide
   - 如果有门票信息 → ticket
   - 如果只有单项活动/体验项目 → activity
8. **多房型/多季节** - 酒店有多个房型、楼栋或季节定价时，提取每一个变体
9. **餐饮定价** - 提取所有餐型和团组规模变化
10. **会议室** - 提取所有会议室类型及其容量和定价
11. **必须提供证据** - 每个提取字段必须有对应证据，无法引用原文则不提取该字段

**视觉理解重点（针对图片/PDF）：**
- 识别价格表的表格结构（行列对应关系）
- 理解版式布局（标题、副标题、注释、使用规则）
- 提取日期范围、加价规则、特殊说明
- 识别套餐组合、房型差异、季节划分

返回 JSON 格式（严格遵守此结构）：

{{
  "sku_type": "hotel|car|itinerary|guide|restaurant|ticket|activity",
  "category": "hotel|transport|route|guide|dining|ticket|activity",
  // ⚠️ category 是统一的7大品类，映射关系：
  // hotel → hotel, car → transport, itinerary → route, guide → guide
  // restaurant → dining, ticket → ticket, activity → activity
  
  // ⚠️ SKU类型识别规则（优先级从高到低）：
  // - 文档包含"宾馆"、"酒店"、"饭店"或有房型价格表 → 必须是 "hotel" (category: "hotel")
  // - 文档包含"N天N晚"、"双飞"、"双卧"、"行程"、"游东北"等多日旅游套餐 → 必须是 "itinerary" (category: "route")
  // - 文档包含"餐厅"、"餐馆"但无房型 → "restaurant" (category: "dining")
  // - 文档包含"用车"、"车辆"、"司机" → "car" (category: "transport")
  // - 文档包含"导游"、"讲解员" → "guide" (category: "guide")
  // - 文档包含"门票"、"景区" → "ticket" (category: "ticket")
  // - 其他单项体验类项目 → "activity" (category: "activity")
  
  "extracted_fields": {{
    "sku_name": "从文档中提取的名称",
    "destination_city": "城市名称",
    "destination_country": "国家名称",
    "supplier_name": "供应商名称（如有）",
    
    // 统一标签体系（重要）
    "tags_interest": ["美食", "亲子", "徒步", "茶艺", "咖啡", "漂流", "自行车", "摄影", "文化", "历史"],
    // tags_interest: 兴趣标签数组，从文档中提取用户可能感兴趣的主题标签
    // 常见标签：美食/亲子/徒步/茶艺/咖啡/漂流/自行车/摄影/文化/历史/购物/休闲/探险/浪漫/奢华/经济实惠
    
    "tags_service": {{
      "language": ["中文", "英文", "泰文"],  // 服务语言
      "duration": "3小时" 或 "全天",  // 服务时长
      "location": "市区" 或 "郊区",  // 服务地点范围
      "group_size": "2-8人",  // 适合团组规模
      "difficulty": "简单" 或 "中等" 或 "困难"  // 难度等级（活动类）
    }},
    // tags_service: 服务标签对象，描述服务相关的属性
    
    "tags": ["标签1", "标签2"],  // 保留用于向后兼容
    "description": "资源简要描述",
    
    // 价格字段（重要）
    "base_cost_price": 800.00,  // 供应商成本价（数字，不带货币符号）
    "base_sale_price": 1200.00,  // 供应商对外销售价（数字，不带货币符号）
    
    ...根据 sku_type 的其他相关字段
  }},
  "confidence": {{
    "sku_name": 0.95,
    "destination_city": 0.85,
    ...每个字段的置信度分数 (0-1)
  }},
  "evidence": {{
    "sku_name": "支持此提取的确切文本片段或图片描述",
    "destination_city": "支持此提取的确切文本片段或图片描述",
    ...每个提取字段的证据，说明在输入中的哪里找到此信息
  }},
  "extraction_notes": "关于文档中找到/未找到哪些信息的简要说明"
}}

**各类别特定字段（在 extracted_fields 中根据 sku_type 包含）：**

**HOTEL（酒店）：**
  - hotel_name: 酒店全称
  - address: 完整地址
  - star_rating: 星级（如有）
  - contact_info: {{phone, fax, email, website, wechat}}
  - facilities: 设施/配套数组
  - room_types: 房型数组，结构：
    {{
      "building": "楼栋名称/编号（如有多栋）",
      "room_type_name": "豪华套房/豪华标间/商务单间等",
      "include_breakfast": true/false,
      "pricing": [
        {{"season": "旺季/peak", "daily_price": 1480, "currency": "CNY"}},
        {{"season": "平季/regular", "daily_price": 1080, "currency": "CNY"}},
        {{"season": "淡季/low", "daily_price": 880, "currency": "CNY"}}
      ]
    }}
  - dining_options: 餐饮定价数组，结构：
    {{
      "meal_type": "早餐/午餐/晚餐",
      "pricing": [
        {{"group_size": "10人以上", "price_per_person": 40}},
        {{"group_size": "6人以上", "price_per_person": 60}},
        {{"group_size": "2-5人", "price_per_person": 80}}
      ]
    }}
  - conference_rooms: 会议室数组，结构：
    {{
      "room_name": "会议室名称",
      "area_sqm": 426,
      "capacity": "容量描述",
      "function": "大型会议/论坛等",
      "pricing": [
        {{"duration": "全天/full_day", "price": 10000}},
        {{"duration": "半天/half_day", "price": 6000}}
      ]
    }}
  - special_packages: 特殊套餐数组（仅在明确提及时）
  - season_definitions: {{"peak": "7月1日-10月31日", "regular": "4月1日-6月30日", "low": "11月1日-次年3月31日"}}
  - booking_notes: 重要预订政策或限制（仅在明确说明时）
  
  **酒店重要提示：**
  - 不得添加未提及的设施（泳池、健身房、SPA等）
  - 不得编造取消政策
  - 不得虚构房间面积
  - 提取价格表中的所有房型 - 不得跳过任何行
  - 提取所有季节定价变化 - 不得跳过任何列

**CAR（用车）：** car_type, seats, service_mode, service_hours, driver_language, daily_price

**GUIDE（导游）：** guide_name, languages, expertise_tags, daily_cost_price, contact_phone

**RESTAURANT（餐厅）：** restaurant_name, cuisine_type, meal_types (数组), per_person_price, group_pricing

**TICKET（门票）：** attraction_name, ticket_type, entry_method, cost_price, sell_price, valid_dates

**ACTIVITY（活动）：** activity_name, category, duration_hours, language_service, highlights, group_size, meeting_point, included_items

**ITINERARY（行程/旅游套餐）：**
  - itinerary_name: 行程名称（如"浪漫10天 臻选土耳其"）
  - destination_country: 目的地国家（如"土耳其"）
  - destination_city: 目的地城市（如果海报未明确列出具体城市，设为null）
  - days: 天数（如10）
  - nights: 晚数（通常是days-1）
  - departure_dates: 出发日期数组，结构：
    {{
      "date": "4月15日" 或 "2024-04-15",
      "price": 13999,
      "currency": "CNY",
      "notes": "备注（如有）"
    }}
  - highlights: 行程亮点数组（从图片中提取的特色说明）
  - included_services: 包含服务数组（如"精选航空"、"尊享质量"、"携家赠送"）
  - tags: 标签数组（从图片中提取，如"浪漫"、"臻选"、"纯玩无购物"等）
  - supplier_name: 供应商名称（如有）
  - booking_notes: 预订说明（如"南京起止"、"纯玩无购物"等）
  
  **行程重要提示：**
  - 如果是旅游套餐海报，不要编造具体酒店名称
  - 如果只显示国家名，destination_city留空
  - 提取所有出发日期和对应价格
  - 不要添加海报中未提及的景点或服务

**待分析的输入内容：**
{input_text if input_text else "(请参考上方图片内容)"}

**仅返回有效 JSON，不要有任何额外文本或解释。**"""
