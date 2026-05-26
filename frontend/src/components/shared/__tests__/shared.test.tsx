import { useSimulationRunner } from "@/hooks/useSimulationRunner";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlgorithmSelector } from "../AlgorithmSelector";
import { EmptyChart } from "../EmptyChart";
import { PlaybackControls } from "../PlaybackControls";
import { SpeedSelector } from "../SpeedSelector";
import { TruthToggle } from "../TruthToggle";

describe("AlgorithmSelector", () => {
  const defaultAlgos = ["ucb1", "epsilon", "thompson", "linucb"] as const;

  it("renders all algorithms", () => {
    const onChange = vi.fn();
    render(<AlgorithmSelector selected="ucb1" onChange={onChange} />);
    for (const a of defaultAlgos) {
      expect(
        screen.getByText(
          a === "epsilon"
            ? "ε-Greedy"
            : a === "ucb1"
              ? "UCB1"
              : a === "thompson"
                ? "Thompson Sampling"
                : "LinUCB",
        ),
      ).toBeTruthy();
    }
  });

  it("calls onChange when clicking an algorithm", () => {
    const onChange = vi.fn();
    render(<AlgorithmSelector selected="ucb1" onChange={onChange} />);
    fireEvent.click(screen.getByText("UCB1"));
    expect(onChange).toHaveBeenCalledWith("ucb1");
    fireEvent.click(screen.getByText("LinUCB"));
    expect(onChange).toHaveBeenCalledWith("linucb");
  });
});

describe("SpeedSelector", () => {
  it("renders all speeds", () => {
    const onChange = vi.fn();
    render(<SpeedSelector speeds={[1, 2, 5, 10]} value={2} onChange={onChange} />);
    expect(screen.getByText("1×")).toBeTruthy();
    expect(screen.getByText("2×")).toBeTruthy();
    expect(screen.getByText("5×")).toBeTruthy();
    expect(screen.getByText("10×")).toBeTruthy();
  });

  it("calls onChange when clicking a speed", () => {
    const onChange = vi.fn();
    render(<SpeedSelector speeds={[1, 2, 5, 10]} value={1} onChange={onChange} />);
    fireEvent.click(screen.getByText("5×"));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});

describe("PlaybackControls", () => {
  it("calls onStep when clicking Step", () => {
    const onStep = vi.fn();
    const onPlayPause = vi.fn();
    render(<PlaybackControls isRunning={false} onStep={onStep} onPlayPause={onPlayPause} />);
    fireEvent.click(screen.getByText(/Step/));
    expect(onStep).toHaveBeenCalled();
  });

  it("shows Pause when running", () => {
    render(<PlaybackControls isRunning={true} onStep={vi.fn()} onPlayPause={vi.fn()} />);
    expect(screen.getByText(/Pause/)).toBeTruthy();
  });

  it("shows Play when stopped", () => {
    render(<PlaybackControls isRunning={false} onStep={vi.fn()} onPlayPause={vi.fn()} />);
    expect(screen.getByText(/Play/)).toBeTruthy();
  });

  it("disables Step button when running", () => {
    render(<PlaybackControls isRunning={true} onStep={vi.fn()} onPlayPause={vi.fn()} />);
    const btn = screen.getByText(/Step/);
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("TruthToggle", () => {
  it("shows Hide truth when revealed", () => {
    render(<TruthToggle revealed={true} onToggle={vi.fn()} />);
    expect(screen.getByText(/Hide truth/)).toBeTruthy();
  });

  it("shows Reveal truth when hidden", () => {
    render(<TruthToggle revealed={false} onToggle={vi.fn()} />);
    expect(screen.getByText(/Reveal truth/)).toBeTruthy();
  });

  it("calls onToggle on click", () => {
    const onToggle = vi.fn();
    render(<TruthToggle revealed={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByText(/Reveal truth/));
    expect(onToggle).toHaveBeenCalled();
  });
});

describe("EmptyChart", () => {
  it("renders default message", () => {
    render(<EmptyChart width={200} height={100} />);
    expect(screen.getByText("Run some steps to see data")).toBeTruthy();
  });

  it("renders custom message", () => {
    render(<EmptyChart width={200} height={100} message="No pulls yet" />);
    expect(screen.getByText("No pulls yet")).toBeTruthy();
  });
});

describe("useSimulationRunner", () => {
  it("calls step repeatedly when running", async () => {
    vi.useFakeTimers();
    const step = vi.fn();
    function TestComponent() {
      useSimulationRunner(true, 10, step);
      return null;
    }
    render(<TestComponent />);
    await vi.advanceTimersByTimeAsync(200);
    expect(step).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
