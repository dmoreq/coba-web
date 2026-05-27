"""Application settings via pydantic-settings."""

import json
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    allow_simulation_purge: bool = False
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    model_config = {"env_prefix": "COBA_"}

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                value = json.loads(stripped)
            else:
                value = [origin.strip() for origin in stripped.split(",")]

        return [origin.rstrip("/") for origin in value if origin.strip()]
