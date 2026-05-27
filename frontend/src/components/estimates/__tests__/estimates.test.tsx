import { ArmRow } from "@/components/estimates/ArmRow";
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
