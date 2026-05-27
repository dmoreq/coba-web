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
  tooltip?: string;
}

/** Hyperparameter tooltips for settings UI (alias of optional `tooltip` on HYPERPARAM_META). */
export const HYPERPARAM_TOOLTIPS: Partial<Record<string, string>> = {
  linucb_sw_window:
    "Set window ≤ drift onset to adapt quickly; larger windows retain stale pre-drift observations. Default 200 matches Content Format drift at step 200.",
};

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
    tooltip: HYPERPARAM_TOOLTIPS.linucb_sw_window,
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

export type EstimateRenderMode = "beta" | "decomposed" | "raw";
export type AlgorithmFamily =
  | "ucb_classic"
  | "epsilon_greedy"
  | "thompson_beta"
  | "linear_ucb"
  | "linear_ts"
  | "hybrid_ucb"
  | "sliding_window_ucb"
  | "softmax"
  | "neural_linear"
  | "bootstrap_ts"
  | "bootstrap_ucb"
  | "logistic_ucb"
  | "logistic_ts"
  | "gp_ucb"
  | "rf_ucb"
  | "rf_ts";

interface EstimateLegend {
  primary: string;
  secondary?: string;
}

interface AlgorithmPresentation {
  family: AlgorithmFamily;
  contextual: boolean;
  estimateMode: EstimateRenderMode;
  formulaLabel: string;
  legend: EstimateLegend | null;
}

const DECOMPOSED_LEGEND: EstimateLegend = {
  primary: "Mean estimate",
  secondary: "Exploration bonus",
};

const RAW_LEGEND: EstimateLegend = {
  primary: "Policy score",
};

export const ALGORITHM_PRESENTATION: Record<AlgorithmId, AlgorithmPresentation> = {
  ucb1: {
    family: "ucb_classic",
    contextual: false,
    estimateMode: "decomposed",
    formulaLabel: "Formula: score = μ̂ + α√(2·ln(t)/n)",
    legend: DECOMPOSED_LEGEND,
  },
  thompson: {
    family: "thompson_beta",
    contextual: false,
    estimateMode: "beta",
    formulaLabel: "Posterior: Beta(successes+1, failures+1)",
    legend: null,
  },
  epsilon_greedy: {
    family: "epsilon_greedy",
    contextual: true,
    estimateMode: "raw",
    formulaLabel: "score = mean estimate",
    legend: RAW_LEGEND,
  },
  linucb: {
    family: "linear_ucb",
    contextual: true,
    estimateMode: "decomposed",
    formulaLabel: "score = θᵖx + α√(xᵖA⁻¹x)",
    legend: DECOMPOSED_LEGEND,
  },
  lints: {
    family: "linear_ts",
    contextual: true,
    estimateMode: "raw",
    formulaLabel: "score = θᵖx (sampled from posterior N(μ, v²))",
    legend: RAW_LEGEND,
  },
  linucb_hybrid: {
    family: "hybrid_ucb",
    contextual: true,
    estimateMode: "decomposed",
    formulaLabel: "score = zᵖβ + xᵖθᵖ + α√(...)",
    legend: DECOMPOSED_LEGEND,
  },
  linucb_sw: {
    family: "sliding_window_ucb",
    contextual: true,
    estimateMode: "decomposed",
    formulaLabel: "score = θᵖx + α√(xᵖA⁻¹x) (sliding window)",
    legend: DECOMPOSED_LEGEND,
  },
  softmax: {
    family: "softmax",
    contextual: true,
    estimateMode: "raw",
    formulaLabel: "P(arm) = exp(τ·score) / Σexp(τ·score)",
    legend: RAW_LEGEND,
  },
  neural_linear: {
    family: "neural_linear",
    contextual: true,
    estimateMode: "raw",
    formulaLabel: "score = φ(x)ᵖθᵖ (MLP embedding + LinTS head)",
    legend: RAW_LEGEND,
  },
  bootstrapped_ts: {
    family: "bootstrap_ts",
    contextual: true,
    estimateMode: "raw",
    formulaLabel: "score ~ mean(θ₁..ₖ) + sample(std(θ₁..ₖ))",
    legend: RAW_LEGEND,
  },
  bootstrapped_ucb: {
    family: "bootstrap_ucb",
    contextual: true,
    estimateMode: "decomposed",
    formulaLabel: "score = mean(θ₁..ₖ) + std(θ₁..ₖ)",
    legend: DECOMPOSED_LEGEND,
  },
  logistic_ucb: {
    family: "logistic_ucb",
    contextual: true,
    estimateMode: "decomposed",
    formulaLabel: "score = σ(θx) + α·σ₀(θx)",
    legend: DECOMPOSED_LEGEND,
  },
  logistic_ts: {
    family: "logistic_ts",
    contextual: true,
    estimateMode: "raw",
    formulaLabel: "score ~ σ(θx) sampled from Laplace posterior",
    legend: RAW_LEGEND,
  },
  gp_ucb: {
    family: "gp_ucb",
    contextual: true,
    estimateMode: "decomposed",
    formulaLabel: "score = μ(x) + β·σ(x) (GP posterior)",
    legend: DECOMPOSED_LEGEND,
  },
  random_forest_ucb: {
    family: "rf_ucb",
    contextual: true,
    estimateMode: "decomposed",
    formulaLabel: "score = mean(trees) + std(trees)",
    legend: DECOMPOSED_LEGEND,
  },
  random_forest_ts: {
    family: "rf_ts",
    contextual: true,
    estimateMode: "raw",
    formulaLabel: "score ~ random tree prediction",
    legend: RAW_LEGEND,
  },
};

