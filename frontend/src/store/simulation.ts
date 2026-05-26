import { api } from "@/lib/api";
import type { AlgorithmId, Arm, SimState } from "@/lib/types";
import { create } from "zustand";

interface SettingsPayload {
  arms: Arm[];
  algorithm: AlgorithmId;
  alpha: number;
  epsilon: number;
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
    alpha: number,
    epsilon: number,
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
  speed: 2,
  seed: 42,
  isLoading: false,
  error: null,

  initialize: async (arms, algorithm, alpha, epsilon) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.createSimulation(
        toSnakeArms(arms),
        algorithm,
        { alpha, epsilon },
        get().seed,
      );
      set({ simId: result.id, simState: result.state as SimState, isLoading: false });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : "Failed to create simulation",
      });
    }
  },

  step: async () => {
    const { simId } = get();
    if (!simId) return;
    set({ isLoading: true, error: null });
    try {
      await api.step(simId);
      const sim = await api.getSimulation(simId);
      set({ simState: sim.state as SimState, isLoading: false });
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
    const { simState, seed } = get();
    if (!simState) return;
    set({ isRunning: false, isLoading: true, error: null });
    try {
      const result = await api.createSimulation(
        toSnakeArms(simState.arms),
        algo ?? simState.algorithm,
        { alpha: simState.alpha, epsilon: simState.epsilon },
        seed,
      );
      set({ simId: result.id, simState: result.state as SimState, isLoading: false });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : "Reset failed",
      });
    }
  },

  setSpeed: (speed) => set({ speed }),

  setSeed: (seed) => set({ seed }),

  applySettings: async ({ arms, algorithm: algo, alpha, epsilon }) => {
    set({ isLoading: true, error: null, isRunning: false });
    try {
      const result = await api.createSimulation(
        toSnakeArms(arms),
        algo,
        { alpha, epsilon },
        get().seed,
      );
      set({ simId: result.id, simState: result.state as SimState, isLoading: false });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : "Apply settings failed",
      });
    }
  },

  clearError: () => set({ error: null }),
}));
