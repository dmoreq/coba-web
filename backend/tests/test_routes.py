"""Integration tests for REST API routes."""


def _arms():
    return [
        {"id": "e", "label": "E", "true_prob": 0.2},
        {"id": "s", "label": "S", "true_prob": 0.8},
    ]


def _arms_2():
    return [
        {"id": "a", "label": "A", "true_prob": 0.5},
        {"id": "b", "label": "B", "true_prob": 0.6},
    ]


class TestCreateSimulation:
    def test_returns_201(self, client):
        r = client.post("/api/simulate", json={"arms": _arms()})
        assert r.status_code == 201
        assert "id" in r.json()

    def test_invalid_body_422(self, client):
        assert client.post("/api/simulate", json={}).status_code == 422

    def test_too_few_arms_422(self, client):
        assert (
            client.post(
                "/api/simulate", json={"arms": [{"id": "a", "label": "A", "true_prob": 0.5}]}
            ).status_code
            == 422
        )


class TestGetSimulation:
    def test_returns_200(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms()}).json()["id"]
        assert client.get(f"/api/simulate/{sid}").status_code == 200

    def test_unknown_404(self, client):
        assert client.get("/api/simulate/00000000-0000-0000-0000-000000000000").status_code == 404


class TestStep:
    def test_returns_200(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms()}).json()["id"]
        r = client.post(f"/api/simulate/{sid}/step")
        assert r.status_code == 200 and r.json()["t"] == 1

    def test_unknown_404(self, client):
        assert (
            client.post("/api/simulate/00000000-0000-0000-0000-000000000000/step").status_code
            == 404
        )


class TestRun:
    def test_returns_200(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms()}).json()["id"]
        r = client.post(f"/api/simulate/{sid}/run", json={"steps": 5})
        assert r.status_code == 200 and r.json()["steps_run"] == 5

    def test_invalid_steps_422(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms()}).json()["id"]
        assert client.post(f"/api/simulate/{sid}/run", json={"steps": 0}).status_code == 422


class TestDelete:
    def test_returns_204(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms()}).json()["id"]
        assert client.delete(f"/api/simulate/{sid}").status_code == 204

    def test_then_get_404(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms()}).json()["id"]
        client.delete(f"/api/simulate/{sid}")
        assert client.get(f"/api/simulate/{sid}").status_code == 404


class TestAlgorithms:
    def test_returns_list(self, client):
        data = client.get("/api/algorithms").json()
        assert len(data) >= 4 and "ucb1" in [a["id"] for a in data]


class TestCors:
    def test_cors_on_error(self, client):
        r = client.get(
            "/api/simulate/00000000-0000-0000-0000-000000000000",
            headers={"Origin": "http://localhost:3000"},
        )
        assert "access-control-allow-origin" in r.headers

    def test_cors_restricts_http_methods(self, client):
        """Verify CORS configuration only allows safe methods."""
        # Create a simulation first
        arms = [{"id": "a", "label": "A", "true_prob": 0.5}] * 2
        r_create = client.post("/api/simulate", json={"arms": arms})
        sim_id = r_create.json()["id"]

        # Test preflight with Origin header
        r_options = client.options(
            f"/api/simulate/{sim_id}",
            headers={"Origin": "http://localhost:3000"},
        )
        # CORS should be enabled
        assert "access-control-allow-origin" in r_options.headers

        # Check if allow-methods header exists and verify it doesn't use wildcard
        if "access-control-allow-methods" in r_options.headers:
            methods = r_options.headers["access-control-allow-methods"].upper()
            # Should not be the overly-permissive wildcard
            assert methods != "*", "CORS allow-methods should not be * for security"
            # Should not explicitly allow unsafe methods
            for unsafe in ["PUT", "PATCH"]:
                assert unsafe not in methods
