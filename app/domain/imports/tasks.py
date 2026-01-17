from app.infra.queue import celery_app
from app.infra.db import SessionLocal, ImportTask, ImportStatus
from app.infra.llm_client import LLMClient
from app.infra.audit import audit_log
import traceback


@celery_app.task(bind=True, max_retries=3)
def parse_import_task(self, task_id: str):
    db = SessionLocal()
    try:
        task = db.query(ImportTask).filter(ImportTask.id == task_id).first()
        if not task:
            return {"error": "Task not found"}
        
        task.status = ImportStatus.PARSING
        db.commit()
        
        llm_client = LLMClient()
        
        result = None
        try:
            import asyncio
            result = asyncio.run(llm_client.parse_sku_input(
                input_text=task.input_text or "",
                images=task.input_files
            ))
        except Exception as e:
            raise Exception(f"LLM parsing failed: {str(e)}")
        
        task.status = ImportStatus.PARSED
        task.parsed_result = result
        task.extracted_fields = result.get("extracted_fields", {})
        task.confidence = result.get("confidence", {})
        task.evidence = result.get("evidence", {})
        
        db.commit()
        
        audit_log(
            db=db,
            agency_id=task.agency_id,
            user_id=task.user_id,
            action="import.parsed",
            entity_type="import_task",
            entity_id=task.id,
            after_data={"status": "parsed", "sku_type": result.get("sku_type")}
        )
        
        return {"status": "success", "task_id": task_id}
        
    except Exception as e:
        db.rollback()
        
        task = db.query(ImportTask).filter(ImportTask.id == task_id).first()
        if task:
            task.status = ImportStatus.FAILED
            task.error_message = str(e) + "\n" + traceback.format_exc()
            db.commit()
        
        audit_log(
            db=db,
            agency_id=task.agency_id if task else "unknown",
            user_id=task.user_id if task else "unknown",
            action="import.failed",
            entity_type="import_task",
            entity_id=task_id,
            after_data={"error": str(e)}
        )
        
        raise self.retry(exc=e, countdown=60)
        
    finally:
        db.close()
