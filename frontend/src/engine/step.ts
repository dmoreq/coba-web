import { HIDDEN_WEIGHTS } from "./constants";
import { dot2, sigmoid } from "./math";
import { computeScores } from "./scores";
import type { RngFn, SimState } from "./types";

/**
 * Advance the simulation by one step.
 * Pure reducer: (state, rng) → new state (no mutations).
 */
export function runStep(simState: SimState, rng: RngFn): SimState {
  const { arms, armStates, linMeta, algorithm, alpha, epsilon, t, regretHistory } = simState;
  const context: [number, number] = [rng() * 2 - 1, rng() * 2 - 1];
  const newT = t + 1;

  const scores = computeScores(armStates, linMeta, algorithm, newT, alpha, context);

  // Choose arm
  let chosenIdx: number;
  let wasRandom = false;

  if (algorithm === "epsilon" && rng() < epsilon) {
    chosenIdx = Math.floor(rng() * arms.length);
    wasRandom = true;
  } else {
    chosenIdx = scores.reduce((best, s, i) => (s.score > scores[best].score ? i : best), 0);
  }

  // Compute true probability (contextual or fixed)
  let trueProb: number;
  let optimalProb: number;

  if (algorithm === "linucb") {
    const probs = HIDDEN_WEIGHTS.map((w) => sigmoid(dot2(w.weights, context) + w.bias));
    trueProb = probs[chosenIdx];
    optimalProb = Math.max(...probs);
  } else {
    trueProb = arms[chosenIdx].trueProb;
    optimalProb = Math.max(...arms.map((a) => a.trueProb));
  }

  const outcome = rng() < trueProb ? 1 : 0;
  const stepRegret = optimalProb - trueProb;
  const cumRegret = (regretHistory[regretHistory.length - 1] || 0) + stepRegret;

  // Update arm state
  const newArmStates = armStates.map((s, i) =>
    i !== chosenIdx
      ? s
      : {
          n: s.n + 1,
          successes: s.successes + outcome,
          failures: s.failures + (1 - outcome),
        },
  );

  // Update LinUCB A matrix and b vector
  const x = context;
  const newLinMeta = linMeta.map((meta, i) =>
    i !== chosenIdx
      ? meta
      : {
          A: [
            [meta.A[0][0] + x[0] * x[0], meta.A[0][1] + x[0] * x[1]],
            [meta.A[1][0] + x[1] * x[0], meta.A[1][1] + x[1] * x[1]],
          ] as [[number, number], [number, number]],
          b: [meta.b[0] + outcome * x[0], meta.b[1] + outcome * x[1]] as [number, number],
        },
  );

  return {
    ...simState,
    t: newT,
    armStates: newArmStates,
    linMeta: newLinMeta,
    history: [
      ...simState.history,
      {
        t: newT,
        chosenIdx,
        outcome,
        stepRegret,
        cumRegret,
        scores: scores.map((s) => ({ ...s })),
        context,
        wasRandom,
        trueProb,
      },
    ].slice(-150),
    regretHistory: [...regretHistory, cumRegret],
  };
}
