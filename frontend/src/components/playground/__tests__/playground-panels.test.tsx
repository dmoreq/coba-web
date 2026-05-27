import { UCBDisplay } from "@/components/estimates/UCBDisplay";
import { EnvPanel } from "@/components/playground/EnvPanel";
import { WhyPanel } from "@/components/playground/WhyPanel";
import type { SimState } from "@/lib/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

function makeState(algorithm: SimState["algorithm"] = "linucb"): SimState {
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
    algorithm,
    alpha: 2,
    epsilon: 0.1,
    hyperparams:
      algorithm === "softmax"
        ? { softmax_tau: 1 }
        : algorithm === "bootstrapped_ts"
          ? { n_bootstraps: 10 }
          : { alpha: 2 },
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
        scores:
          algorithm === "bootstrapped_ts"
            ? [
                { mean: 0, bonus: 0, score: 0.2, formula: "x" },
                { mean: 0, bonus: 0, score: 0.8, formula: "y" },
              ]
            : [
                { mean: 0.1, bonus: 0.2, score: 0.3, formula: "x" },
                { mean: 0.6, bonus: 0, score: 0.7, formula: "y" },
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

describe("EnvPanel", () => {
  it("shows current contextual truth instead of static trueProb", () => {
    render(<EnvPanel simState={makeState()} showGroundTruth={true} onToggle={vi.fn()} />);
    expect(screen.getByText("10%")).toBeTruthy();
    expect(screen.getByText("90%")).toBeTruthy();
    expect(screen.getByText("best now")).toBeTruthy();
  });
});

describe("UCBDisplay", () => {
  it("shows mean/breakdown legend for LinUCB even if one arm has zero bonus", () => {
    render(<UCBDisplay simState={makeState("linucb")} showGroundTruth={false} />);
    expect(screen.getByText("Mean estimate")).toBeTruthy();
    expect(screen.getByText("Exploration bonus")).toBeTruthy();
    expect(screen.queryByText("Policy score")).toBeNull();
  });

  it("shows policy-score legend for raw-score families", () => {
    render(<UCBDisplay simState={makeState("bootstrapped_ts")} showGroundTruth={false} />);
    expect(screen.getByText("Policy score")).toBeTruthy();
    expect(screen.queryByText("Mean estimate")).toBeNull();
  });
});

describe("WhyPanel", () => {
  it("renders LinUCB copy from the shared presentation model", () => {
    render(<WhyPanel simState={makeState("linucb")} />);
    expect(screen.getByText(/highest LinUCB score for this context/i)).toBeTruthy();
    expect(screen.getByText(/uncertainty bonus: 0.000/i)).toBeTruthy();
  });

  it("renders softmax-specific copy from the shared presentation model", () => {
    render(<WhyPanel simState={makeState("softmax")} />);
    expect(screen.getByText(/softmax distribution over policy scores/i)).toBeTruthy();
    expect(screen.getByText(/temperature τ=1.0/i)).toBeTruthy();
  });
});
