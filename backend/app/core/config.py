from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_DIR = PROJECT_ROOT / "backend"
DEFAULT_SQLITE_PATH = BACKEND_DIR / "rbn_backend.db"


class Settings(BaseSettings):
    app_name: str = "RBN Admin API"
    api_prefix: str = "/api"
    database_url: str = f"sqlite:///{DEFAULT_SQLITE_PATH.resolve().as_posix()}"
    jwt_secret: str = "rbn-backend-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    python_backend_url: str = "http://localhost:8000"
    model_config = SettingsConfigDict(env_file=PROJECT_ROOT / ".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
