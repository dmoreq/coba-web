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

describe("api.getScenarios", () => {
  it("returns mapped scenario list", async () => {
    mockFetch(200, [
      {
        id: "notification_channels",
        label: "Notification Channels",
        description: "desc",
        domain: "Marketing",
        feature_count: 2,
        arm_count: 4,
        has_drift: false,
      },
    ]);
    const scenarios = await api.getScenarios();
    expect(scenarios[0]).toEqual({
      id: "notification_channels",
      label: "Notification Channels",
      description: "desc",
      domain: "Marketing",
      featureCount: 2,
      armCount: 4,
      hasDrift: false,
    });
  });
});

describe("api.createSimulation", () => {
  it("sends POST with current request contract", async () => {
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

  it("sends scenario_id in request body", async () => {
    mockFetch(201, {
      id: "abc",
      state: { t: 0, arms: [], arm_states: [], lin_meta: [], history: [], regret_history: [] },
      algorithm: "ucb1",
      seed: 42,
      scenario_id: "news_feed",
    });
    await api.createSimulation(
      [{ id: "a", label: "A", true_prob: 0.5, light_color: "#eee" }],
      "ucb1",
      { alpha: 2.0 },
      42,
      "news_feed",
    );
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/simulate`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          arms: [{ id: "a", label: "A", true_prob: 0.5, light_color: "#eee" }],
          algorithm: "ucb1",
          hyperparams: { alpha: 2.0 },
          seed: 42,
          scenario_id: "news_feed",
        }),
      }),
    );
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

  it("fills fallback colors for scenario-driven arms", async () => {
    mockFetch(201, {
      id: "x",
      state: {
        t: 0,
        arms: [
          { id: "email", label: "Email", true_prob: 0.2, color: null, light_color: null },
          { id: "sms", label: "SMS", true_prob: 0.5, color: null, light_color: null },
        ],
        arm_states: [],
        lin_meta: [],
        algorithm: "linucb",
        history: [],
        regret_history: [],
      },
      algorithm: "linucb",
      seed: 42,
    });
    const result = await api.createSimulation(null, "linucb", { alpha: 2.0 }, 42);
    expect(result.state.arms[0].color).toBe("#228be6");
    expect(result.state.arms[0].lightColor).toBe("#e7f5ff");
    expect(result.state.arms[1].color).toBe("#12b886");
    expect(result.state.arms[1].lightColor).toBe("#e6fcf5");
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

  it("wraps non-json error responses with a config hint", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.reject(new SyntaxError("Unexpected token '<'")),
    });

    await expect(api.getScenarios()).rejects.toThrow(
      "Unexpected non-JSON response from /api/scenarios. Check NEXT_PUBLIC_API_URL or Next.js API rewrites.",
    );
  });

  it("propagates abort errors on timeout", async () => {
    vi.useFakeTimers();
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    globalThis.fetch = vi.fn().mockImplementation(async (_input, init?: RequestInit) => {
      await new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(abortError));
      });
    });

    const pending = api.getSimulation("x");
    const assertion = expect(pending).rejects.toBe(abortError);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    vi.useRealTimers();
  });
});
