import { dot2, inv2x2, matVec2, sampleBeta, sigmoid } from "./math";
import type { ArmState, LinMeta, Score } from "./types";

export function scoreUCB1(state: ArmState, t: number, alpha: number): Score {
  if (state.n === 0) {
    return { mean: 0, bonus: 99, score: 99, formula: "No data yet — must explore" };
  }
  const mean = state.successes / state.n;
  const bonus = alpha * Math.sqrt((2 * Math.log(Math.max(t, 2))) / state.n);
  return {
    mean,
    bonus,
    score: mean + bonus,
    formula: `mean(${mean.toFixed(3)}) + α√(2ln(${t})/${state.n}) = ${(mean + bonus).toFixed(3)}`,
  };
}

export function scoreEpsilon(state: ArmState): Score {
  const mean = state.n === 0 ? 0 : state.successes / state.n;
  return {
    mean,
    bonus: 0,
    score: mean,
    formula: `Mean estimate: ${mean.toFixed(3)} (n=${state.n})`,
  };
}

export function scoreThompson(state: ArmState): Score {
  const a = state.successes + 1;
  const b = state.failures + 1;
  const sample = sampleBeta(a, b);
  const mean = a / (a + b);
  return {
    mean,
    sample,
    bonus: 0,
    score: sample,
    formula: `Sample ~ Beta(${a}, ${b}) = ${sample.toFixed(3)}`,
  };
}

export function scoreLinUCB(linMeta: LinMeta, context: [number, number], alpha: number): Score {
  const Ainv = inv2x2(linMeta.A);
  const theta = matVec2(Ainv, linMeta.b);
  const exploit = dot2(context, theta);
  const uncertainty = Math.sqrt(Math.max(0, dot2(context, matVec2(Ainv, context))));
  const bonus = alpha * uncertainty;
  return {
    mean: sigmoid(exploit),
    bonus,
    score: exploit + bonus,
    formula: `θᵀx(${exploit.toFixed(2)}) + α√xᵀA⁻¹x(${bonus.toFixed(2)}) = ${(exploit + bonus).toFixed(3)}`,
  };
}

export function computeScores(
  armStates: ArmState[],
  linMeta: LinMeta[],
  algorithm: string,
  t: number,
  alpha: number,
  context: [number, number],
): Score[] {
  return armStates.map((state, i) => {
    switch (algorithm) {
      case "ucb1":
        return scoreUCB1(state, t, alpha);
      case "epsilon":
        return scoreEpsilon(state);
      case "thompson":
        return scoreThompson(state);
      case "linucb":
        return scoreLinUCB(linMeta[i], context, alpha);
      default:
        return scoreUCB1(state, t, alpha);
    }
  });
}
