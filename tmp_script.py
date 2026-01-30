# coding: utf-8
from pathlib import Path
import re
path = Path('app/infra/llm_client.py')
text = path.read_text(encoding='utf-8')
pattern = r"async def _parse_with_deepseek\(.*?\) -> Dict\[str, Any\]:\n.*?\n    async def _parse_with_openai"
match = re.search(pattern, text, flags=re.S)
if not match:
    raise SystemExit('pattern not found')

new_func = '''async def _parse_with_deepseek(self, input_text: str, images: list = None) -> Dict[str, Any]:
        # DeepSeek doesn't support vision API, so we use OCR to extract text first
        combined_text = input_text or ""
        
        if images:
            print("\n" + "="*80)
            print("DeepSeek doesn't support images - using EasyOCR to extract text first")
            print("="*80 + "\n")
            
            ocr_processor = OCRProcessor()
            ocr_any_text = False
            for img_data in images:
                try:
                    if isinstance(img_data, dict):
                        ocr_text = ocr_processor.extract_text(
                            img_data.get('data'), 
                            img_data.get('mime_type', 'image/jpeg')
                        )
                    else:
                        ocr_text = ocr_processor.extract_text_from_image(img_data)
                    
                    print(f"\n{'='*80}")
                    print(f"OCR EXTRACTED TEXT (first 500 chars):")
                    print(f"{'='*80}")
                    print(ocr_text[:500] if len(ocr_text) > 500 else ocr_text)
                    print(f"{'='*80}\n")
                    
                    if ocr_text and len(ocr_text.strip()) > 0:
                        ocr_any_text = True
                    combined_text += f"\n\n--- OCR鎻愬彇鐨勬枃瀛?---\n{ocr_text}"
                except Exception as e:
                    print(f"OCR ERROR: {str(e)}")
                    raise ValueError(f"OCR failed for uploaded file: {str(e)}") from e
            
            if not ocr_any_text and not (input_text and input_text.strip()):
                raise ValueError("Unable to extract any text from the uploaded file. Ensure the PDF/image is clear and poppler is installed for PDFs.")
        
        if not combined_text.strip():
            raise ValueError("No input text provided for extraction.")
        
        prompt = self._build_extraction_prompt(combined_text)
        
        print(f"\n{'='*80}")
        print(f"PROMPT BEING SENT TO DEEPSEEK (first 500 chars):")
        print(f"{'='*80}")
        print(prompt[:500])
        print(f"{'='*80}\n")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.deepseek_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": "You are a data extraction assistant. CRITICAL RULES: 1) Extract information ONLY from the text provided - DO NOT invent, assume, or use prior knowledge. 2) If information is NOT explicitly stated in the text, DO NOT include that field or set it to null. 3) DO NOT add typical hotel amenities (pools, gyms, etc.) unless explicitly mentioned. 4) DO NOT create cancellation policies unless explicitly stated. 5) For pricing tables, extract EVERY row and column exactly as shown. 6) Provide evidence quotes for every extracted field. 7) If you cannot quote the exact text supporting a field, DO NOT extract that field."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.0,
                    "response_format": {"type": "json_object"}
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise Exception(f"DeepSeek API error: {response.text}")
            
            result = response.json()
            parsed_result = json.loads(result["choices"][0]["message"]["content"])
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info("="*80)
            logger.info("DEEPSEEK RESPONSE - extracted_fields keys:")
            logger.info("="*80)
            if "extracted_fields" in parsed_result:
                for key in parsed_result["extracted_fields"].keys():
                    value = parsed_result["extracted_fields"][key]
                    if isinstance(value, list):
                        logger.info(f"  - {key}: [{len(value)} items]")
                        if len(value) > 0 and key == "room_types":
                            logger.info(f"    First room: {value[0]}")
                    elif isinstance(value, dict):
                        logger.info(f"  - {key}: {{{len(value)} keys}}")
                    else:
                        logger.info(f"  - {key}: {str(value)[:100]}")
            logger.info("="*80)
            
            return parsed_result

    async def _parse_with_openai'''

new_text = re.sub(pattern, new_func, text, flags=re.S)
path.write_text(new_text, encoding='utf-8')
