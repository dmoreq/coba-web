import { api } from "@/lib/api";
import { MAX_HISTORY_LENGTH } from "@/lib/constants";
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
    hyperparams: { alpha: 2.0 },
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
    scenarioId: "notification_channels",
    isLoading: false,
    error: null,
  });
  (api.deleteSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  vi.clearAllMocks();
});

describe("simulation store", () => {
  it("initialize creates simulation via API", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "ucb1", { alpha: 2.0 });
    const state = useSimulationStore.getState();
    expect(state.simId).toBe("sim-123");
    expect(state.simState?.t).toBe(0);
    expect(state.simState?.hyperparams).toEqual({ alpha: 2.0 });
    expect(state.simState?.algorithm).toBe("ucb1");
    expect(api.createSimulation).toHaveBeenCalledTimes(1);
  });

  it("initialize normalizes missing feature metadata", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockSimResponse(0),
      state: {
        ...mockSimResponse(0).state,
        featureNames: undefined,
        featureLabels: undefined,
      },
    });

    await useSimulationStore.getState().initialize(mockArms, "ucb1", { alpha: 2.0 });

    const state = useSimulationStore.getState();
    expect(state.simState?.featureNames).toEqual([]);
    expect(state.simState?.featureLabels).toEqual([]);
  });

  it("initialize sends snake_case arms and hyperparams", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "linucb", {
      alpha: 2.0,
      l2_lambda: 1.0,
      gamma: 1.0,
      n_clusters: 5,
    });
    expect(api.createSimulation).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ true_prob: 0.3, light_color: "#e7f5ff" })]),
      "linucb",
      { alpha: 2.0, l2_lambda: 1.0, gamma: 1.0, n_clusters: 5 },
      42,
      "notification_channels",
    );
  });

  it("switchScenario reinitializes simulation with new scenario id", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "sim-123",
      state: { ...mockSimResponse(0).state, scenarioId: "notification_channels" },
      algorithm: "ucb1",
      seed: 42,
    });
    await useSimulationStore
      .getState()
      .initialize(mockArms, "ucb1", { alpha: 2.0 }, "notification_channels");
    const firstId = useSimulationStore.getState().simId;

    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "sim-456",
      state: { ...mockSimResponse(0).state, scenarioId: "news_feed" },
      algorithm: "ucb1",
      seed: 42,
    });
    await useSimulationStore.getState().switchScenario("news_feed");

    const state = useSimulationStore.getState();
    expect(state.scenarioId).toBe("news_feed");
    expect(state.simId).toBe("sim-456");
    expect(state.simId).not.toBe(firstId);
  });

  it("reset accepts scenarioId override", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSimResponse(0));
    await useSimulationStore
      .getState()
      .initialize(mockArms, "ucb1", { alpha: 2.0 }, "notification_channels");

    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSimResponse(0));
    await useSimulationStore.getState().reset(undefined, "content_format");

    expect(useSimulationStore.getState().scenarioId).toBe("content_format");
    expect(api.createSimulation).toHaveBeenLastCalledWith(
      expect.any(Array),
      "ucb1",
      { alpha: 2.0 },
      42,
      "content_format",
    );
  });

  it("initialize passes custom scenarioId to API", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "ucb1", { alpha: 2.0 }, "news_feed");
    expect(api.createSimulation).toHaveBeenCalledWith(
      expect.any(Array),
      "ucb1",
      { alpha: 2.0 },
      42,
      "news_feed",
    );
    expect(useSimulationStore.getState().scenarioId).toBe("news_feed");
  });

  it("initialize cleans up old simulation", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "ucb1", { alpha: 2.0 });
    expect(api.deleteSimulation).not.toHaveBeenCalled(); // first init, no old sim

    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "thompson", {});
    expect(api.deleteSimulation).toHaveBeenCalledWith("sim-123");
  });

  it("initialize sets loading state", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    const promise = useSimulationStore.getState().initialize(mockArms, "ucb1", { alpha: 2.0 });
    expect(useSimulationStore.getState().isLoading).toBe(true);
    await promise;
    expect(useSimulationStore.getState().isLoading).toBe(false);
  });

  it("initialize sets error on API failure", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API down"));
    await useSimulationStore.getState().initialize(mockArms, "ucb1", { alpha: 2.0 });
    const state = useSimulationStore.getState();
    expect(state.error).toBe("API down");
    expect(state.simId).toBeNull();
  });

  it("step calls API and updates state", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "ucb1", { alpha: 2.0 });

    (api.step as ReturnType<typeof vi.fn>).mockResolvedValue(mockStepResponse);

    await useSimulationStore.getState().step();
    expect(api.step).toHaveBeenCalledWith("sim-123");
    const state = useSimulationStore.getState();
    expect(state.simState?.t).toBe(2);
    expect(state.simState?.history.length).toBe(1);
  });

  it("step preserves hyperparams and algorithm", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "linucb", {
      alpha: 3.0,
      l2_lambda: 2.0,
      n_clusters: 7,
    });
    (api.step as ReturnType<typeof vi.fn>).mockResolvedValue(mockStepResponse);
    await useSimulationStore.getState().step();
    const state = useSimulationStore.getState();
    expect(state.simState?.hyperparams).toEqual({ alpha: 3.0, l2_lambda: 2.0, n_clusters: 7 });
    expect(state.simState?.algorithm).toBe("linucb");
  });

  it("step returns early if no simId or simState", async () => {
    await useSimulationStore.getState().step();
    expect(api.step).not.toHaveBeenCalled();
  });

  it("step sets error and stops running on failure", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "ucb1", { alpha: 2.0 });

    (api.step as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Step failed"));
    await useSimulationStore.getState().step();
    const state = useSimulationStore.getState();
    expect(state.error).toBe("Step failed");
    expect(state.isRunning).toBe(false);
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

  it("reset passes updated seed to createSimulation", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().initialize(mockArms, "ucb1", { alpha: 2.0 });
    useSimulationStore.getState().setSeed(99);
    await useSimulationStore.getState().reset();
    expect(api.createSimulation).toHaveBeenLastCalledWith(
      expect.any(Array),
      "ucb1",
      { alpha: 2.0 },
      99,
      "notification_channels",
    );
  });

  it("reset preserves hyperparams when algorithm unchanged", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSimResponse(0));
    await useSimulationStore
      .getState()
      .initialize(mockArms, "linucb", { alpha: 3.0, l2_lambda: 2.0, n_clusters: 7 });
    const oldHyperparams = useSimulationStore.getState().simState?.hyperparams;

    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSimResponse(0));
    await useSimulationStore.getState().reset(); // no algo arg
    expect(api.createSimulation).toHaveBeenCalledWith(
      expect.any(Array),
      "linucb",
      { alpha: 3.0, l2_lambda: 2.0, n_clusters: 7 },
      42,
      "notification_channels",
    );
  });

  it("reset uses DEFAULT_HYPERPARAMS when algorithm changes", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSimResponse(0));
    await useSimulationStore
      .getState()
      .initialize(mockArms, "linucb", { alpha: 3.0, l2_lambda: 2.0, n_clusters: 7 });

    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSimResponse(0));
    await useSimulationStore.getState().reset("thompson");
    expect(api.createSimulation).toHaveBeenCalledWith(
      expect.any(Array),
      "thompson",
      {}, // empty — thompson has no hyperparams
      42,
      "notification_channels",
    );
  });

  it("reset preserves scenarioId", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSimResponse(0));
    await useSimulationStore
      .getState()
      .initialize(mockArms, "ucb1", { alpha: 2.0 }, "product_recommendations");

    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSimResponse(0));
    await useSimulationStore.getState().reset();

    expect(api.createSimulation).toHaveBeenLastCalledWith(
      expect.any(Array),
      "ucb1",
      { alpha: 2.0 },
      42,
      "product_recommendations",
    );
    expect(useSimulationStore.getState().scenarioId).toBe("product_recommendations");
  });

  it("reset returns early if no simState", async () => {
    await useSimulationStore.getState().reset("ucb1");
    expect(api.createSimulation).not.toHaveBeenCalled();
  });

  it("applySettings creates new simulation", async () => {
    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(mockSimResponse(0));
    await useSimulationStore.getState().applySettings({
      arms: mockArms,
      algorithm: "thompson",
      hyperparams: { alpha: 1.5, epsilon: 0.2 },
    });
    expect(api.createSimulation).toHaveBeenCalledTimes(1);
    expect(api.createSimulation).toHaveBeenCalledWith(
      expect.any(Array),
      "thompson",
      { alpha: 1.5, epsilon: 0.2 },
      42,
      "notification_channels",
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

  it("step keeps history length at most MAX_HISTORY_LENGTH", async () => {
    const longHistory = Array.from({ length: MAX_HISTORY_LENGTH }, (_, i) => ({
      t: i + 1,
      chosenIdx: 0,
      outcome: 1,
      stepRegret: 0,
      cumRegret: 0,
      scores: [],
      context: null,
      wasRandom: false,
      trueProb: 0.5,
    }));
    const longRegret = Array.from({ length: MAX_HISTORY_LENGTH }, () => 0);

    (api.createSimulation as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockSimResponse(MAX_HISTORY_LENGTH),
      state: {
        ...mockSimResponse(MAX_HISTORY_LENGTH).state,
        history: longHistory,
        regretHistory: longRegret,
        t: MAX_HISTORY_LENGTH,
      },
    });
    await useSimulationStore.getState().initialize(mockArms, "ucb1", { alpha: 2.0 });

    (api.step as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      t: MAX_HISTORY_LENGTH + 1,
      step: {
        t: MAX_HISTORY_LENGTH + 1,
        chosenIdx: 1,
        outcome: 0,
        stepRegret: 0.1,
        cumRegret: 0.1,
        scores: [],
        context: null,
        wasRandom: false,
        trueProb: 0.5,
      },
      armStates: mockSimResponse(1).state.armStates,
      regretHistory: [...longRegret, 0.1],
    });
    await useSimulationStore.getState().step();

    const state = useSimulationStore.getState().simState;
    expect(state).not.toBeNull();
    expect(state?.history.length).toBeLessThanOrEqual(MAX_HISTORY_LENGTH);
    expect(state?.regretHistory.length).toBeLessThanOrEqual(MAX_HISTORY_LENGTH);
  });
});
