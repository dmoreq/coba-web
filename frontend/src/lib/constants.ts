/** Algorithm metadata — pure UI presentation, no engine logic. */

import type { AlgoMeta, AlgorithmId, Arm, ArmState, Score, SimState } from "@/lib/types";

/** Algorithm metadata for display */
export const ALGO_META: Record<AlgorithmId, AlgoMeta> = {
  ucb1: {
    label: "UCB1",
    color: "#228be6",
    light: "#e7f5ff",
    desc: "Context-free optimistic baseline",
    hyperparams: ["alpha"],
  },
  thompson: {
    label: "Thompson",
    color: "#12b886",
    light: "#e6fcf5",
    desc: "Context-free Bayesian Beta posteriors",
    hyperparams: [],
  },
  epsilon_greedy: {
    label: "\u03B5-Greedy",
    color: "#fd7e14",
    light: "#fff4e6",
    desc: "Estimator-based \u03B5 exploration; in this simulator it uses contextual features",
    hyperparams: ["epsilon", "l2_lambda"],
  },
  linucb: {
    label: "LinUCB",
    color: "#7950f2",
    light: "#f3f0ff",
    desc: "Contextual linear upper confidence bound — reward depends on user features",
    hyperparams: ["alpha", "l2_lambda", "gamma", "n_clusters"],
  },
  lints: {
    label: "LinTS",
    color: "#e64980",
    light: "#fce4ec",
    desc: "Contextual linear Thompson sampling — Bayesian counterpart of LinUCB",
    hyperparams: ["v_sq", "l2_lambda", "gamma", "n_clusters"],
  },
  linucb_hybrid: {
    label: "Hybrid LinUCB",
    color: "#6741d9",
    light: "#ede7f6",
    desc: "LinUCB with shared features across arms and arm-specific features",
    hyperparams: ["alpha", "l2_lambda", "gamma", "n_shared_features", "n_clusters"],
  },
  linucb_sw: {
    label: "SW-LinUCB",
    color: "#0c8599",
    light: "#e3fafc",
    desc: "Sliding-window LinUCB for non-stationary reward distributions",
    hyperparams: ["alpha", "l2_lambda", "linucb_sw_window", "n_clusters"],
  },
  softmax: {
    label: "Softmax",
    color: "#f76707",
    light: "#fff4e6",
    desc: "Temperature-controlled probabilistic action selection",
    hyperparams: ["softmax_tau", "l2_lambda", "gamma", "n_clusters"],
  },
  neural_linear: {
    label: "Neural Linear",
    color: "#cc5de8",
    light: "#f3d9fa",
    desc: "MLP neural embedding with linear Thompson head — for complex feature interactions",
    hyperparams: ["v_sq", "l2_lambda", "neural_embedding_dim", "neural_retrain_freq"],
  },
  bootstrapped_ts: {
    label: "Bootstrapped TS",
    color: "#4263eb",
    light: "#dbe4ff",
    desc: "Bootstrap ensemble of estimators with Thompson sampling",
    hyperparams: ["n_bootstraps", "l2_lambda", "n_clusters"],
  },
  bootstrapped_ucb: {
    label: "Bootstrapped UCB",
    color: "#364fc7",
    light: "#d5d9f0",
    desc: "Bootstrap ensemble of estimators with upper confidence bound",
    hyperparams: ["n_bootstraps", "l2_lambda", "n_clusters"],
  },
  logistic_ucb: {
    label: "Logistic UCB",
    color: "#e03131",
    light: "#ffe0e0",
    desc: "Logistic regression upper confidence bound for binary rewards",
    hyperparams: ["alpha", "l2_lambda", "gamma", "n_clusters"],
  },
  logistic_ts: {
    label: "Logistic TS",
    color: "#c92a2a",
    light: "#ffcccc",
    desc: "Logistic regression Thompson sampling for binary rewards",
    hyperparams: ["v_sq", "l2_lambda", "gamma", "n_clusters"],
  },
  gp_ucb: {
    label: "GP-UCB",
    color: "#2b8a3e",
    light: "#d3f9d8",
    desc: "Gaussian Process UCB with RBF kernel for smooth non-linear rewards",
    hyperparams: ["gp_beta", "gp_length_scale", "gp_noise_var", "gp_max_obs"],
  },
  random_forest_ucb: {
    label: "RF UCB",
    color: "#d9480f",
    light: "#ffe8cc",
    desc: "Random forest ensemble UCB — tree disagreement as uncertainty",
    hyperparams: ["alpha", "rf_n_estimators", "rf_max_depth", "rf_max_obs"],
  },
  random_forest_ts: {
    label: "RF TS",
    color: "#a61e24",
    light: "#ffc9c9",
    desc: "Random forest ensemble with Thompson-style posterior sampling",
    hyperparams: ["rf_n_estimators", "rf_max_depth", "rf_max_obs"],
  },
};

