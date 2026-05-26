"""Tests for health endpoint and scaffolding."""

import coba_server
from coba_server.config import Settings


class TestHealthEndpoint:
    def test_health_route_returns_200(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

    def test_cors_headers_present(self, client):
        resp = client.get("/api/health", headers={"Origin": "http://localhost:3000"})
        assert "access-control-allow-origin" in resp.headers

    def test_openapi_docs_accessible(self, client):
        resp = client.get("/docs")
        assert resp.status_code == 200

    def test_config_loads_from_env(self, monkeypatch):
        monkeypatch.setenv("COBA_HOST", "127.0.0.1")
        monkeypatch.setenv("COBA_PORT", "9000")
        s = Settings()
        assert s.host == "127.0.0.1"
        assert s.port == 9000

    def test_config_defaults(self):
        s = Settings()
        assert s.host == "0.0.0.0"
        assert s.port == 8000

    def test_cors_origins_accept_comma_separated_env(self, monkeypatch):
        monkeypatch.setenv(
            "COBA_CORS_ORIGINS",
            "https://coba-web.vercel.app, https://coba-api.onrender.com/",
        )
        s = Settings()
        assert s.cors_origins == [
            "https://coba-web.vercel.app",
            "https://coba-api.onrender.com",
        ]


class TestScaffolding:
    def test_package_imports(self):
        assert coba_server is not None

    def test_ruff_available(self):
        import subprocess
        import sys

        r = subprocess.run(
            [sys.executable, "-m", "ruff", "--version"], capture_output=True, text=True, check=False
        )
        assert r.returncode == 0
