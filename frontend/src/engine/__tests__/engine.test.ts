import { describe, expect, it } from "vitest";
import { ALGO_META, DEFAULT_ARMS } from "../constants";
import { createInitialSimState } from "../init";
import { dot2, inv2x2, matVec2, sampleBeta, sigmoid } from "../math";
import { makeRng } from "../rng";
import { scoreEpsilon, scoreLinUCB, scoreThompson, scoreUCB1 } from "../scores";
import { runStep } from "../step";
import type { ArmState, LinMeta } from "../types";

// ── math.ts ─────────────────────────────────────────────────────────

describe("sigmoid", () => {
  it("returns 0.5 for x=0", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5);
  });

  it("returns near 0 for large negative", () => {
    expect(sigmoid(-10)).toBeCloseTo(0, 4);
  });

  it("returns near 1 for large positive", () => {
    expect(sigmoid(10)).toBeCloseTo(1, 4);
  });

  it("is monotonic", () => {
    for (let i = -5; i <= 5; i++) {
      expect(sigmoid(i)).toBeLessThan(sigmoid(i + 0.1));
    }
  });
});

describe("sampleBeta", () => {
  it("returns a value in (0, 1)", () => {
    for (let i = 0; i < 100; i++) {
      const s = sampleBeta(5, 5);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(1);
    }
  });

  it("mean converges to alpha/(alpha+beta) over many samples", () => {
    const alpha = 8;
    const beta = 2;
    let sum = 0;
    for (let i = 0; i < 10000; i++) sum += sampleBeta(alpha, beta);
    const avg = sum / 10000;
    expect(avg).toBeCloseTo(alpha / (alpha + beta), 1);
  });
});

describe("inv2x2", () => {
  it("inverts identity to identity", () => {
    const I: [[number, number], [number, number]] = [
      [1, 0],
      [0, 1],
    ];
    const inv = inv2x2(I);
    expect(inv[0][0]).toBeCloseTo(1);
    expect(inv[1][1]).toBeCloseTo(1);
    expect(inv[0][1]).toBeCloseTo(0);
    expect(inv[1][0]).toBeCloseTo(0);
  });

  it("A × A⁻¹ ≈ I", () => {
    const A: [[number, number], [number, number]] = [
      [2, 1],
      [1, 3],
    ];
    const inv = inv2x2(A);
    const result = matVec2(inv, [A[0][0], A[1][0]]);
    expect(result[0]).toBeCloseTo(1, 2);
    expect(result[1]).toBeCloseTo(0, 2);
  });

  it("returns identity for singular matrix", () => {
    const singular: [[number, number], [number, number]] = [
      [0, 0],
      [0, 0],
    ];
    const inv = inv2x2(singular);
    expect(inv[0][0]).toBe(1);
    expect(inv[1][1]).toBe(1);
  });
});

describe("matVec2", () => {
  it("multiplies 2x2 by 2-vector correctly", () => {
    const M: [[number, number], [number, number]] = [
      [1, 2],
      [3, 4],
    ];
    const v: [number, number] = [5, 6];
    const result = matVec2(M, v);
    expect(result[0]).toBe(1 * 5 + 2 * 6);
    expect(result[1]).toBe(3 * 5 + 4 * 6);
  });
});

describe("dot2", () => {
  it("computes dot product correctly", () => {
    expect(dot2([1, 2], [3, 4])).toBe(1 * 3 + 2 * 4);
  });
});

// ── rng.ts ───────────────────────────────────────────────────────────

