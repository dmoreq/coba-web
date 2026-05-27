import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PullDistChart } from "../PullDistChart";

const arms = [
  { id: "a", label: "Email", trueProb: 0.5, color: "#111", lightColor: "#eee" },
  { id: "b", label: "SMS", trueProb: 0.5, color: "#222", lightColor: "#ddd" },
];

describe("PullDistChart", () => {
  it("shows empty message when no pulls", () => {
    render(
      <PullDistChart
        arms={arms}
        armStates={[
          { n: 0, successes: 0, failures: 0 },
          { n: 0, successes: 0, failures: 0 },
        ]}
      />,
    );
    expect(screen.getByText(/No pulls yet/)).toBeInTheDocument();
  });

  it("renders bar chart when pulls exist", () => {
    const { container } = render(
      <PullDistChart
        arms={arms}
        armStates={[
          { n: 3, successes: 1, failures: 2 },
          { n: 7, successes: 4, failures: 3 },
        ]}
      />,
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
