import { createInitialSimState } from "@/engine/init";
import { makeRng } from "@/engine/rng";
import { runStep } from "@/engine/step";
import { DEFAULT_ARMS } from "@/lib/constants";
import type { AlgorithmId, Arm, RngFn, SimState } from "@/lib/types";
import { create } from "zustand";

interface SettingsPayload {
  arms: Arm[];
  algorithm: AlgorithmId;
  alpha: number;
  epsilon: number;
}

interface SimulationStore {
  simState: SimState;
  isRunning: boolean;
  speed: number;
  seed: number;
  rngRef: { current: RngFn };

  step: () => void;
  play: () => void;
  pause: () => void;
  setSpeed: (v: number) => void;
  setSeed: (s: number) => void;
  reset: (algo?: AlgorithmId) => void;
  applySettings: (payload: SettingsPayload) => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  simState: createInitialSimState(DEFAULT_ARMS, "ucb1", 2.0, 0.1),
  isRunning: false,
  speed: 2,
  seed: 42,
  rngRef: { current: makeRng(42) },

  step: () => {
    const { simState, rngRef } = get();
    const next = runStep(simState, rngRef.current);
    set({ simState: next });
  },

  play: () => set({ isRunning: true }),

  pause: () => set({ isRunning: false }),

  setSpeed: (speed) => set({ speed }),

  setSeed: (seed) => {
    set({ seed, rngRef: { current: makeRng(seed) } });
  },

  reset: (algo?: AlgorithmId) => {
    const { simState, seed, rngRef } = get();
    const newAlgo = algo || simState.algorithm;
    rngRef.current = makeRng(seed);
    set({
      simState: createInitialSimState(simState.arms, newAlgo, simState.alpha, simState.epsilon),
      isRunning: false,
    });
  },

  applySettings: ({ arms, algorithm: algo, alpha, epsilon }) => {
    const { seed, rngRef } = get();
    rngRef.current = makeRng(seed);
    set({
      simState: createInitialSimState(arms, algo, alpha, epsilon),
      isRunning: false,
    });
  },
}));
