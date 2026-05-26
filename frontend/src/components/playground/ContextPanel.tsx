"use client";

import type { SimState } from "@/lib/types";
import { memo } from "react";

interface ContextPanelProps {
  simState: SimState;
  contextSegment: string | null;
}

function ContextPanelComponent({ simState, contextSegment }: ContextPanelProps) {
  const { featureNames, featureLabels, history } = simState;
  const lastStep = history[history.length - 1];

  if (!lastStep?.context || featureNames.length === 0) {
    return null;
  }

  const context = lastStep.context;

  return (
    <div>
      <div className="flex items-center justify-between mb-[10px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6">
          Context
        </span>
        {contextSegment && (
          <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-violet-0 text-violet-6 font-medium">
            {contextSegment}
          </span>
        )}
      </div>

      <div className="space-y-[8px]">
        {context.map((value, i) => {
          const featureName = featureLabels[i] || featureNames[i] || `Feature ${i}`;
          // Normalize value to [0, 1] for bar display (assuming [-1, 1] input range)
          const normalized = (value + 1) / 2;
          const displayValue = value.toFixed(2);

          // Interpret the value
          let interpretation = "";
          if (value < -0.5) {
            interpretation = "low";
          } else if (value > 0.5) {
            interpretation = "high";
          } else {
            interpretation = "mid";
          }

          return (
            <div key={i} className="flex items-center gap-[8px]">
              <span className="text-[11px] font-medium text-gray-7 w-[120px] flex-shrink-0 truncate">
                {featureName}
              </span>
              <div className="flex-1 h-[5px] bg-gray-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-5 rounded-full transition-all duration-base"
                  style={{ width: `${normalized * 100}%` }}
                />
              </div>
              <div className="text-[10px] font-mono text-gray-6 w-[50px] text-right flex-shrink-0">
                {displayValue}
              </div>
              <span className="text-[9px] text-gray-5 w-[40px] flex-shrink-0">
                {interpretation}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ContextPanel = memo(ContextPanelComponent);
