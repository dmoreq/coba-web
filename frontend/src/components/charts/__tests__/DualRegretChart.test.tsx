import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DualRegretChart } from "../DualRegretChart";

describe("DualRegretChart", () => {
  it("pads shorter history with nulls and still renders", () => {
    const { container } = render(
      <DualRegretChart
        histA={[0.1, 0.2]}
        histB={[0.05]}
        colorA="#111"
        colorB="#222"
        labelA="UCB1"
        labelB="Thompson"
      />,
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });

  it("renders dual-series chart when histories have data", () => {
    const { container } = render(
      <DualRegretChart
        histA={[0.1, 0.2, 0.3]}
        histB={[0.05, 0.15, 0.25]}
        colorA="#228be6"
        colorB="#12b886"
        labelA="UCB1"
        labelB="Thompson"
      />,
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
