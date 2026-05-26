import { describe, expect, it } from "vitest";
import {
  ALGO_META,
  ALGORITHM_ORDER,
  DEFAULT_HYPERPARAMS,
  HYPERPARAM_META,
  createDefaultSimState,
} from "@/lib/constants";

describe("ALGO_META", () => {
  it("has exactly 16 algorithms", () => {
    expect(Object.keys(ALGO_META)).toHaveLength(16);
  });

  it("every algo has label, color, light, desc, hyperparams", () => {
    for (const [id, meta] of Object.entries(ALGO_META)) {
      expect(meta.label).toBeTruthy();
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(meta.light).toMatch(/^#[0-9a-f]{6}$/);
      expect(meta.desc).toBeTruthy();
      expect(Array.isArray(meta.hyperparams)).toBe(true);
    }
  });
});

describe("ALGORITHM_ORDER", () => {
  it("contains exactly 16 entries", () => {
    expect(ALGORITHM_ORDER).toHaveLength(16);
    expect(new Set(ALGORITHM_ORDER).size).toBe(16);
  });

  it("starts with context-free algorithms", () => {
    expect(ALGORITHM_ORDER.slice(0, 3)).toEqual([
      "ucb1",
      "thompson",
      "epsilon_greedy",
    ]);
  });
});

describe("DEFAULT_HYPERPARAMS", () => {
  it("has an entry for every ALGO_META key", () => {
    const algoKeys = Object.keys(ALGO_META);
    const paramsKeys = Object.keys(DEFAULT_HYPERPARAMS);
    expect(paramsKeys.sort()).toEqual(algoKeys.sort());
  });

  it("each algo's hyperparams match ALGO_META[algo].hyperparams keys", () => {
    for (const [id, meta] of Object.entries(ALGO_META)) {
      const defaults = DEFAULT_HYPERPARAMS[id as keyof typeof DEFAULT_HYPERPARAMS];
      const expectedKeys = meta.hyperparams;
      const actualKeys = Object.keys(defaults);
      // All expected keys must be present; extra keys are not disallowed
      for (const key of expectedKeys) {
        expect(actualKeys).toContain(key);
      }
    }
  });

  it("thompson has empty hyperparams", () => {
    expect(DEFAULT_HYPERPARAMS.thompson).toEqual({});
  });

  it("every hyperparam key has a corresponding HYPERPARAM_META entry", () => {
    const allKeys = new Set<string>();
    for (const defaults of Object.values(DEFAULT_HYPERPARAMS)) {
      for (const key of Object.keys(defaults)) {
        allKeys.add(key);
      }
    }
    for (const key of allKeys) {
      expect(HYPERPARAM_META[key]).toBeDefined();
    }
  });
});

describe("HYPERPARAM_META", () => {
  it("epsilon.format returns percentage", () => {
    const result = HYPERPARAM_META.epsilon.format?.(0.25);
    expect(result).toBe("25%");
  });

  it("n_clusters.format returns integer string", () => {
    const result = HYPERPARAM_META.n_clusters.format?.(5);
    expect(result).toBe("5");
  });

  it("n_bootstraps.format returns integer string", () => {
    const result = HYPERPARAM_META.n_bootstraps.format?.(10);
    expect(result).toBe("10");
  });
});

describe("createDefaultSimState", () => {
  it("returns state with matching hyperparams for ucb1", () => {
    const state = createDefaultSimState("ucb1");
    expect(state.hyperparams).toEqual({ alpha: 2.0 });
    expect(state.alpha).toBe(2.0);
    expect(state.epsilon).toBe(0.1);
  });

  it("returns state with matching hyperparams for thompson", () => {
    const state = createDefaultSimState("thompson");
    expect(state.hyperparams).toEqual({});
    expect(state.algorithm).toBe("thompson");
  });

  it("returns state with matching hyperparams for linucb", () => {
    const state = createDefaultSimState("linucb");
    expect(state.hyperparams).toEqual({
      alpha: 2.0,
      l2_lambda: 1.0,
      gamma: 1.0,
      n_clusters: 5,
    });
  });

  it("works for all 16 algorithm IDs", () => {
    for (const algo of ALGORITHM_ORDER) {
      const state = createDefaultSimState(algo);
      expect(state.algorithm).toBe(algo);
      expect(state.hyperparams).toEqual(DEFAULT_HYPERPARAMS[algo]);
    }
  });

  it("returns fresh objects (no shared mutation)", () => {
    const a = createDefaultSimState("linucb");
    const b = createDefaultSimState("linucb");
    expect(a.hyperparams).toEqual(b.hyperparams);
    expect(a.hyperparams).not.toBe(b.hyperparams);
  });
});