/** Default hyperparameters per algorithm — matches backend defaults */
export const DEFAULT_HYPERPARAMS: Record<AlgorithmId, Record<string, number>> = {
  ucb1: { alpha: 2.0 },
  thompson: {},
  epsilon_greedy: { epsilon: 0.1, l2_lambda: 1.0 },
  linucb: { alpha: 2.0, l2_lambda: 1.0, gamma: 1.0, n_clusters: 5 },
  lints: { v_sq: 1.0, l2_lambda: 1.0, gamma: 1.0, n_clusters: 5 },
  linucb_hybrid: { alpha: 2.0, l2_lambda: 1.0, gamma: 1.0, n_shared_features: 1, n_clusters: 5 },
  linucb_sw: { alpha: 2.0, l2_lambda: 1.0, linucb_sw_window: 200, n_clusters: 5 },
  softmax: { softmax_tau: 1.0, l2_lambda: 1.0, gamma: 1.0, n_clusters: 5 },
  neural_linear: { v_sq: 1.0, l2_lambda: 1.0, neural_embedding_dim: 16, neural_retrain_freq: 200 },
  bootstrapped_ts: { n_bootstraps: 10, l2_lambda: 1.0, n_clusters: 5 },
  bootstrapped_ucb: { n_bootstraps: 10, l2_lambda: 1.0, n_clusters: 5 },
  logistic_ucb: { alpha: 2.0, l2_lambda: 1.0, gamma: 1.0, n_clusters: 5 },
  logistic_ts: { v_sq: 1.0, l2_lambda: 1.0, gamma: 1.0, n_clusters: 5 },
  gp_ucb: { gp_beta: 2.0, gp_length_scale: 1.0, gp_noise_var: 0.1, gp_max_obs: 500 },
  random_forest_ucb: { alpha: 2.0, rf_n_estimators: 50, rf_max_depth: 6, rf_max_obs: 1000 },
  random_forest_ts: { rf_n_estimators: 50, rf_max_depth: 6, rf_max_obs: 1000 },
};

export const ALGORITHM_ORDER: AlgorithmId[] = [
  "ucb1",
  "thompson",
  "epsilon_greedy",
  "linucb",
  "lints",
  "linucb_hybrid",
  "linucb_sw",
  "softmax",
  "neural_linear",
  "bootstrapped_ts",
  "bootstrapped_ucb",
  "logistic_ucb",
  "logistic_ts",
  "gp_ucb",
  "random_forest_ucb",
  "random_forest_ts",
];

// ── Hyperparam slider configs ──

interface HyperparamConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
}

export const HYPERPARAM_META: Record<string, HyperparamConfig> = {
  alpha: { label: "\u03B1 — Exploration width", min: 0.1, max: 10, step: 0.1 },
  epsilon: {
    label: "\u03B5 — Exploration probability",
    min: 0.01,
    max: 0.5,
    step: 0.01,
    format: (v) => `${(v * 100).toFixed(0)}%`,
  },
  l2_lambda: { label: "\u03BB — Ridge regularization", min: 0.01, max: 10, step: 0.1 },
  gamma: { label: "\u03B3 — Exponential discount", min: 0.5, max: 1.0, step: 0.05 },
  n_clusters: { label: "Clusters (KMeans)", min: 1, max: 20, step: 1, format: (v) => `${v}` },
  v_sq: { label: "v\u00B2 — Posterior variance", min: 0.1, max: 10, step: 0.1 },
  n_shared_features: { label: "Shared features", min: 1, max: 5, step: 1, format: (v) => `${v}` },
  n_bootstraps: { label: "Ensemble size", min: 2, max: 50, step: 1, format: (v) => `${v}` },
  neural_embedding_dim: {
    label: "Embedding dimension",
    min: 4,
    max: 64,
    step: 4,
    format: (v) => `${v}`,
  },
  neural_retrain_freq: {
    label: "Backbone retrain frequency",
    min: 50,
    max: 500,
    step: 50,
    format: (v) => `${v}`,
  },
  gp_beta: { label: "\u03B2 — GP exploration", min: 0.1, max: 10, step: 0.1 },
  gp_length_scale: { label: "GP length scale", min: 0.1, max: 5, step: 0.1 },
  gp_noise_var: { label: "GP noise variance", min: 0.01, max: 1.0, step: 0.01 },
  gp_max_obs: {
    label: "GP max observations",
    min: 100,
    max: 2000,
    step: 100,
    format: (v) => `${v}`,
  },
  softmax_tau: { label: "\u03C4 — Temperature", min: 0.1, max: 10, step: 0.1 },
  linucb_sw_window: {
    label: "Sliding window size",
    min: 50,
    max: 1000,
    step: 50,
    format: (v) => `${v}`,
  },
  rf_n_estimators: { label: "Number of trees", min: 2, max: 200, step: 10, format: (v) => `${v}` },
  rf_max_depth: { label: "Max tree depth", min: 1, max: 20, step: 1, format: (v) => `${v}` },
  rf_max_obs: {
    label: "Max stored observations",
    min: 100,
    max: 5000,
    step: 100,
    format: (v) => `${v}`,
  },
};

