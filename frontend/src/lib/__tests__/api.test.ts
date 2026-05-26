import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../api";

const BASE = "http://localhost:8000";

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(status: number, json: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(json),
  });
}

describe("api.health", () => {
  it("calls GET /api/health", async () => {
    mockFetch(200, { status: "ok" });
    expect(await api.health()).toBe(true);
  });
});

describe("api.getAlgorithms", () => {
  it("returns mapped algorithm list", async () => {
    mockFetch(200, [{ id: "ucb1", label: "UCB1", description: "desc", hyperparams: ["alpha"] }]);
    const algos = await api.getAlgorithms();
    expect(algos[0].id).toBe("ucb1");
  });
});

describe("api.createSimulation", () => {
  it("sends POST with 4 args", async () => {
    mockFetch(201, {
      id: "abc",
      state: { t: 0, arms: [], arm_states: [], lin_meta: [], history: [], regret_history: [] },
      algorithm: "ucb1",
      seed: 42,
    });
    const result = await api.createSimulation(
      [{ id: "a", label: "A", true_prob: 0.5 }],
      "ucb1",
      { alpha: 2.0 },
      42,
    );
    expect(result.id).toBe("abc");
    expect(result.state.t).toBe(0);
  });

  it("maps nested snake_case to camelCase", async () => {
    mockFetch(201, {
      id: "x",
      state: {
        t: 5,
        arms: [],
        arm_states: [{ n: 1, successes: 1, failures: 0 }],
        lin_meta: [],
        algorithm: "ucb1",
        alpha: 2.0,
        epsilon: 0.1,
        history: [
          {
            t: 1,
            chosen_idx: 0,
            outcome: 1,
            step_regret: 0,
            cum_regret: 0,
            scores: [{ mean: 0.5, bonus: 0.1, score: 0.6, formula: "x" }],
            context: null,
            was_random: false,
            true_prob: 0.8,
          },
        ],
        regret_history: [0],
      },
      algorithm: "ucb1",
      seed: 42,
    });
    const result = await api.createSimulation(
      [
        { id: "a", label: "A", true_prob: 0.5 },
        { id: "b", label: "B", true_prob: 0.6 },
      ],
      "ucb1",
      { alpha: 2.0 },
      42,
    );
    expect(result.state.armStates[0].n).toBe(1);
    expect(result.state.history[0].chosenIdx).toBe(0);
    expect(result.state.history[0].scores[0].mean).toBe(0.5);
    expect(result.state.regretHistory).toEqual([0]);
  });
});

describe("api.step", () => {
  it("calls POST with sim id", async () => {
    mockFetch(200, {
      t: 1,
      step: {
        t: 1,
        chosen_idx: 0,
        outcome: 1,
        step_regret: 0,
        cum_regret: 0,
        scores: [],
        was_random: false,
        true_prob: 0.5,
      },
      arm_states: [],
      regret_history: [],
    });
    const r = await api.step("abc");
    expect(r.t).toBe(1);
    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/simulate/abc/step`, expect.any(Object));
  });

  it("returns properly typed step record and state", async () => {
    mockFetch(200, {
      t: 2,
      step: {
        t: 2,
        chosen_idx: 1,
        outcome: 1,
        step_regret: 0.1,
        cum_regret: 0.1,
        scores: [{ mean: 0.5, bonus: 0.1, score: 0.6, formula: "test" }],
        context: null,
        was_random: false,
        true_prob: 0.8,
      },
      arm_states: [{ n: 1, successes: 1, failures: 0 }],
      regret_history: [0, 0.1],
    });
    const r = await api.step("abc");
    // Verify step record is properly typed
    expect(r.step.t).toBe(2);
    expect(r.step.chosenIdx).toBe(1);
    expect(r.step.stepRegret).toBe(0.1);
    // Verify armStates are properly typed
    expect(r.armStates[0].n).toBe(1);
    expect(r.armStates[0].successes).toBe(1);
    // Verify regretHistory is array of numbers
    expect(r.regretHistory).toEqual([0, 0.1]);
  });
});

describe("api.run", () => {
  it("sends steps in body", async () => {
    mockFetch(200, { steps_run: 10, final_t: 10, history: [], regret_history: [], arm_states: [] });
    const r = await api.run("abc", 10);
    expect(r.stepsRun).toBe(10);
  });
});

describe("api.deleteSimulation", () => {
  it("calls DELETE", async () => {
    mockFetch(204, undefined);
    await api.deleteSimulation("abc");
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/simulate/abc`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("api.getResults", () => {
  it("returns mapped results", async () => {
    mockFetch(200, {
      total_steps: 50,
      cumulative_regret: 1.2,
      avg_reward: 0.5,
      best_arm_found: "B",
      accuracy_table: [{ arm: "A", estimated: 0.3, true: 0.5, error: 0.2, pulls: 30 }],
      narrative: "Done.",
    });
    const r = await api.getResults("abc");
    expect(r.totalSteps).toBe(50);
    expect(r.accuracyTable[0].estimated).toBe(0.3);
  });
});

describe("ApiError", () => {
  it("throws on HTTP error", async () => {
    mockFetch(404, { detail: "Not found" });
    await expect(api.getSimulation("x")).rejects.toThrow(ApiError);
  });
});
