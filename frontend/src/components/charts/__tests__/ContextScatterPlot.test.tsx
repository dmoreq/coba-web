import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContextScatterPlot } from "../ContextScatterPlot";

const arms = [
  { id: "a", label: "A", trueProb: 0.5, color: "#228be6", lightColor: "#e7f5ff" },
  { id: "b", label: "B", trueProb: 0.5, color: "#12b886", lightColor: "#e6fcf5" },
];

const history = [
  {
    t: 1,
    chosenIdx: 0,
    outcome: 1,
    stepRegret: 0,
    cumRegret: 0,
    scores: [],
    context: [0.2, -0.3],
    wasRandom: false,
    trueProb: 0.5,
  },
];

describe("ContextScatterPlot", () => {
  it("uses fixed axis bounds from featureMins and featureMaxs", () => {
    render(
      <ContextScatterPlot
        history={history}
        arms={arms}
        featureNames={["x", "y"]}
        featureLabels={["X", "Y"]}
        featureMins={[-1, -1]}
        featureMaxs={[1, 1]}
      />,
    );
    expect(screen.getByTestId("x-axis-min")).toHaveTextContent("-1.00");
    expect(screen.getByTestId("x-axis-max")).toHaveTextContent("1.00");
  });

  it("shows history window subtitle when totalSteps and historyWindow provided", () => {
    render(
      <ContextScatterPlot
        history={history}
        arms={arms}
        featureNames={["x", "y"]}
        featureLabels={["X", "Y"]}
        featureMins={[-1, -1]}
        featureMaxs={[1, 1]}
        totalSteps={200}
        historyWindow={150}
      />,
    );
    expect(screen.getByText("Showing last 150 steps (total: 200)")).toBeInTheDocument();
  });
});
