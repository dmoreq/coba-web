"use client";

import type { AlgorithmId, Arm, StepRecord } from "@/lib/types";
import { memo, useMemo } from "react";
import { StepFeedEntry } from "./StepFeedEntry";

interface StepFeedProps {
  history: StepRecord[];
  arms: Arm[];
  t: number;
  featureNames?: string[];
  featureLabels?: string[];
  algorithm?: AlgorithmId;
}

function StepFeedComponent({
  history,
  arms,
  t,
  featureNames = [],
  featureLabels = [],
  algorithm = "ucb1",
}: StepFeedProps) {
  const recentSteps = useMemo(() => [...history].reverse().slice(0, 14), [history]);

  return (
    <div
      className="w-[296px] flex-shrink-0 border-r border-gray-3 flex flex-col bg-[#fafafa]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="px-3 py-[10px] pb-sm border-b border-gray-1 flex-shrink-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-5">
          Step Feed
        </div>
        {t === 0 && <div className="text-[12px] text-gray-4 mt-1">Press Play or Step to begin</div>}
      </div>
      <div className="flex-1 overflow-y-auto p-[8px]">
        {recentSteps.map((step) => (
          <StepFeedEntry
            key={step.t}
            step={step}
            arms={arms}
            compact={false}
            featureNames={featureNames}
            featureLabels={featureLabels}
            algorithm={algorithm}
          />
        ))}
      </div>
    </div>
  );
}

export const StepFeed = memo(StepFeedComponent);
