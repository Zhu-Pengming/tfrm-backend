from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Environment / security
    app_env: str = "development"  # development / production
    cors_allowed_origins: list[str] = []
    cors_allow_all_in_dev: bool = True
    
    llm_provider: str = "kimi"
    kimi_api_key: str = ""
    kimi_model: str = "kimi-k2.5"
    
    storage_provider: str = "local"
    storage_path: str = "./uploads"
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings():
    return Settings()
