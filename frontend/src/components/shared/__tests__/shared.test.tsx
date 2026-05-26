import { useSimulationRunner } from "@/hooks/useSimulationRunner";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlgorithmSelector } from "../AlgorithmSelector";
import { EmptyChart } from "../EmptyChart";
import { PlaybackControls } from "../PlaybackControls";
import { SpeedSelector } from "../SpeedSelector";
import { TruthToggle } from "../TruthToggle";

afterEach(() => {
  vi.useRealTimers();
});

describe("AlgorithmSelector", () => {
  const expectedLabels = [
    "UCB1",
    "Thompson",
    "ε-Greedy",
    "LinUCB",
    "LinTS",
    "Hybrid LinUCB",
    "SW-LinUCB",
    "Softmax",
    "Neural Linear",
    "Bootstrapped TS",
    "Bootstrapped UCB",
    "Logistic UCB",
    "Logistic TS",
    "GP-UCB",
    "RF UCB",
    "RF TS",
  ];

  it("renders all 16 algorithms", () => {
    const onChange = vi.fn();
    render(<AlgorithmSelector selected="ucb1" onChange={onChange} />);
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("active algorithm has white text and colored background", () => {
    const onChange = vi.fn();
    render(<AlgorithmSelector selected="thompson" onChange={onChange} />);
    const active = screen.getByText("Thompson");
    expect(active.style.fontWeight).toBe("600");
    expect(active.style.color).toBe("white");
  });

  it("calls onChange when clicking an algorithm", () => {
    const onChange = vi.fn();
    render(<AlgorithmSelector selected="ucb1" onChange={onChange} />);
    fireEvent.click(screen.getByText("LinTS"));
    expect(onChange).toHaveBeenCalledWith("lints");
    fireEvent.click(screen.getByText("GP-UCB"));
    expect(onChange).toHaveBeenCalledWith("gp_ucb");
  });
});

describe("SpeedSelector", () => {
  it("renders all speeds including 0.5", () => {
    const onChange = vi.fn();
    render(<SpeedSelector speeds={[0.5, 1, 2, 5, 10]} value={0.5} onChange={onChange} />);
    expect(screen.getByText("0.5×")).toBeTruthy();
    expect(screen.getByText("1×")).toBeTruthy();
    expect(screen.getByText("2×")).toBeTruthy();
    expect(screen.getByText("5×")).toBeTruthy();
    expect(screen.getByText("10×")).toBeTruthy();
  });

  it("active speed has dark background", () => {
    const onChange = vi.fn();
    render(<SpeedSelector speeds={[0.5, 1, 2, 5, 10]} value={0.5} onChange={onChange} />);
    const active = screen.getByText("0.5×");
    expect(active.style.background).toBe("rgb(33, 37, 41)");
    expect(active.style.color).toBe("white");
  });

  it("calls onChange when clicking a speed", () => {
    const onChange = vi.fn();
    render(<SpeedSelector speeds={[0.5, 1, 2, 5, 10]} value={1} onChange={onChange} />);
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
  it("calls step immediately when running", async () => {
    vi.useFakeTimers();
    const step = vi.fn().mockResolvedValue(undefined);
    function TestComponent() {
      useSimulationRunner(true, 1, step);
      return null;
    }
    render(<TestComponent />);
    // First tick fires immediately (setTimeout 0)
    await vi.advanceTimersByTimeAsync(10);
    expect(step).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("calls step at correct speed interval", async () => {
    vi.useFakeTimers();
    const step = vi.fn().mockResolvedValue(undefined);
    function TestComponent() {
      useSimulationRunner(true, 2, step);
      return null;
    }
    render(<TestComponent />);
    // speed=2 → 500ms between ticks
    await vi.advanceTimersByTimeAsync(600);
    // Should have fired at t=0 and t=500
    expect(step).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("calls step at 0.5 speed (2000ms interval)", async () => {
    vi.useFakeTimers();
    const step = vi.fn().mockResolvedValue(undefined);
    function TestComponent() {
      useSimulationRunner(true, 0.5, step);
      return null;
    }
    render(<TestComponent />);
    await vi.advanceTimersByTimeAsync(100);
    expect(step).toHaveBeenCalledTimes(1); // immediate tick
    // at 500ms — should NOT fire yet (interval is 2000ms)
    await vi.advanceTimersByTimeAsync(900);
    expect(step).toHaveBeenCalledTimes(1);
    // at 2100ms — should fire second tick
    await vi.advanceTimersByTimeAsync(1300);
    expect(step).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("stops calling step when isRunning becomes false", async () => {
    vi.useFakeTimers();
    const step = vi.fn().mockResolvedValue(undefined);
    function TestComponent({ running }: { running: boolean }) {
      useSimulationRunner(running, 10, step);
      return null;
    }
    const { rerender } = render(<TestComponent running={true} />);
    await vi.advanceTimersByTimeAsync(50);
    const callsBeforePause = step.mock.calls.length;
    rerender(<TestComponent running={false} />);
    // Allow time for any in-flight tick to complete
    await vi.advanceTimersByTimeAsync(500);
    expect(step.mock.calls.length).toBe(callsBeforePause);
    vi.useRealTimers();
  });

  it("does not call step when isRunning is false", () => {
    vi.useFakeTimers();
    const step = vi.fn();
    function TestComponent() {
      useSimulationRunner(false, 10, step);
      return null;
    }
    render(<TestComponent />);
    vi.advanceTimersByTime(1000);
    expect(step).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("handles async step without crashing", async () => {
    vi.useFakeTimers();
    const step = vi.fn().mockResolvedValue(undefined);
    function TestComponent() {
      useSimulationRunner(true, 10, step);
      return null;
    }
    render(<TestComponent />);
    await vi.advanceTimersByTimeAsync(50);
    expect(step).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
