from typing import Dict, Any, Optional
from app.config import get_settings
from app.infra.kimi_client import KimiClient

settings = get_settings()


class LLMClient:
    """Unified LLM client - currently supports Kimi K2.5"""
    
    def __init__(self, provider: Optional[str] = None):
        self.provider = provider or settings.llm_provider
        
    async def parse_sku_input(self, input_text: str, images: list = None, file_ids: list = None) -> Dict[str, Any]:
        print(f"\n{'='*80}")
        print(f"LLMClient.parse_sku_input called:")
        print(f"  - Provider: {self.provider}")
        print(f"  - Input text length: {len(input_text) if input_text else 0}")
        print(f"  - Images provided: {len(images) if images else 0}")
        print(f"  - File IDs provided: {len(file_ids) if file_ids else 0}")
        print(f"  - Input text preview: {input_text[:200] if input_text else '(empty)'}")
        print(f"{'='*80}\n")
        
        if self.provider == "kimi":
            return await self._parse_with_kimi(input_text, images, file_ids)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}. Only 'kimi' is supported.")
    
    async def _parse_with_kimi(self, input_text: str, images: list = None, file_ids: list = None) -> Dict[str, Any]:
        """Use Kimi K2.5 for extraction with native multimodal support"""
        kimi_client = KimiClient()
        return await kimi_client.parse_sku_input(input_text, images, file_ids)
