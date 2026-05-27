import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CumRewardsChart } from "../CumRewardsChart";

describe("CumRewardsChart", () => {
  it("shows empty message when history has fewer than 2 steps", () => {
    render(<CumRewardsChart history={[{ t: 1, outcome: 1 } as never]} />);
    expect(screen.getByText(/Run some steps to see rewards/)).toBeInTheDocument();
  });

  it("renders chart when history has multiple steps", () => {
    const history = [
      { t: 1, outcome: 1 },
      { t: 2, outcome: 0 },
      { t: 3, outcome: 1 },
    ] as never[];
    const { container } = render(<CumRewardsChart history={history} />);
    expect(screen.queryByText(/Run some steps/)).not.toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
