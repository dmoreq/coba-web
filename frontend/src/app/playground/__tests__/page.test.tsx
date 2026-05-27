import PlaygroundPage from "@/app/playground/page";
import { useSimulationStore } from "@/store/simulation";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/store/simulation", () => ({
  useSimulationStore: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getScenarios: vi.fn().mockResolvedValue([
      {
        id: "notification_channels",
        label: "Channels",
        description: "",
        domain: "x",
        armCount: 3,
        featureCount: 1,
      },
    ]),
    createSimulation: vi.fn(),
    stepSimulation: vi.fn(),
    deleteSimulation: vi.fn(),
  },
}));

vi.mock("@/hooks/useSimulationRunner", () => ({
  useSimulationRunner: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/playground",
}));

describe("PlaygroundPage", () => {
  beforeEach(() => {
    vi.mocked(useSimulationStore).mockImplementation((selector) =>
      selector({
        simState: null,
        isRunning: false,
        speed: 1,
        seed: 42,
        isStepping: false,
        isRecreating: false,
        error: null,
        scenarioId: "notification_channels",
        simId: null,
        initialize: vi.fn(),
        switchScenario: vi.fn(),
        setSeed: vi.fn(),
        step: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
        setSpeed: vi.fn(),
        reset: vi.fn(),
        applySettings: vi.fn(),
        clearError: vi.fn(),
      } as never),
    );
  });

  it("renders page shell without crashing when simState is null", async () => {
    render(<PlaygroundPage />);
    await waitFor(() => {
      expect(screen.getByText(/Algo/i)).toBeInTheDocument();
    });
  });

  it("shows error banner when store has error", async () => {
    vi.mocked(useSimulationStore).mockImplementation((selector) =>
      selector({
        simState: null,
        isRunning: false,
        speed: 1,
        seed: 42,
        isStepping: false,
        isRecreating: false,
        error: "Simulation failed",
        scenarioId: "notification_channels",
        simId: null,
        initialize: vi.fn(),
        switchScenario: vi.fn(),
        setSeed: vi.fn(),
        step: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
        setSpeed: vi.fn(),
        reset: vi.fn(),
        applySettings: vi.fn(),
        clearError: vi.fn(),
      } as never),
    );
    render(<PlaygroundPage />);
    await waitFor(() => {
      expect(screen.getByText("Simulation failed")).toBeInTheDocument();
    });
  });
});
