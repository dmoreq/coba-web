"""Algorithm listing endpoint."""

from fastapi import APIRouter, Depends

from coba_server.di import get_adapter
from coba_server.services.base import CobaAdapter

router = APIRouter(prefix="/algorithms", tags=["algorithms"])


@router.get("")
async def list_algorithms(
    adapter: CobaAdapter = Depends(get_adapter),
) -> list[dict]:
    return adapter.get_supported_algorithms()