/** Algorithms that use context — show context panel */
export const CONTEXTUAL_ALGORITHMS = new Set(
  ALGORITHM_ORDER.filter((algorithm) => ALGORITHM_PRESENTATION[algorithm].contextual),
);

export function getAlgorithmPresentation(algorithm: string): AlgorithmPresentation {
  return ALGORITHM_PRESENTATION[
    (algorithm as AlgorithmId) in ALGORITHM_PRESENTATION ? (algorithm as AlgorithmId) : "ucb1"
  ];
}

export function getFormulaLabel(algorithm: string): string {
  return getAlgorithmPresentation(algorithm).formulaLabel;
}

export function getEstimateLegend(algorithm: string): EstimateLegend | null {
  return getAlgorithmPresentation(algorithm).legend;
}

function clampDisplayScore(score: number, max = 99): string {
  return Math.min(score, max).toFixed(3);
}

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
  return getAlgorithmPresentation(algorithm).estimateMode;
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

  const renderMode = getEstimateRenderMode(algorithm, score);

  if (renderMode === "beta") {
    if (sample != null) return `μ=${mean.toFixed(3)} s=${sample.toFixed(3)}`;
    return `μ=${mean.toFixed(3)} score=${clampDisplayScore(rawScore)}`;
  }

  if (renderMode === "decomposed") {
    return `${mean.toFixed(3)} + ${Math.min(bonus, 9.99).toFixed(3)}`;
  }

  if (mean > 0 && rawScore === 0) {
    return mean.toFixed(3);
  }

  if (rawScore > 0 || armState.n > 0) {
    return `score=${clampDisplayScore(rawScore)}`;
  }

  return "—";
}

function contextualStepPrefix(simState: SimState, lastStep: SimState["history"][number]): string {
  if (!lastStep.context?.length) return "";
  const labels = simState.featureLabels ?? simState.featureNames ?? [];
  const contextStr = `(${lastStep.context
    .map((v, i) => `${labels[i] ?? `F${i}`}=${v.toFixed(2)}`)
    .join(", ")})`;
  const segment = lastStep.contextSegment ? `${lastStep.contextSegment} ` : "";
  return `${segment}${contextStr}. `;
}

