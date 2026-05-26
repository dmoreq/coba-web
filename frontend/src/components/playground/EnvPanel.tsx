"use client";

import { TruthToggle } from "@/components/shared/TruthToggle";
import { memo } from "react";
import type { SimState } from "@/lib/types";

interface EnvPanelProps {
  simState: SimState;
  showGroundTruth: boolean;
  onToggle: () => void;
}

function EnvPanelComponent({ simState, showGroundTruth, onToggle }: EnvPanelProps) {
  const { arms, armStates, algorithm, history, t } = simState;
  const lastStep = history[history.length - 1];

  return (
    <div>
      <div className="flex justify-between items-center mb-[10px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6">
          Environment
        </span>
        <TruthToggle revealed={showGroundTruth} onToggle={onToggle} />
      </div>

      {algorithm === "linucb" && lastStep?.context && (
        <div className="mb-sm px-[10px] py-[6px] rounded-sm bg-violet-0 text-[11px] text-violet-6 font-mono">
          Context: age={lastStep.context[0].toFixed(3)}, mobile={lastStep.context[1].toFixed(3)}
        </div>
      )}

      {arms.map((arm, i) => {
        const st = armStates[i];
        const mean = st.n === 0 ? null : st.successes / st.n;
        const isTop =
          t > 5 &&
          mean !== null &&
          arms.every(
            (_, j) =>
              j === i ||
              armStates[j].n === 0 ||
              armStates[j].successes / armStates[j].n <= mean + 0.001,
          );

        return (
          <div
            key={arm.id}
            className="flex items-center gap-sm py-[5px] border-b border-gray-0 text-[12px]"
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: arm.color }} />
            <span className="w-[44px] font-medium text-gray-8 flex-shrink-0">{arm.label}</span>
            <div className="flex-1 h-[6px] bg-gray-1 rounded-full overflow-hidden">
              {mean !== null && (
                <div
                  className="h-full rounded-full transition-all duration-base"
                  style={{
                    width: `${mean * 100}%`,
                    background: arm.color,
                    opacity: 0.75,
                  }}
                />
              )}
            </div>
            <div className="w-[88px] text-right font-mono text-[11px] text-gray-6 flex-shrink-0 tabular-nums">
              {mean !== null ? `${(mean * 100).toFixed(1)}%` : "\u2014"}
              <span className="text-gray-4 ml-[5px]">n={st.n}</span>
            </div>
            {showGroundTruth && (
              <div
                className="w-[34px] text-right font-mono text-[11px] font-semibold flex-shrink-0"
                style={{ color: arm.color }}
              >
                {(arm.trueProb * 100).toFixed(0)}%
              </div>
            )}
            {isTop && (
              <span
                className="text-[9px] px-[5px] py-[1px] rounded-full font-bold flex-shrink-0"
                style={{ background: arm.lightColor, color: arm.color }}
              >
                leads
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const EnvPanel = memo(EnvPanelComponent);
