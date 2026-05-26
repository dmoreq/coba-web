import { ALGO_META } from "@/lib/constants";
import type { Arm, StepRecord } from "@/lib/types";

interface StepFeedEntryProps {
  step: StepRecord;
  arms: Arm[];
  compact?: boolean;
}

export function StepFeedEntry({ step, arms, compact = false }: StepFeedEntryProps) {
  const chosen = arms[step.chosenIdx];
  const isReward = step.outcome === 1;

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
