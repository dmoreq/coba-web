import type { AlgorithmId, Arm, SimState } from "@/lib/types";

interface FormulaPanelProps {
  simState: SimState;
}

const FORMULA_LABELS: Record<AlgorithmId, string> = {
  ucb1: "Formula: score = \u03BC\u0302 + \u03B1\u221A(2\u00B7ln(t)/n)",
  thompson: "Posterior: Beta(successes+1, failures+1)",
  epsilon_greedy: "score = mean estimate",
  linucb: "score = \u03B8\u1D56x + \u03B1\u221A(x\u1D56A\u207B\u00B9x)",
  lints: "score = \u03B8\u1D56x (sampled from posterior N(\u03BC, v\u00B2))",
  linucb_hybrid: "score = z\u1D56\u03B2 + x\u1D56\u03B8\u1D56 + \u03B1\u221A(...)",
  linucb_sw: "score = \u03B8\u1D56x + \u03B1\u221A(x\u1D56A\u207B\u00B9x) (sliding window)",
  softmax: "P(arm) = exp(\u03C4\u00B7score) / \u03A3exp(\u03C4\u00B7score)",
  neural_linear: "score = \u03C6(x)\u1D56\u03B8\u1D56 (MLP embedding + LinTS head)",
  bootstrapped_ts: "score ~ mean(\u03B8\u2081..\u2096) + sample(std(\u03B8\u2081..\u2096))",
  bootstrapped_ucb: "score = mean(\u03B8\u2081..\u2096) + std(\u03B8\u2081..\u2096)",
  logistic_ucb: "score = \u03C3(\u03B8x) + \u03B1\u00B7\u03C3\u2080(\u03B8x)",
  logistic_ts: "score ~ \u03C3(\u03B8x) sampled from Laplace posterior",
  gp_ucb: "score = \u03BC(x) + \u03B2\u00B7\u03C3(x) (GP posterior)",
  random_forest_ucb: "score = mean(trees) + std(trees)",
  random_forest_ts: "score ~ random tree prediction",
};

export function FormulaPanel({ simState }: FormulaPanelProps) {
  const { arms, history, algorithm } = simState;
  const lastStep = history[history.length - 1];
  if (!lastStep) return null;

  return (
    <div className="bg-dark-7 rounded-sm px-3 py-[10px] mb-[10px]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-dark-3 mb-[6px]">
        {FORMULA_LABELS[algorithm as AlgorithmId] ?? "Formula"}
      </div>
      {arms.map((arm: Arm, i: number) => (
        <div
          key={arm.id}
          className="text-[11px] font-mono mb-[3px] tabular-nums"
          style={{
            color: lastStep.chosenIdx === i ? arm.color : "#5c5f66",
            fontWeight: lastStep.chosenIdx === i ? 600 : 400,
          }}
        >
          {arm.label.padEnd(6)}: {lastStep.scores[i]?.formula || "\u2014"}
        </div>
      ))}
    </div>
  );
}
