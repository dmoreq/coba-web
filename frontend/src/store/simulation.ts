import { api } from "@/lib/api";
import type { ApiStepResponse } from "@/lib/api";
import type { AlgorithmId, Arm, SimState } from "@/lib/types";
import { DEFAULT_HYPERPARAMS } from "@/lib/constants";
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
  isLoading: boolean;
  error: string | null;

  initialize: (
    arms: Arm[],
    algorithm: AlgorithmId,
    hyperparams: Record<string, number>,
  ) => Promise<void>;
  step: () => Promise<void>;
  play: () => void;
  pause: () => void;
  reset: (algo?: AlgorithmId) => Promise<void>;
  setSpeed: (v: number) => void;
  setSeed: (s: number) => void;
  applySettings: (payload: SettingsPayload) => Promise<void>;
  clearError: () => void;
}

function toSnakeArms(arms: Arm[]) {
  return arms.map((a) => ({
    id: a.id,
    label: a.label,
    true_prob: a.trueProb,
    color: a.color,
    light_color: a.lightColor,
  }));
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  simId: null,
  simState: null,
  isRunning: false,
  speed: 0.5,
  seed: 42,
  isLoading: false,
  error: null,

  initialize: async (arms, algorithm, hyperparams) => {
    const { simId: oldSimId } = get();
    set({ isLoading: true, error: null });
    try {
      if (oldSimId) {
        await api.deleteSimulation(oldSimId).catch(() => {});
      }
      const result = await api.createSimulation(
        toSnakeArms(arms),
        algorithm,
        hyperparams,
        get().seed,
      );
      set({
        simId: result.id,
        simState: { ...(result.state as SimState), hyperparams: { ...hyperparams }, algorithm },
        isLoading: false,
      });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : "Failed to create simulation",
      });
    }
  },

  step: async () => {
    const { simId, simState } = get();
    if (!simId || !simState) return;
    set({ isLoading: true, error: null });
    try {
      const stepResponse: ApiStepResponse = await api.step(simId);
      // Reconstruct SimState from StepResponse without fetching full sim
      const newHistory = [...simState.history, stepResponse.step];
      const updatedSimState: SimState = {
        ...simState,
        t: stepResponse.t,
        armStates: stepResponse.armStates,
        regretHistory: stepResponse.regretHistory,
        history: newHistory,
      };
      set({ simState: updatedSimState, isLoading: false });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : "Step failed",
        isRunning: false,
      });
    }
  },

  play: () => set({ isRunning: true }),

  pause: () => set({ isRunning: false }),

  reset: async (algo?: AlgorithmId) => {
    const { simState, seed, simId: oldSimId } = get();
    if (!simState) return;
    set({ isRunning: false, isLoading: true, error: null });
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
      );
      set({
        simId: result.id,
        simState: { ...(result.state as SimState), hyperparams: { ...hyperparams }, algorithm },
        isLoading: false,
      });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : "Reset failed",
      });
    }
  },

  setSpeed: (speed) => set({ speed }),

  setSeed: (seed) => set({ seed }),

  applySettings: async ({ arms, algorithm: algo, hyperparams }) => {
    const { simId: oldSimId } = get();
    set({ isLoading: true, error: null, isRunning: false });
    try {
      if (oldSimId) {
        await api.deleteSimulation(oldSimId).catch(() => {});
      }
      const result = await api.createSimulation(toSnakeArms(arms), algo, hyperparams, get().seed);
      set({
        simId: result.id,
        simState: {
          ...(result.state as SimState),
          hyperparams: { ...hyperparams },
          algorithm: algo,
        },
        isLoading: false,
      });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : "Apply settings failed",
      });
    }
  },

  clearError: () => set({ error: null }),
}));
