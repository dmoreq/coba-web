import { ArmRow } from "@/components/estimates/ArmRow";
import { FormulaPanel } from "@/components/estimates/FormulaPanel";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const arm = {
  id: "email",
  label: "Email",
  trueProb: 0.2,
  color: "#228be6",
  lightColor: "#e7f5ff",
};

const armState = {
  n: 5,
  successes: 2,
  failures: 3,
};

const simState = {
  arms: [arm],
  armStates: [armState],
  linMeta: [],
  algorithm: "bootstrapped_ts" as const,
  alpha: 2,
  epsilon: 0.1,
  hyperparams: { n_bootstraps: 10 },
  scenarioId: "notification_channels",
  featureNames: ["device_type", "hour"],
  featureLabels: ["Device Type", "Hour"],
  t: 3,
  history: [
    {
      t: 3,
      chosenIdx: 0,
      outcome: 1,
      stepRegret: 0.1,
      cumRegret: 0.2,
      scores: [{ mean: 0, bonus: 0, score: 0.6, formula: "ensemble_score(email)" }],
      context: [0.2, 0.8],
      contextSegment: "Morning Mobile",
      wasRandom: false,
      trueProb: 0.6,
      optimalIdx: 0,
      optimalProb: 0.6,
      allTrueProbs: [0.6],
    },
  ],
  regretHistory: [0.2],
};

describe("ArmRow", () => {
  it("renders LinUCB as decomposed even when bonus is zero", () => {
    render(
      <ArmRow
        arm={arm}
        armState={armState}
        score={{ mean: 0.4, bonus: 0, score: 0.9, formula: "x" }}
        isChosen={false}
        algorithm="linucb"
        maxScore={1}
        showGroundTruth={false}
      />,
    );

    expect(screen.getByTestId("estimate-track-email")).toBeTruthy();
    expect(screen.getByTestId("estimate-mean-email")).toBeTruthy();
    expect(screen.getByTestId("estimate-marker-email")).toBeTruthy();
    expect(screen.queryByTestId("estimate-raw-email")).toBeNull();
  });

  it("renders raw-score algorithms with a raw bar only", () => {
    render(
      <ArmRow
        arm={arm}
        armState={armState}
        score={{ mean: 0, bonus: 0, score: 0.6, formula: "x" }}
        isChosen={false}
        algorithm="bootstrapped_ts"
        maxScore={1}
        showGroundTruth={false}
      />,
    );

    expect(screen.getByTestId("estimate-raw-email")).toBeTruthy();
    expect(screen.queryByTestId("estimate-mean-email")).toBeNull();
    expect(screen.queryByTestId("estimate-marker-email")).toBeNull();
  });

  it("renders Thompson with beta curve instead of a horizontal bar", () => {
    const { container } = render(
      <ArmRow
        arm={arm}
        armState={armState}
        score={{ mean: 0.4, bonus: 0, score: 0.6, formula: "x" }}
        isChosen={false}
        algorithm="thompson"
        maxScore={1}
        showGroundTruth={false}
      />,
    );

    expect(screen.queryByTestId("estimate-track-email")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("FormulaPanel", () => {
  it("renders the centralized formula header for the algorithm family", () => {
    render(<FormulaPanel simState={simState} />);
    expect(screen.getByText("score ~ mean(θ₁..ₖ) + sample(std(θ₁..ₖ))")).toBeTruthy();
    expect(screen.getByText(/ensemble_score\(email\)/)).toBeTruthy();
  });
});
