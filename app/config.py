from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    deepseek_api_key: str = ""
    openai_api_key: str = ""
    
    storage_provider: str = "local"
    storage_path: str = "./uploads"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
