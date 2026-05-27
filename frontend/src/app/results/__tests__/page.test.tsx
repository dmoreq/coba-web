import ResultsPage from "@/app/results/page";
import { createDefaultSimState } from "@/lib/constants";
import { useSimulationStore } from "@/store/simulation";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/results",
}));

vi.mock("@/store/simulation", () => ({
  useSimulationStore: vi.fn(),
}));

describe("ResultsPage", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("shows empty state when t is 0", () => {
    vi.mocked(useSimulationStore).mockImplementation((selector) =>
      selector({ simState: { ...createDefaultSimState("ucb1"), t: 0 } } as never),
    );
    render(<ResultsPage />);
    expect(screen.getByText("No data yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go to Playground/i })).toBeInTheDocument();
  });

  it("navigates to playground from empty state CTA", () => {
    vi.mocked(useSimulationStore).mockImplementation((selector) =>
      selector({ simState: { ...createDefaultSimState("ucb1"), t: 0 } } as never),
    );
    render(<ResultsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Go to Playground/i }));
    expect(push).toHaveBeenCalledWith("/playground");
  });

  it("renders stats when simulation has steps", () => {
    const simState = createDefaultSimState("ucb1");
    simState.t = 5;
    simState.regretHistory = [0.1, 0.2, 0.3, 0.4, 0.5];
    simState.history = Array.from({ length: 5 }, (_, i) => ({
      t: i + 1,
      chosenIdx: 0,
      outcome: 1,
      stepRegret: 0.1,
      cumRegret: (i + 1) * 0.1,
      scores: [],
      allTrueProbs: [0.5, 0.5, 0.5],
    }));
    vi.mocked(useSimulationStore).mockImplementation((selector) => selector({ simState } as never));
    render(<ResultsPage />);
    expect(screen.queryByText("No data yet")).not.toBeInTheDocument();
    expect(screen.getByText("Cumulative regret")).toBeInTheDocument();
  });
});
