import { api } from "@/lib/api";
import type { ApiStepResponse } from "@/lib/api";
import { DEFAULT_HYPERPARAMS, MAX_HISTORY_LENGTH } from "@/lib/constants";
import type { AlgorithmId, Arm, SimState } from "@/lib/types";
import { create } from "zustand";

interface SettingsPayload {
  arms: Arm[];
  algorithm: AlgorithmId;
  hyperparams: Record<string, number>;
}

interface SimulationStore {
  simId: string | null;
  simState: SimState | null;
  isRunning: boolean;
  speed: number;
  seed: number;
  scenarioId: string;
  isStepping: boolean;
  isRecreating: boolean;
  error: string | null;

  initialize: (
    arms: Arm[] | null,
    algorithm: AlgorithmId,
    hyperparams: Record<string, number>,
    scenarioId?: string,
  ) => Promise<void>;
  step: () => Promise<void>;
  play: () => void;
  pause: () => void;
  reset: (algo?: AlgorithmId, scenarioId?: string) => Promise<void>;
  switchScenario: (scenarioId: string) => Promise<void>;
  setSpeed: (v: number) => void;
  setSeed: (s: number) => void;
  applySettings: (payload: SettingsPayload) => Promise<void>;
  clearError: () => void;
}

function toSnakeArms(arms: Arm[] | null) {
  if (!arms) return null;
  return arms.map((a) => ({
    id: a.id,
    label: a.label,
    true_prob: a.trueProb,
    color: a.color,
    light_color: a.lightColor,
  }));
}

function normalizeSimState(state: Partial<SimState>, algorithm: AlgorithmId): SimState {
  return {
    ...(state as SimState),
    algorithm,
    featureNames: state.featureNames ?? [],
    featureLabels: state.featureLabels ?? [],
    featureDescriptions: state.featureDescriptions ?? [],
    featureUnits: state.featureUnits ?? [],
    featureMins: state.featureMins ?? [],
    featureMaxs: state.featureMaxs ?? [],
    featureLowLabels: state.featureLowLabels ?? [],
    featureHighLabels: state.featureHighLabels ?? [],
    historyWindow: state.historyWindow ?? MAX_HISTORY_LENGTH,
    populationSegments: state.populationSegments ?? [],
    scenarioId: state.scenarioId ?? null,
  };
}

function markRecreateStart() {
  if (typeof performance !== "undefined") {
    performance.mark("playground-recreate-start");
  }
}

