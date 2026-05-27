import { StepFeedEntry } from "@/components/playground/StepFeedEntry";
import type { Arm, StepRecord } from "@/lib/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const arms: Arm[] = [
  { id: "a", label: "Arm A", trueProb: 0.5, color: "#111", lightColor: "#eee" },
  { id: "b", label: "Arm B", trueProb: 0.6, color: "#222", lightColor: "#ddd" },
];

const baseStep: StepRecord = {
  t: 1,
  chosenIdx: 0,
  outcome: 1,
  stepRegret: 0.1,
  cumRegret: 0.1,
  scores: [{ mean: 0.1, bonus: 0.2, score: 0.3, formula: "x" }],
  context: [0.5, -0.2],
  contextSegment: null,
  wasRandom: false,
  trueProb: 0.5,
};

describe("StepFeedEntry", () => {
  it("expands context by default for contextual algorithms", () => {
    render(
      <StepFeedEntry
        step={baseStep}
        arms={arms}
        algorithm="linucb"
        featureNames={["f0", "f1"]}
        featureLabels={["Feature 0", "Feature 1"]}
      />,
    );
    expect(screen.getByText("Arm A")).toBeInTheDocument();
    expect(screen.getByText(/0\.50/)).toBeInTheDocument();
  });

  it("reports context length mismatch when expanded", () => {
    render(
      <StepFeedEntry
        step={{ ...baseStep, context: [1] }}
        arms={arms}
        algorithm="linucb"
        featureNames={["f0", "f1"]}
        featureLabels={["Feature 0", "Feature 1"]}
      />,
    );
    expect(screen.getByText(/does not match feature count/i)).toBeInTheDocument();
  });
});
