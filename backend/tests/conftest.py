"""Shared fixtures for backend tests."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from coba_server import create_app
from coba_server.di import get_adapter, get_simulation_service


@pytest.fixture(autouse=True)
def _clear_di_cache():
    """Clear DI singletons between tests so test state doesn't leak."""
    get_adapter.cache_clear()
    get_simulation_service.cache_clear()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as c:
        yield c
