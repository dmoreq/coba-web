/** Algorithm metadata — pure UI presentation, no engine logic. */

import type { AlgoMeta, Arm } from "@/lib/types";

/** Algorithm metadata for display */
export const ALGO_META: Record<string, AlgoMeta> = {
  ucb1: {
    label: "UCB1",
    color: "#228be6",
    light: "#e7f5ff",
    desc: "Optimistic — tries arms with uncertain estimates",
  },
  epsilon: {
    label: "ε-Greedy",
    color: "#fd7e14",
    light: "#fff4e6",
    desc: "Random exploration with probability ε, else exploit",
  },
  thompson: {
    label: "Thompson Sampling",
    color: "#12b886",
    light: "#e6fcf5",
    desc: "Bayesian — samples from Beta posterior per arm",
  },
  linucb: {
    label: "LinUCB",
    color: "#7950f2",
    light: "#f3f0ff",
    desc: "Contextual — reward depends on user features",
  },
};

/** Default three notification arms */
export const DEFAULT_ARMS: Arm[] = [
  {
    id: "email",
    label: "Email",
    trueProb: 0.2,
    color: "#228be6",
    lightColor: "#e7f5ff",
  },
  {
    id: "sms",
    label: "SMS",
    trueProb: 0.8,
    color: "#12b886",
    lightColor: "#e6fcf5",
  },
  {
    id: "push",
    label: "Push",
    trueProb: 0.5,
    color: "#fd7e14",
    lightColor: "#fff4e6",
  },
];

/** Default simulation constants */
export const DEFAULT_SEED = 42;
export const DEFAULT_SPEED = 2;
export const DEFAULT_ALPHA = 2.0;
export const DEFAULT_EPSILON = 0.1;
export const MAX_HISTORY_LENGTH = 150;
