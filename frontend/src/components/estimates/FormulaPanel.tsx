import type { AlgorithmId, Arm, SimState } from "@/lib/types";

interface FormulaPanelProps {
  simState: SimState;
}

const FORMULA_LABELS: Record<AlgorithmId, string> = {
  ucb1: "Formula: score = \u03BC\u0302 + \u03B1\u221A(2\u00B7ln(t)/n)",
  thompson: "Posterior: Beta(successes+1, failures+1)",
  linucb: "score = \u03B8\u1D56x + \u03B1\u221A(x\u1D56A\u207B\u00B9x)",
  epsilon: "score = mean estimate",
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
