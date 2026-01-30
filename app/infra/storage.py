from pathlib import Path
from typing import BinaryIO
import uuid
import shutil
from app.config import get_settings

settings = get_settings()


class StorageClient:
    def __init__(self):
        self.provider = settings.storage_provider
        self.storage_path = Path(settings.storage_path)
        if self.provider == "local":
            self.storage_path.mkdir(parents=True, exist_ok=True)
    
    async def upload_file(self, file: BinaryIO, filename: str, folder: str = "uploads") -> str:
        if self.provider == "local":
            return await self._upload_local(file, filename, folder)
        else:
            raise ValueError(f"Unsupported storage provider: {self.provider}")
    
    async def _upload_local(self, file: BinaryIO, filename: str, folder: str) -> str:
        file_id = uuid.uuid4().hex
        ext = Path(filename).suffix
        new_filename = f"{file_id}{ext}"
        
        folder_path = self.storage_path / folder
        folder_path.mkdir(parents=True, exist_ok=True)
        
        file_path = folder_path / new_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file, buffer)
        
        return f"/{folder}/{new_filename}"
    
    def get_file_url(self, file_path: str) -> str:
        # Expose through auth-protected download endpoint
        return f"/files{file_path}"

    def resolve_local_path(self, file_path: str) -> Path:
        """Ensure the file path stays inside the configured storage root."""
        if not file_path:
            raise ValueError("Empty file path")
        relative = file_path.lstrip("/")
        full_path = (self.storage_path / relative).resolve()
        storage_root = self.storage_path.resolve()
        if storage_root not in full_path.parents and full_path != storage_root:
            raise ValueError("Invalid file path")
        return full_path
