"""Latency guard for simulation step endpoint."""

import os
import time

import pytest
from fastapi.testclient import TestClient


@pytest.mark.performance
def test_ucb1_step_p95_under_budget(client: TestClient) -> None:
    """Guard against accidental large slowdown in the step path."""
    create = client.post(
        "/api/simulate",
        json={
            "arms": None,
            "algorithm": "ucb1",
            "hyperparams": {},
            "seed": 1,
            "scenario_id": "notification_channels",
        },
    )
    assert create.status_code == 201
    sim_id = create.json()["id"]

    samples_ms: list[float] = []
    for _ in range(20):
        t0 = time.perf_counter()
        r = client.post(f"/api/simulate/{sim_id}/step")
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert r.status_code == 200
        samples_ms.append(elapsed_ms)

    samples_ms.sort()
    p95 = samples_ms[int(len(samples_ms) * 0.95) - 1]
    budget_ms = float(os.getenv("STEP_P95_BUDGET_MS", "800"))
    assert p95 < budget_ms, f"UCB1 step p95 {p95:.1f}ms exceeds {budget_ms}ms budget"