export function getWhyText(simState: SimState): string {
  const lastStep = simState.history[simState.history.length - 1];
  if (!lastStep) return "";

  const chosen = simState.arms[lastStep.chosenIdx];
  const armState = simState.armStates[lastStep.chosenIdx];
  const score = lastStep.scores[lastStep.chosenIdx] ?? { mean: 0, bonus: 0, score: 0, formula: "" };
  const shownScore = clampDisplayScore(score.score ?? 0);
  const presentation = getAlgorithmPresentation(simState.algorithm);
  const ctxPrefix = contextualStepPrefix(simState, lastStep);

  switch (presentation.family) {
    case "ucb_classic":
      return `${chosen.label} had the highest UCB score: mean(${(score.mean ?? 0).toFixed(3)}) + bonus(${Math.min(score.bonus ?? 0, 9.99).toFixed(3)}) = ${shownScore}. The exploration bonus shrinks as n grows — arm has been pulled ${armState.n} times.`;
    case "epsilon_greedy":
      return lastStep.wasRandom
        ? `${chosen.label} was picked randomly (ε-exploration). With ε=${simState.epsilon}, there’s a ${(simState.epsilon * 100).toFixed(0)}% chance each step is random, forcing the algorithm to try underexplored arms.`
        : `${chosen.label} was the greedy pick this step with the highest policy score (${shownScore}). In this simulator ε-greedy still uses contextual features, but only the ε fraction of steps force random exploration.`;
    case "thompson_beta":
      return `${chosen.label} had the highest Thompson draw score this step (${shownScore}). Arms with fewer observations have wider Beta posteriors and occasionally “win” the draw — this drives natural exploration.`;
    case "linear_ucb":
      return `${ctxPrefix}${chosen.label} had the highest LinUCB score for this context. Exploit term: ${(score.mean ?? 0).toFixed(3)}, uncertainty bonus: ${(score.bonus ?? 0).toFixed(3)}. The bonus is large when the context is novel for this arm.`;
    case "linear_ts":
      return `${ctxPrefix}${chosen.label} had the highest LinTS score for this context (${shownScore}). LinTS uses Bayesian linear regression, so exploration comes from posterior uncertainty rather than an explicit UCB bonus bar.`;
    case "hybrid_ucb":
      return `${ctxPrefix}${chosen.label} had the highest hybrid score, combining shared features across all arms and arm-specific features. The shared part learns global patterns; the arm-specific part captures per-channel differences.`;
    case "sliding_window_ucb":
      return `${ctxPrefix}${chosen.label} had the highest score using a sliding-window regression (last ${simState.hyperparams.linucb_sw_window ?? 200} observations). This helps adapt when reward distributions change over time.`;
    case "softmax":
      return `${chosen.label} was selected from a softmax distribution over policy scores; its score this step was ${shownScore} with temperature τ=${(simState.hyperparams.softmax_tau ?? 1).toFixed(1)}. Lower τ is more greedy, higher τ is more random.`;
    case "neural_linear":
      return `${chosen.label} had the highest neural-linear policy score this step (${shownScore}). The MLP learns non-linear features, while the linear head handles decision-time uncertainty.`;
    case "bootstrap_ts":
      return `${chosen.label} won the bootstrap Thompson-style score this step (${shownScore}). ${simState.hyperparams.n_bootstraps ?? 10} models provide an ensemble of predictions, and exploration comes from disagreement across those models.`;
    case "bootstrap_ucb":
      return `${chosen.label} had the highest bootstrapped policy score this step (${shownScore}). The ensemble uses disagreement across ${simState.hyperparams.n_bootstraps ?? 10} models as its exploration signal.`;
    case "logistic_ucb":
      return `${chosen.label} had the highest logistic UCB score. A logistic model models binary rewards directly — the score combines predicted probability with an uncertainty bonus.`;
    case "logistic_ts":
      return `${chosen.label} had the highest logistic Thompson-style score this step (${shownScore}). It is designed for binary rewards and uses posterior uncertainty rather than an explicit bonus term.`;
    case "gp_ucb":
      return `${chosen.label} had the highest GP-UCB score. The Gaussian Process models the reward surface as a smooth function — exploration is driven by predictive variance. Best for small-step regimes (GP is O(n³)).`;
    case "rf_ucb":
      return `${chosen.label} had the highest tree-ensemble score. ${simState.hyperparams.rf_n_estimators ?? 50} trees vote, and the standard deviation across trees becomes the exploration bonus — more disagreement = more uncertainty.`;
    case "rf_ts":
      return `${chosen.label} won the random-forest Thompson-style score this step (${shownScore}). Instead of showing a separate bonus, the ensemble explores through disagreement among tree predictions.`;
  }
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
      ],
      b: [0, 0],
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
