import { api } from "@/lib/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSimulationStore } from "../simulation";

vi.mock("@/lib/api", () => ({
  api: {
    createSimulation: vi.fn(),
    step: vi.fn(),
    getSimulation: vi.fn(),
    deleteSimulation: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      detail: string,
    ) {
      super(detail);
    }
  },
}));

const mockArms = [
  { id: "a", label: "A", trueProb: 0.3, color: "#228be6", lightColor: "#e7f5ff" },
  { id: "b", label: "B", trueProb: 0.5, color: "#12b886", lightColor: "#e6fcf5" },
];

const mockSimResponse = (t: number) => ({
  id: "sim-123",
  state: {
    t,
    arms: mockArms,
    armStates: [
      {
        n: t > 0 ? Math.floor(t / 2) : 0,
        successes: Math.floor(t / 3),
        failures: Math.floor(t / 6),
      },
      { n: t > 0 ? Math.ceil(t / 2) : 0, successes: Math.floor(t / 4), failures: Math.ceil(t / 4) },
    ],
    linMeta: [
      {
        A: [
          [1, 0],
          [0, 1],
        ],
        b: [0, 0],
      },
      {
        A: [
          [1, 0],
          [0, 1],
        ],
        b: [0, 0],
      },
    ],
    algorithm: "ucb1",
    alpha: 2.0,
    epsilon: 0.1,
    history:
      t > 0
        ? [
            {
              t: 1,
              chosenIdx: 0,
              outcome: 1,
              stepRegret: 0,
              cumRegret: 0,
              scores: [],
              context: null,
              wasRandom: false,
              trueProb: 0.5,
            },
          ]
        : [],
    regretHistory: t > 0 ? [0] : [],
  },
  algorithm: "ucb1",
  seed: 42,
});

const mockStepResponse = {
  t: 2,
  step: {
    t: 2,
    chosenIdx: 1,
    outcome: 1,
    stepRegret: 0.1,
    cumRegret: 0.1,
    scores: [],
    wasRandom: false,
    trueProb: 0.5,
  },
  armStates: [],
  regretHistory: [0, 0.1],
};

beforeEach(() => {
  useSimulationStore.setState({
    simId: null,
    simState: null,
    isRunning: false,
    speed: 2,
    seed: 42,
    isLoading: false,
    error: null,
  });
  (api.deleteSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  vi.clearAllMocks();
});

describe("simulation store", () => {
  it("initialize creates simulation via API", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "ucb1", 2.0, 0.1);
    const state = useSimulationStore.getState();
    expect(state.simId).toBe("sim-123");
    expect(state.simState?.t).toBe(0);
    expect(api.createSimulation).toHaveBeenCalledTimes(1);
  });

  it("initialize sets loading state", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    const promise = useSimulationStore.getState().initialize(mockArms, "ucb1", 2.0, 0.1);
    expect(useSimulationStore.getState().isLoading).toBe(true);
    await promise;
    expect(useSimulationStore.getState().isLoading).toBe(false);
  });

  it("step calls API and updates state", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "ucb1", 2.0, 0.1);

    (api.step as ReturnType<typeof vi.fn>).mockResolvedValue(mockStepResponse);

    await useSimulationStore.getState().step();
    expect(api.step).toHaveBeenCalledWith("sim-123");
    // verify state is updated from step response (no getSimulation call needed)
    const state = useSimulationStore.getState();
    expect(state.simState?.t).toBe(2);
    expect(state.simState?.history.length).toBe(1);
  });

  it("play/pause toggle isRunning", () => {
    useSimulationStore.getState().play();
    expect(useSimulationStore.getState().isRunning).toBe(true);
    useSimulationStore.getState().pause();
    expect(useSimulationStore.getState().isRunning).toBe(false);
  });

  it("setSpeed updates speed", () => {
    useSimulationStore.getState().setSpeed(5);
    expect(useSimulationStore.getState().speed).toBe(5);
  });

  it("setSeed updates seed", () => {
    useSimulationStore.getState().setSeed(99);
    expect(useSimulationStore.getState().seed).toBe(99);
  });

  it("reset creates new simulation", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "ucb1", 2.0, 0.1);

    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSimResponse(0));
    await useSimulationStore.getState().reset("thompson");
    // createSimulation called with (arms, algorithm, hyperparams, seed)
    expect(api.createSimulation).toHaveBeenCalledWith(
      expect.any(Array),
      "thompson",
      expect.any(Object),
      expect.any(Number),
    );
  });

  it("applySettings creates new simulation", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore
      .getState()
      .applySettings({ arms: mockArms, algorithm: "thompson", alpha: 1.5, epsilon: 0.2 });
    expect(api.createSimulation).toHaveBeenCalledTimes(1);
    expect(api.createSimulation).toHaveBeenCalledWith(
      expect.any(Array),
      "thompson",
      { alpha: 1.5, epsilon: 0.2 },
      expect.any(Number),
    );
  });

  it("does not have rngRef", () => {
    const state = useSimulationStore.getState();
    expect("rngRef" in state).toBe(false);
  });

  it("clearError resets error", () => {
    useSimulationStore.setState({ error: "Something went wrong" });
    useSimulationStore.getState().clearError();
    expect(useSimulationStore.getState().error).toBeNull();
  });
});
