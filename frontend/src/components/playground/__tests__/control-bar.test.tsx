import { ControlBar } from "@/components/playground/ControlBar";
import { api } from "@/lib/api";
import { DEFAULT_SEED } from "@/lib/constants";
import type { AlgorithmId, SimState } from "@/lib/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    getScenarios: vi.fn().mockResolvedValue([
      {
        id: "notification_channels",
        label: "Notification Channels",
        description: "test",
        domain: "Test",
        featureCount: 2,
        armCount: 3,
        hasDrift: false,
        recommendedAlgorithms: ["ucb1"],
      },
    ]),
  },
}));

function makeSimState(algorithm: AlgorithmId = "ucb1"): SimState {
  return {
    arms: [
      { id: "a", label: "A", trueProb: 0.5, color: "#111", lightColor: "#eee" },
      { id: "b", label: "B", trueProb: 0.6, color: "#222", lightColor: "#ddd" },
    ],
    armStates: [
      { n: 0, successes: 0, failures: 0 },
      { n: 0, successes: 0, failures: 0 },
    ],
    linMeta: [],
    algorithm,
    alpha: 2,
    epsilon: 0.1,
    hyperparams: { alpha: 2 },
    t: 0,
    featureNames: [],
    featureDescriptions: [],
    featureMins: [],
    featureMaxs: [],
    featureUnits: [],
    featureLowLabels: [],
    featureHighLabels: [],
    historyWindow: 100,
    populationSegments: [],
  };
}

describe("ControlBar", () => {
  it("renders seed input with current seed and step counter", () => {
    render(
      <ControlBar
        simState={makeSimState()}
        isRunning={false}
        speed={1}
        seed={DEFAULT_SEED}
        onSeedChange={vi.fn()}
        onPlayPause={vi.fn()}
        onStep={vi.fn()}
        onReset={vi.fn()}
        onSpeedChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("playground-seed-input")).toHaveValue(DEFAULT_SEED);
    expect(screen.getByText("t=0")).toBeInTheDocument();
  });

  it("calls onSeedChange when seed input changes", () => {
    const onSeedChange = vi.fn();
    render(
      <ControlBar
        simState={makeSimState()}
        isRunning={false}
        speed={1}
        seed={42}
        onSeedChange={onSeedChange}
        onPlayPause={vi.fn()}
        onStep={vi.fn()}
        onReset={vi.fn()}
        onSpeedChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByTestId("playground-seed-input"), {
      target: { value: "99" },
    });
    expect(onSeedChange).toHaveBeenCalledWith(99);
  });

  it("calls onReset without algo when Reset clicked", () => {
    const onReset = vi.fn();
    render(
      <ControlBar
        simState={makeSimState()}
        isRunning={false}
        speed={1}
        seed={42}
        onSeedChange={vi.fn()}
        onPlayPause={vi.fn()}
        onStep={vi.fn()}
        onReset={onReset}
        onSpeedChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Reset"));
    expect(onReset).toHaveBeenCalledWith(undefined);
  });

  it("calls onReset with algorithm when algorithm changes", () => {
    const onReset = vi.fn();
    render(
      <ControlBar
        simState={makeSimState("ucb1")}
        isRunning={false}
        speed={1}
        seed={42}
        onSeedChange={vi.fn()}
        onPlayPause={vi.fn()}
        onStep={vi.fn()}
        onReset={onReset}
        onSpeedChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("LinUCB"));
    expect(onReset).toHaveBeenCalledWith("linucb");
  });

  it("renders ScenarioPicker only when onScenarioChange provided", async () => {
    const { rerender } = render(
      <ControlBar
        simState={makeSimState()}
        isRunning={false}
        speed={1}
        seed={42}
        onSeedChange={vi.fn()}
        onPlayPause={vi.fn()}
        onStep={vi.fn()}
        onReset={vi.fn()}
        onSpeedChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("Notification Channels")).not.toBeInTheDocument();

    rerender(
      <ControlBar
        simState={makeSimState()}
        isRunning={false}
        speed={1}
        seed={42}
        onSeedChange={vi.fn()}
        onPlayPause={vi.fn()}
        onStep={vi.fn()}
        onReset={vi.fn()}
        onSpeedChange={vi.fn()}
        onScenarioChange={vi.fn()}
        scenarioId="notification_channels"
      />,
    );
    expect(vi.mocked(api.getScenarios)).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("Notification Channels")).toBeInTheDocument();
    });
  });
});
