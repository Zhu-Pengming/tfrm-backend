from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "tfrm",
    broker=settings.redis_url,
    backend=settings.redis_url
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
)

# 导入任务模块以注册任务
from app.domain.imports import tasks
