import { CONTEXTUAL_ALGORITHMS } from "@/lib/constants";
import type { AlgorithmId, Arm, StepRecord } from "@/lib/types";
import { memo, useState } from "react";

interface StepFeedEntryProps {
  step: StepRecord;
  arms: Arm[];
  compact?: boolean;
  featureNames?: string[];
  featureLabels?: string[];
  algorithm?: AlgorithmId;
}

function StepFeedEntryComponent({
  step,
  arms,
  compact = false,
  featureNames = [],
  featureLabels = [],
  algorithm = "ucb1",
}: StepFeedEntryProps) {
  const chosen = arms[step.chosenIdx];
  const isReward = step.outcome === 1;
  const [showContext, setShowContext] = useState(() => CONTEXTUAL_ALGORITHMS.has(algorithm));
  const hasContext = step.context && featureNames.length > 0;

  return (
    <div className="p-[8px_10px] rounded-sm mb-1 border border-gray-2 bg-white text-[12px] font-sans">
      {/* Header */}
      <div className="flex justify-between mb-1 items-center">
        <span className="font-semibold text-gray-8 font-mono text-[11px]">Step {step.t}</span>
        <span
          className={`text-[10px] font-bold px-[7px] py-[2px] rounded-full ${
            isReward ? "bg-green-0 text-green-6" : "bg-red-0 text-red-6"
          }`}
        >
          {isReward ? "+1 click" : "0 no click"}
        </span>
      </div>

      {/* Chosen arm */}
      <div className="flex items-center gap-[6px] text-gray-7">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: chosen.color }} />
        <span className="font-medium" style={{ color: chosen.color }}>
          {chosen.label}
        </span>
        <span className="text-gray-5 text-[11px]">·</span>
        <span className="font-mono text-[11px] text-gray-6">
          score={Math.min(step.scores[step.chosenIdx]?.score ?? 0, 99).toFixed(3)}
        </span>
        {step.wasRandom && (
          <span className="text-[10px] px-[5px] py-[1px] rounded-xs bg-orange-0 text-[#e8590c]">
            random
          </span>
        )}
      </div>

      {/* Context */}
      {hasContext && !compact && (
        <div className="mt-[6px]">
          <button
            type="button"
            onClick={() => setShowContext(!showContext)}
            className="text-[9px] text-violet-6 cursor-pointer font-medium hover:underline"
          >
            {showContext ? "▼" : "▶"} context
          </button>
          {showContext && (
            <div
              data-testid="context-values"
              className="mt-[5px] ml-[8px] space-y-[3px] text-[10px] font-mono text-gray-6"
            >
              {step.context?.map((val, i) => (
                <div key={i}>
                  <span className="font-medium">{featureLabels[i] || featureNames[i]}:</span>{" "}
                  {val.toFixed(2)}
                </div>
              ))}
              {step.contextSegment && (
                <div className="text-[9px] text-violet-6 font-medium">
                  segment: {step.contextSegment}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Regret */}
      {!compact && step.cumRegret !== undefined && (
        <div className="mt-1 text-[10px] text-gray-5 flex gap-sm">
          <span>step regret: {step.stepRegret.toFixed(3)}</span>
          <span>total: {step.cumRegret.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

export const StepFeedEntry = memo(StepFeedEntryComponent);