// ── Default arms and simulation constants ──

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

export const DEFAULT_SEED = 42;
export const DEFAULT_SPEED = 0.5;
export const MAX_HISTORY_LENGTH = 150;

/** Algorithms that use context — show context panel */
export const CONTEXTUAL_ALGORITHMS = new Set([
  "epsilon_greedy",
  "linucb",
  "lints",
  "linucb_hybrid",
  "linucb_sw",
  "logistic_ucb",
  "logistic_ts",
  "neural_linear",
  "bootstrapped_ts",
  "bootstrapped_ucb",
  "gp_ucb",
  "softmax",
  "random_forest_ucb",
  "random_forest_ts",
]);

export type EstimateRenderMode = "beta" | "decomposed" | "raw";

const DECOMPOSED_ESTIMATE_ALGORITHMS = new Set([
  "ucb1",
  "linucb",
  "linucb_hybrid",
  "linucb_sw",
  "logistic_ucb",
  "gp_ucb",
  "random_forest_ucb",
  "bootstrapped_ucb",
]);

export function getCurrentTrueProb(simState: SimState, armIndex: number): number {
  const lastStep = simState.history[simState.history.length - 1];
  return lastStep?.allTrueProbs?.[armIndex] ?? simState.arms[armIndex]?.trueProb ?? 0;
}

export function isBestArmRightNow(simState: SimState, armIndex: number): boolean {
  const lastStep = simState.history[simState.history.length - 1];
  if (lastStep?.allTrueProbs?.length === simState.arms.length) {
    const bestProb = Math.max(...lastStep.allTrueProbs);
    return getCurrentTrueProb(simState, armIndex) >= bestProb - 0.001;
  }

  const st = simState.armStates[armIndex];
  if (!st || simState.t <= 5 || st.n === 0) return false;

  const mean = st.successes / st.n;
  return simState.arms.every((_, i) => {
    if (i === armIndex) return true;
    const other = simState.armStates[i];
    return other.n === 0 || other.successes / other.n <= mean + 0.001;
  });
}

export function getEstimateRenderMode(
  algorithm: string,
  _score: Score | null | undefined,
): EstimateRenderMode {
  if (algorithm === "thompson") return "beta";
  if (DECOMPOSED_ESTIMATE_ALGORITHMS.has(algorithm)) return "decomposed";
  return "raw";
}

export function formatEstimateStat(
  algorithm: string,
  score: Score | null | undefined,
  armState: ArmState,
): string {
  const mean = score?.mean ?? 0;
  const bonus = score?.bonus ?? 0;
  const rawScore = score?.score ?? 0;
  const sample = score?.sample;

  if (algorithm === "thompson") {
    if (sample != null) return `μ=${mean.toFixed(3)} s=${sample.toFixed(3)}`;
    return `μ=${mean.toFixed(3)} score=${rawScore.toFixed(3)}`;
  }

  if (bonus > 0) {
    return `${mean.toFixed(3)} + ${Math.min(bonus, 9.99).toFixed(3)}`;
  }

  if (mean > 0 && rawScore === 0) {
    return mean.toFixed(3);
  }

  if (rawScore > 0 || armState.n > 0) {
    return `score=${Math.min(rawScore, 99).toFixed(3)}`;
  }

  return "—";
}

/**
 * Create a default empty SimState for initialization.
 */
export function createDefaultSimState(algorithm: AlgorithmId = "ucb1"): SimState {
  const hp = DEFAULT_HYPERPARAMS[algorithm] ?? {};
  return {
    arms: DEFAULT_ARMS,
    armStates: DEFAULT_ARMS.map(() => ({ n: 0, successes: 0, failures: 0 })),
    linMeta: DEFAULT_ARMS.map(() => ({
      A: [
        [1, 0],
        [0, 1],
      ] as [[number, number], [number, number]],
      b: [0, 0] as [number, number],
    })),
    algorithm,
    hyperparams: { ...hp },
    alpha: hp.alpha ?? 2.0,
    epsilon: hp.epsilon ?? 0.1,
    scenarioId: "notification_channels",
    featureNames: [],
    featureLabels: [],
    t: 0,
    history: [],
    regretHistory: [],
  };
}
