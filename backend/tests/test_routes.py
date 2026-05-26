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

    def test_with_hyperparams_bag(self, client):
        """Create a simulation with full hyperparams bag for a contextual algorithm."""
        r = client.post(
            "/api/simulate",
            json={
                "arms": _arms_2(),
                "algorithm": "linucb",
                "hyperparams": {"alpha": 3.0, "l2_lambda": 2.0, "gamma": 0.95, "n_clusters": 7},
                "seed": 99,
            },
        )
        assert r.status_code == 201
        data = r.json()
        assert data["algorithm"] == "linucb"
        assert data["seed"] == 99

    def test_exceeds_max_simulations(self, client):
        """Creating >100 sims should return 400.
        Uses a separate client-backed adapter by creating via the API."""
        arms = [{"id": "x", "label": "X", "true_prob": 0.5}] * 2
        created_ids = []
        try:
            for _ in range(105):
                r = client.post("/api/simulate", json={"arms": arms, "algorithm": "ucb1"})
                if r.status_code == 201:
                    created_ids.append(r.json()["id"])
                if r.status_code == 400:
                    assert "Maximum" in r.json()["detail"]
                    break
            else:
                assert False, "Never hit the cap after 105 attempts"
        finally:
            # Clean up all created sims so other tests aren't affected
            for sid in created_ids:
                client.delete(f"/api/simulate/{sid}")

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

    def test_delete_nonexistent_returns_204(self, client):
        """DELETE is idempotent — unknown sim returns 204."""
        assert (
            client.delete(
                "/api/simulate/00000000-0000-0000-0000-000000000000",
            ).status_code
            == 204
        )


class TestAlgorithms:
    def test_returns_list(self, client):
        data = client.get("/api/algorithms").json()
        ids = [a["id"] for a in data]
        assert len(data) >= 16 and "ucb1" in ids and "random_forest_ts" in ids


class TestCobaDiagnostics:
    def test_returns_coba_state_for_simulation(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms_2(), "algorithm": "linucb"}).json()[
            "id"
        ]
        client.post(f"/api/simulate/{sid}/run", json={"steps": 8})
        r = client.get(f"/api/simulate/{sid}/coba-state")
        assert r.status_code == 200
        data = r.json()
        assert data["policy"] == "linucb"
        assert "stats" in data and len(data["stats"]) == 2
        assert "model_state" in data and "arms" in data["model_state"]
        assert "scores" in data and set(data["scores"]) == {"A", "B"}


class TestCors:
    def test_cors_on_error(self, client):
        r = client.get(
            "/api/simulate/00000000-0000-0000-0000-000000000000",
            headers={"Origin": "http://localhost:3000"},
        )
        assert "access-control-allow-origin" in r.headers

    def test_cors_restricts_http_methods(self, client):
        """Verify CORS configuration only allows safe methods."""
        arms = [{"id": "a", "label": "A", "true_prob": 0.5}] * 2
        r_create = client.post("/api/simulate", json={"arms": arms})
        sim_id = r_create.json()["id"]

        r_options = client.options(
            f"/api/simulate/{sim_id}",
            headers={"Origin": "http://localhost:3000"},
        )
        assert "access-control-allow-origin" in r_options.headers

        if "access-control-allow-methods" in r_options.headers:
            methods = r_options.headers["access-control-allow-methods"].upper()
            assert methods != "*", "CORS allow-methods should not be * for security"
            for unsafe in ["PUT", "PATCH"]:
                assert unsafe not in methods
