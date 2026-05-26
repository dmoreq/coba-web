"""Shared fixtures for backend tests."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from coba_server import create_app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as c:
        yield c
