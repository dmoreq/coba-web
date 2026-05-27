"""Integration tests for the simulation results route."""


def _arms():
    return [
        {"id": "e", "label": "E", "true_prob": 0.2},
        {"id": "s", "label": "S", "true_prob": 0.8},
    ]


class TestResultsRoute:
    def test_results_at_t0_returns_empty(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms(), "algorithm": "ucb1"}).json()["id"]
        r = client.get(f"/api/simulate/{sid}/results")
        assert r.status_code == 200
        assert r.json() == {
            "total_steps": 0,
            "cumulative_regret": 0.0,
            "avg_reward": 0.0,
            "best_arm_found": None,
            "accuracy_table": [],
            "narrative": "",
        }

    def test_results_after_10_steps(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms(), "algorithm": "ucb1"}).json()["id"]
        client.post(f"/api/simulate/{sid}/run", json={"steps": 10})
        r = client.get(f"/api/simulate/{sid}/results")
        data = r.json()
        assert r.status_code == 200
        assert data["total_steps"] == 10
        assert data["cumulative_regret"] >= 0
        assert 0 <= data["avg_reward"] <= 1

    def test_results_best_arm_found(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms(), "algorithm": "ucb1"}).json()["id"]
        client.post(f"/api/simulate/{sid}/run", json={"steps": 10})
        assert client.get(f"/api/simulate/{sid}/results").json()["best_arm_found"] == "S"

    def test_results_accuracy_table_has_all_arms(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms(), "algorithm": "ucb1"}).json()["id"]
        client.post(f"/api/simulate/{sid}/run", json={"steps": 10})
        data = client.get(f"/api/simulate/{sid}/results").json()
        assert len(data["accuracy_table"]) == 2
        assert {row["arm"] for row in data["accuracy_table"]} == {"E", "S"}

    def test_results_narrative_mentions_algorithm(self, client):
        sid = client.post("/api/simulate", json={"arms": _arms(), "algorithm": "ucb1"}).json()["id"]
        client.post(f"/api/simulate/{sid}/run", json={"steps": 10})
        assert "ucb1" in client.get(f"/api/simulate/{sid}/results").json()["narrative"]

    def test_results_unknown_sim_404(self, client):
        assert (
            client.get("/api/simulate/00000000-0000-0000-0000-000000000000/results").status_code
            == 404
        )
