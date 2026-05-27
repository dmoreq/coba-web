import { test, expect } from "@playwright/test";
import {
  apiCreateSim,
  apiDelete,
  apiHealth,
  apiListScenarios,
  apiRun,
  apiStep,
} from "./helpers/api";
import { SCENARIOS } from "./fixtures/scenarios";

test.describe("API health", () => {
  test("GET /api/health returns ok", async ({ request }) => {
    expect(await apiHealth(request)).toBe(true);
  });
});

test.describe("API scenarios", () => {
  test("lists five scenarios with metadata", async ({ request }) => {
    const list = await apiListScenarios(request);
    expect(list).toHaveLength(5);
    for (const { id } of SCENARIOS) {
      expect(list.some((s) => s.id === id)).toBe(true);
    }
    const drift = list.find((s) => s.id === "content_format");
    expect(drift?.has_drift).toBe(true);
  });
});

test.describe("API simulation lifecycle", () => {
  test("create → step → run → get → delete", async ({ request }) => {
    const { id } = await apiCreateSim(request, { algorithm: "ucb1", seed: 7 });
    try {
      const step1 = await apiStep(request, id);
      expect(step1.t).toBe(1);

      const run = await apiRun(request, id, 5);
      expect(run.final_t).toBe(6);

      const get = await request.get(`http://localhost:8000/api/simulate/${id}`);
      expect(get.ok()).toBe(true);
      const body = (await get.json()) as { state: { t: number } };
      expect(body.state.t).toBe(6);
    } finally {
      await apiDelete(request, id);
    }
  });

  test("step unknown sim returns 404", async ({ request }) => {
    const r = await request.post(
      "http://localhost:8000/api/simulate/00000000-0000-0000-0000-000000000000/step",
    );
    expect(r.status()).toBe(404);
  });
});

test.describe("API per scenario", () => {
  for (const { id, label } of SCENARIOS) {
    test(`${label} creates and steps`, async ({ request }) => {
      const { id: simId } = await apiCreateSim(request, { scenarioId: id, algorithm: "linucb" });
      try {
        const step = await apiStep(request, simId);
        expect(step.t).toBe(1);
        expect(step.step.context).not.toBeNull();
      } finally {
        await apiDelete(request, simId);
      }
    });
  }
});

test.describe("API algorithms", () => {
  test("GET /api/algorithms returns 16 entries", async ({ request }) => {
    const r = await request.get("http://localhost:8000/api/algorithms");
    expect(r.ok()).toBe(true);
    const list = (await r.json()) as unknown[];
    expect(list.length).toBe(16);
  });
});
