import { getFormulaLabel } from "@/lib/constants";
import type { Arm, SimState } from "@/lib/types";

interface FormulaPanelProps {
  simState: SimState;
}

export function FormulaPanel({ simState }: FormulaPanelProps) {
  const { arms, history, algorithm } = simState;
  const lastStep = history[history.length - 1];
  if (!lastStep) return null;

  return (
    <div className="bg-dark-7 rounded-sm px-3 py-[10px] mb-[10px]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-dark-3 mb-[6px]">
        {getFormulaLabel(algorithm)}
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