describe("makeRng", () => {
  it("produces deterministic sequence with same seed", () => {
    const rng1 = makeRng(42);
    const rng2 = makeRng(42);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it("produces values in [0, 1)", () => {
    const rng = makeRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different seeds produce different sequences", () => {
    const rng1 = makeRng(42);
    const rng2 = makeRng(99);
    const first1 = rng1();
    const first2 = rng2();
    expect(first1).not.toBe(first2);
  });
});

// ── scores.ts ────────────────────────────────────────────────────────

describe("scoreUCB1", () => {
  it("returns bonus=99 for n=0", () => {
    const state: ArmState = { n: 0, successes: 0, failures: 0 };
    const result = scoreUCB1(state, 1, 2.0);
    expect(result.bonus).toBe(99);
    expect(result.score).toBe(99);
  });

  it("bonus decreases as n increases", () => {
    const state1: ArmState = { n: 1, successes: 1, failures: 0 };
    const state2: ArmState = { n: 100, successes: 50, failures: 50 };
    const s1 = scoreUCB1(state1, 100, 2.0);
    const s2 = scoreUCB1(state2, 100, 2.0);
    expect(s2.bonus).toBeLessThan(s1.bonus);
  });

  it("mean = successes / n", () => {
    const state: ArmState = { n: 10, successes: 7, failures: 3 };
    const result = scoreUCB1(state, 10, 2.0);
    expect(result.mean).toBe(0.7);
  });
});

describe("scoreEpsilon", () => {
  it("returns 0 for n=0", () => {
    const state: ArmState = { n: 0, successes: 0, failures: 0 };
    const result = scoreEpsilon(state);
    expect(result.mean).toBe(0);
    expect(result.score).toBe(0);
  });

  it("mean = successes / n", () => {
    const state: ArmState = { n: 10, successes: 7, failures: 3 };
    const result = scoreEpsilon(state);
    expect(result.mean).toBe(0.7);
  });
});

describe("scoreThompson", () => {
  it("produces score in (0,1)", () => {
    const state: ArmState = { n: 5, successes: 3, failures: 2 };
    for (let i = 0; i < 50; i++) {
      const result = scoreThompson(state);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(1);
    }
  });
});

describe("scoreLinUCB", () => {
  it("returns a finite score with identity A and zero b", () => {
    const meta: LinMeta = {
      A: [
        [1, 0],
        [0, 1],
      ],
      b: [0, 0],
    };
    const result = scoreLinUCB(meta, [0.5, -0.3], 2.0);
    expect(result.score).not.toBeNaN();
    expect(result.score).not.toBe(Number.POSITIVE_INFINITY);
    expect(result.bonus).toBeGreaterThan(0);
  });
});

// ── constants.ts ────────────────────────────────────────────────────

describe("DEFAULT_ARMS", () => {
  it("has 3 arms with distinct IDs", () => {
    expect(DEFAULT_ARMS).toHaveLength(3);
    const ids = DEFAULT_ARMS.map((a) => a.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("trueProb values are between 0 and 1", () => {
    for (const arm of DEFAULT_ARMS) {
      expect(arm.trueProb).toBeGreaterThan(0);
      expect(arm.trueProb).toBeLessThan(1);
    }
  });
});

describe("ALGO_META", () => {
  it("has entries for all 4 algorithms", () => {
    expect(Object.keys(ALGO_META).sort()).toEqual(["epsilon", "linucb", "thompson", "ucb1"]);
  });
});

// ── init.ts + step.ts (integration) ─────────────────────────────────

describe("createInitialSimState", () => {
  it("starts at t=0 with empty history", () => {
    const state = createInitialSimState();
    expect(state.t).toBe(0);
    expect(state.history).toHaveLength(0);
    expect(state.regretHistory).toHaveLength(0);
  });

  it("initializes arm states with zeros", () => {
    const state = createInitialSimState();
    for (const s of state.armStates) {
      expect(s.n).toBe(0);
      expect(s.successes).toBe(0);
      expect(s.failures).toBe(0);
    }
  });

  it("initializes LinUCB meta with identity A and zero b", () => {
    const state = createInitialSimState(DEFAULT_ARMS, "linucb");
    for (const meta of state.linMeta) {
      expect(meta.A[0][0]).toBe(1);
      expect(meta.A[1][1]).toBe(1);
      expect(meta.A[0][1]).toBe(0);
      expect(meta.A[1][0]).toBe(0);
      expect(meta.b[0]).toBe(0);
      expect(meta.b[1]).toBe(0);
    }
  });
});

describe("runStep integration", () => {
  it("increments t by 1 each step", () => {
    const rng = makeRng(42);
    let state = createInitialSimState(DEFAULT_ARMS, "ucb1");
    for (let i = 1; i <= 5; i++) {
      state = runStep(state, rng);
      expect(state.t).toBe(i);
    }
  });

  it("appends to history up to 150 entries", () => {
    const rng = makeRng(42);
    let state = createInitialSimState(DEFAULT_ARMS, "ucb1");
    for (let i = 0; i < 200; i++) {
      state = runStep(state, rng);
    }
    expect(state.history.length).toBeLessThanOrEqual(150);
  });

  it("regret is non-decreasing", () => {
    const rng = makeRng(42);
    let state = createInitialSimState(DEFAULT_ARMS, "ucb1");
    let prev = 0;
    for (let i = 0; i < 50; i++) {
      state = runStep(state, rng);
      const current = state.regretHistory[state.regretHistory.length - 1];
      expect(current).toBeGreaterThanOrEqual(prev);
      prev = current;
    }
  });

  it("total pulls across arms equals t", () => {
    const rng = makeRng(42);
    let state = createInitialSimState(DEFAULT_ARMS, "ucb1");
    for (let i = 0; i < 50; i++) {
      state = runStep(state, rng);
    }
    const totalPulls = state.armStates.reduce((s, a) => s + a.n, 0);
    expect(totalPulls).toBe(50);
  });

  it("SMS (best arm with 0.8 prob) gets > 30% of pulls by step 200", () => {
    const rng = makeRng(42);
    let state = createInitialSimState(DEFAULT_ARMS, "ucb1");
    for (let i = 0; i < 200; i++) {
      state = runStep(state, rng);
    }
    const smsIdx = 1; // SMS is DEFAULT_ARMS[1]
    const smsPct = state.armStates[smsIdx].n / 200;
    expect(smsPct).toBeGreaterThan(0.3);
  });

  it("is deterministic with same seed", () => {
    let state1 = createInitialSimState(DEFAULT_ARMS, "ucb1");
    const rng1 = makeRng(42);
    for (let i = 0; i < 20; i++) state1 = runStep(state1, rng1);

    let state2 = createInitialSimState(DEFAULT_ARMS, "ucb1");
    const rng2 = makeRng(42);
    for (let i = 0; i < 20; i++) state2 = runStep(state2, rng2);

    expect(state1.history.map((h) => h.chosenIdx)).toEqual(state2.history.map((h) => h.chosenIdx));
  });

  it("handles all 4 algorithms without errors", () => {
    for (const algo of ["ucb1", "epsilon", "thompson", "linucb"] as const) {
      const rng = makeRng(42);
      let state = createInitialSimState(DEFAULT_ARMS, algo);
      for (let i = 0; i < 30; i++) {
        state = runStep(state, rng);
      }
      expect(state.t).toBe(30);
      expect(state.history.length).toBe(30);
    }
  });
});
