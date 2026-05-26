"""Algorithm metadata schemas."""

from pydantic import BaseModel


class AlgorithmInfo(BaseModel):
    id: str
    label: str
    description: str
    hyperparams: list[str] = []
