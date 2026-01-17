from typing import Dict, Any, Optional
import httpx
import json
from app.config import get_settings

settings = get_settings()


class LLMClient:
    def __init__(self, provider: Optional[str] = None):
        self.provider = provider or settings.llm_provider
        
    async def parse_sku_input(self, input_text: str, images: list = None) -> Dict[str, Any]:
        if self.provider == "gemini":
            return await self._parse_with_gemini(input_text, images)
        elif self.provider == "deepseek":
            return await self._parse_with_deepseek(input_text, images)
        elif self.provider == "openai":
            return await self._parse_with_openai(input_text, images)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
    
    async def _parse_with_gemini(self, input_text: str, images: list = None) -> Dict[str, Any]:
        prompt = self._build_extraction_prompt(input_text)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={settings.gemini_api_key}",
                json={
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }],
                    "generationConfig": {
                        "temperature": 0.1,
                        "responseMimeType": "application/json"
                    }
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Gemini API error: {response.text}")
            
            result = response.json()
            text_response = result["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text_response)
    
    async def _parse_with_deepseek(self, input_text: str, images: list = None) -> Dict[str, Any]:
        prompt = self._build_extraction_prompt(input_text)
        
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
                        {"role": "system", "content": "You are a travel resource data extraction assistant. Extract structured information and provide evidence."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"DeepSeek API error: {response.text}")
            
            result = response.json()
            return json.loads(result["choices"][0]["message"]["content"])
    
    async def _parse_with_openai(self, input_text: str, images: list = None) -> Dict[str, Any]:
        prompt = self._build_extraction_prompt(input_text)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4-turbo-preview",
                    "messages": [
                        {"role": "system", "content": "You are a travel resource data extraction assistant. Extract structured information and provide evidence."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"OpenAI API error: {response.text}")
            
            result = response.json()
            return json.loads(result["choices"][0]["message"]["content"])
    
    def _build_extraction_prompt(self, input_text: str) -> str:
        return f"""Extract travel resource information from the following text and return a JSON object with this structure:

{{
  "sku_type": "hotel|car|itinerary|guide|restaurant|ticket|activity",
  "extracted_fields": {{
    "sku_name": "extracted name",
    "destination_city": "city name",
    "destination_country": "country name",
    "supplier_name": "supplier if mentioned",
    "tags": ["tag1", "tag2"],
    ...other relevant fields based on sku_type
  }},
  "confidence": {{
    "sku_name": 0.95,
    "destination_city": 0.85,
    ...confidence score (0-1) for each field
  }},
  "evidence": {{
    "sku_name": "exact text snippet that supports this extraction",
    "destination_city": "exact text snippet that supports this extraction",
    ...evidence for each extracted field
  }}
}}

For attrs (category-specific fields), include them in extracted_fields based on sku_type:
- hotel: hotel_name, room_type_name, include_breakfast, daily_cost_price, daily_sell_price, etc.
- car: car_type, seats, service_mode, service_hours, driver_language, etc.
- guide: guide_name, languages, expertise_tags, daily_cost_price, contact_phone, etc.
- restaurant: restaurant_name, cuisine_type, meal_type, per_person_price, etc.
- ticket: attraction_name, ticket_type, entry_method, cost_price, sell_price, etc.
- activity: activity_name, category, duration_hours, language_service, etc.
- itinerary: itinerary_name, days, nights, depart_city, min_pax, adult_price, etc.

Input text:
{input_text}

Return ONLY valid JSON, no additional text."""