function markRecreateEnd() {
  if (typeof performance !== "undefined") {
    performance.mark("playground-recreate-end");
    try {
      performance.measure(
        "playground-recreate",
        "playground-recreate-start",
        "playground-recreate-end",
      );
    } catch {
      /* marks may be missing in tests */
    }
  }
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  simId: null,
  simState: null,
  isRunning: false,
  speed: 0.5,
  seed: 42,
  scenarioId: "notification_channels",
  isStepping: false,
  isRecreating: false,
  error: null,

  initialize: async (arms, algorithm, hyperparams, scenarioId = "notification_channels") => {
    const { simId: oldSimId } = get();
    markRecreateStart();
    set({ isRecreating: true, error: null, isRunning: false });
    try {
      if (oldSimId) {
        await api.deleteSimulation(oldSimId).catch(() => {});
      }
      const result = await api.createSimulation(
        toSnakeArms(arms),
        algorithm,
        hyperparams,
        get().seed,
        scenarioId,
      );
      set({
        simId: result.id,
        simState: {
          ...normalizeSimState(result.state as SimState, algorithm),
          hyperparams: { ...hyperparams },
        },
        scenarioId,
        isRecreating: false,
      });
    } catch (e) {
      set({
        isRecreating: false,
        error: e instanceof Error ? e.message : "Failed to create simulation",
      });
    } finally {
      markRecreateEnd();
    }
  },

  step: async () => {
    const { simId, simState, isStepping, isRecreating } = get();
    if (!simId || !simState || isStepping || isRecreating) return;

    if (typeof performance !== "undefined") {
      performance.mark("playground-step-start");
    }
    set({ isStepping: true, error: null });
    try {
      const stepResponse: ApiStepResponse = await api.step(simId);
      const cap = MAX_HISTORY_LENGTH;
      const newHistory = [...simState.history, stepResponse.step].slice(-cap);
      const updatedSimState: SimState = {
        ...simState,
        featureNames: simState.featureNames ?? [],
        featureLabels: simState.featureLabels ?? [],
        featureDescriptions: simState.featureDescriptions ?? [],
        featureUnits: simState.featureUnits ?? [],
        featureMins: simState.featureMins ?? [],
        featureMaxs: simState.featureMaxs ?? [],
        featureLowLabels: simState.featureLowLabels ?? [],
        featureHighLabels: simState.featureHighLabels ?? [],
        historyWindow: simState.historyWindow ?? MAX_HISTORY_LENGTH,
        populationSegments: simState.populationSegments ?? [],
        t: stepResponse.t,
        armStates: stepResponse.armStates,
        regretHistory: stepResponse.regretHistory.slice(-cap),
        history: newHistory,
      };
      set({ simState: updatedSimState, isStepping: false });
      if (typeof performance !== "undefined") {
        performance.mark("playground-step-end");
        try {
          performance.measure("playground-step", "playground-step-start", "playground-step-end");
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      set({
        isStepping: false,
        error: e instanceof Error ? e.message : "Step failed",
        isRunning: false,
      });
    }
  },

  play: () => {
    if (get().isRecreating) return;
    set({ isRunning: true });
  },

  pause: () => set({ isRunning: false }),

  switchScenario: async (scenarioId: string) => {
    const { simState } = get();
    const algorithm = simState?.algorithm ?? "ucb1";
    const hyperparams = simState?.hyperparams ?? DEFAULT_HYPERPARAMS[algorithm];
    await get().initialize(null, algorithm, hyperparams, scenarioId);
  },

  reset: async (algo?: AlgorithmId, scenarioId?: string) => {
    const { simState, seed, simId: oldSimId, scenarioId: currentScenario } = get();
    if (!simState) return;
    const targetScenario = scenarioId ?? currentScenario;
    markRecreateStart();
    set({ isRunning: false, isRecreating: true, error: null });
    try {
      if (oldSimId) {
        await api.deleteSimulation(oldSimId).catch(() => {});
      }
      const algorithm = algo ?? simState.algorithm;
      const hyperparams =
        algorithm === simState.algorithm
          ? { ...simState.hyperparams }
          : { ...DEFAULT_HYPERPARAMS[algorithm] };
      const result = await api.createSimulation(
        toSnakeArms(simState.arms),
        algorithm,
        hyperparams,
        seed,
        targetScenario,
      );
      set({
        simId: result.id,
        simState: {
          ...normalizeSimState(result.state as SimState, algorithm),
          hyperparams: { ...hyperparams },
        },
        scenarioId: targetScenario,
        isRecreating: false,
      });
    } catch (e) {
      set({
        isRecreating: false,
        error: e instanceof Error ? e.message : "Reset failed",
      });
    } finally {
      markRecreateEnd();
    }
  },

  setSpeed: (speed) => set({ speed }),

  setSeed: (seed) => set({ seed }),

  applySettings: async ({ arms, algorithm: algo, hyperparams }) => {
    const { simId: oldSimId, scenarioId } = get();
    markRecreateStart();
    set({ isRecreating: true, error: null, isRunning: false });
    try {
      if (oldSimId) {
        await api.deleteSimulation(oldSimId).catch(() => {});
      }
      const result = await api.createSimulation(
        toSnakeArms(arms),
        algo,
        hyperparams,
        get().seed,
        scenarioId,
      );
      set({
        simId: result.id,
        simState: {
          ...normalizeSimState(result.state as SimState, algo),
          hyperparams: { ...hyperparams },
        },
        isRecreating: false,
      });
    } catch (e) {
      set({
        isRecreating: false,
        error: e instanceof Error ? e.message : "Apply settings failed",
      });
    } finally {
      markRecreateEnd();
    }
  },

  clearError: () => set({ error: null }),
}));
