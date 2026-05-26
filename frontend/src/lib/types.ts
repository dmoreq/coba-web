/** Shared type definitions — the contract between frontend and backend. */

/** A single arm/channel the bandit can choose */
export interface Arm {
  id: string;
  label: string;
  trueProb: number;
  color: string;
  lightColor: string;
}

/** Internal state tracked per arm */
export interface ArmState {
  n: number;
  successes: number;
  failures: number;
}

/** LinUCB per-arm linear regression meta (A matrix + b vector) */
export interface LinMeta {
  A: [[number, number], [number, number]];
  b: [number, number];
}

/** Score decomposition for one arm at a single step */
export interface Score {
  mean: number;
  bonus: number;
  score: number;
  sample?: number | null; // Thompson only — null from JSON
  formula: string;
}

/** A single step record — matches backend JSON after camelCase conversion */
export interface StepRecord {
  t: number;
  chosenIdx: number;
  outcome: number;
  stepRegret: number;
  cumRegret: number;
  scores: Score[];
  context: [number, number] | null;
  wasRandom: boolean;
  trueProb: number;
}

/** Full simulation state — pure data, no methods */
export interface SimState {
  arms: Arm[];
  armStates: ArmState[];
  linMeta: LinMeta[];
  algorithm: AlgorithmId;
  alpha: number;
  epsilon: number;
  t: number;
  history: StepRecord[];
  regretHistory: number[];
}

export type AlgorithmId = "ucb1" | "epsilon_greedy" | "thompson" | "linucb";

export interface AlgoMeta {
  label: string;
  color: string;
  light: string;
  desc: string;
}

export type RngFn = () => number;
