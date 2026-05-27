"use client";

import { ContextPanel } from "@/components/playground/ContextPanel";
import { TruthToggle } from "@/components/shared/TruthToggle";
import { CONTEXTUAL_ALGORITHMS, getCurrentTrueProb, isBestArmRightNow } from "@/lib/constants";
import type { SimState } from "@/lib/types";
import { memo } from "react";

interface EnvPanelProps {
  simState: SimState;
  showGroundTruth: boolean;
  onToggle: () => void;
}

function EnvPanelComponent({ simState, showGroundTruth, onToggle }: EnvPanelProps) {
  const { arms, armStates, algorithm, history } = simState;
  const lastStep = history[history.length - 1];

  return (
    <div>
      <div className="flex justify-between items-center mb-[10px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6">
          Environment
        </span>
        <TruthToggle revealed={showGroundTruth} onToggle={onToggle} />
      </div>

      {/* Show ContextPanel for all contextual algorithms */}
      {CONTEXTUAL_ALGORITHMS.has(algorithm) && (
        <div className="mb-sm">
          <ContextPanel simState={simState} contextSegment={lastStep?.contextSegment ?? null} />
        </div>
      )}

      {arms.map((arm, i) => {
        const st = armStates[i];
        const mean = st.n === 0 ? null : st.successes / st.n;
        const isContextual = CONTEXTUAL_ALGORITHMS.has(algorithm);
        const displayedTruth = getCurrentTrueProb(simState, i);
        const isTop = isBestArmRightNow(simState, i);
        const badgeText = isContextual ? "best now" : "leads";

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
              {mean !== null ? `${(mean * 100).toFixed(1)}%` : "—"}
              <span className="text-gray-4 ml-[5px]">n={st.n}</span>
            </div>
            {showGroundTruth && (
              <div
                className="w-[34px] text-right font-mono text-[11px] font-semibold flex-shrink-0"
                style={{ color: arm.color }}
              >
                {(displayedTruth * 100).toFixed(0)}%
              </div>
            )}
            {isTop && (
              <span
                className="text-[9px] px-[5px] py-[1px] rounded-full font-bold flex-shrink-0"
                style={{ background: arm.lightColor, color: arm.color }}
              >
                {badgeText}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const EnvPanel = memo(EnvPanelComponent);
