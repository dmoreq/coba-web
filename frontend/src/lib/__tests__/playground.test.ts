import {
  formatEstimateStat,
  getCurrentTrueProb,
  getEstimateLegend,
  getEstimateRenderMode,
  getFormulaLabel,
  getWhyText,
  isBestArmRightNow,
} from "@/lib/constants";
import type { SimState } from "@/lib/types";
import { describe, expect, it } from "vitest";

function makeState(): SimState {
  return {
    arms: [
      { id: "a", label: "A", trueProb: 0.2, color: "#111111", lightColor: "#eeeeee" },
      { id: "b", label: "B", trueProb: 0.8, color: "#222222", lightColor: "#dddddd" },
    ],
    armStates: [
      { n: 4, successes: 1, failures: 3 },
      { n: 4, successes: 3, failures: 1 },
    ],
    linMeta: [],
    algorithm: "linucb",
    alpha: 2,
    epsilon: 0.1,
    hyperparams: { alpha: 2 },
    scenarioId: "notification_channels",
    featureNames: ["mobile_usage", "recency_days"],
    featureLabels: ["Mobile Usage", "Recency"],
    t: 8,
    history: [
      {
        t: 8,
        chosenIdx: 1,
        outcome: 1,
        stepRegret: 0,
        cumRegret: 0.3,
        scores: [
          { mean: 0.1, bonus: 0.2, score: 0.3, formula: "x" },
          { mean: 0.6, bonus: 0.1, score: 0.7, formula: "y" },
        ],
        context: [0.5, -0.3],
        contextSegment: "Mobile Active",
        wasRandom: false,
        trueProb: 0.9,
        optimalIdx: 1,
        optimalProb: 0.9,
        allTrueProbs: [0.1, 0.9],
      },
    ],
    regretHistory: [0.3],
  };
}

describe("getCurrentTrueProb", () => {
  it("prefers contextual per-step truth when available", () => {
    expect(getCurrentTrueProb(makeState(), 0)).toBe(0.1);
    expect(getCurrentTrueProb(makeState(), 1)).toBe(0.9);
  });

  it("falls back to static arm truth without step-level probabilities", () => {
    const state = makeState();
    state.history[0].allTrueProbs = null;
    expect(getCurrentTrueProb(state, 0)).toBe(0.2);
  });
});

describe("isBestArmRightNow", () => {
  it("uses contextual truth when available", () => {
    expect(isBestArmRightNow(makeState(), 0)).toBe(false);
    expect(isBestArmRightNow(makeState(), 1)).toBe(true);
  });

  it("falls back to empirical mean without contextual truth", () => {
    const state = makeState();
    state.history[0].allTrueProbs = null;
    expect(isBestArmRightNow(state, 1)).toBe(true);
  });
});

describe("getEstimateRenderMode", () => {
  it("uses beta mode for thompson", () => {
    expect(
      getEstimateRenderMode("thompson", { mean: 0.4, bonus: 0, score: 0.5, formula: "" }),
    ).toBe("beta");
  });

  it("uses decomposed mode when a bonus exists", () => {
    expect(
      getEstimateRenderMode("linucb", { mean: 0.4, bonus: 0.2, score: 0.6, formula: "" }),
    ).toBe("decomposed");
  });

  it("keeps LinUCB in decomposed mode even when the current arm bonus is zero", () => {
    expect(getEstimateRenderMode("linucb", { mean: 0.4, bonus: 0, score: 0.6, formula: "" })).toBe(
      "decomposed",
    );
  });

  it("uses raw mode when no decomposition exists", () => {
    expect(
      getEstimateRenderMode("bootstrapped_ts", { mean: 0, bonus: 0, score: 0.6, formula: "" }),
    ).toBe("raw");
  });
});

describe("formatEstimateStat", () => {
  it("shows thompson score when sample is unavailable", () => {
    expect(
      formatEstimateStat(
        "thompson",
        { mean: 0.4, bonus: 0, score: 0.7, formula: "" },
        { n: 3, successes: 2, failures: 1 },
      ),
    ).toBe("μ=0.400 score=0.700");
  });

  it("shows mean plus bonus for decomposed scores", () => {
    expect(
      formatEstimateStat(
        "linucb",
        { mean: 0.4, bonus: 0.2, score: 0.6, formula: "" },
        { n: 3, successes: 2, failures: 1 },
      ),
    ).toBe("0.400 + 0.200");
  });

  it("shows raw score when no breakdown exists", () => {
    expect(
      formatEstimateStat(
        "bootstrapped_ts",
        { mean: 0, bonus: 0, score: 0.6, formula: "" },
        { n: 3, successes: 2, failures: 1 },
      ),
    ).toBe("score=0.600");
  });
});

describe("shared copy helpers", () => {
  it("returns the centralized formula header for formula panel consumers", () => {
    expect(getFormulaLabel("bootstrapped_ts")).toContain("mean(θ₁..ₖ)");
  });

  it("returns the centralized legend for raw-score families", () => {
    expect(getEstimateLegend("bootstrapped_ts")).toEqual({
      primary: "Policy score",
    });
  });

  it("returns WhyPanel copy from the shared family mapping", () => {
    expect(getWhyText(makeState())).toContain("highest LinUCB score for this context");
    expect(
      getWhyText({ ...makeState(), algorithm: "softmax", hyperparams: { softmax_tau: 0.8 } }),
    ).toContain("softmax distribution over policy scores");
  });
});
