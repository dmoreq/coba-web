"use client";

import type { SimState } from "@/lib/types";
import { memo } from "react";

interface ContextPanelProps {
  simState: SimState;
  contextSegment: string | null;
}

function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

function endpointLabel(
  normalized: number,
  lowLabel: string | undefined,
  highLabel: string | undefined,
): string {
  if (lowLabel && normalized < 0.33) return lowLabel;
  if (highLabel && normalized > 0.67) return highLabel;
  return "";
}

function ContextPanelComponent({ simState, contextSegment }: ContextPanelProps) {
  const {
    featureNames,
    featureLabels,
    featureDescriptions = [],
    featureMins = [],
    featureMaxs = [],
    featureLowLabels = [],
    featureHighLabels = [],
    history,
  } = simState;
  const lastStep = history[history.length - 1];

  if (!lastStep?.context || featureNames.length === 0) {
    return null;
  }

  const context = lastStep.context;
  const featureCount = featureNames.length;

  if (context.length !== featureCount) {
    return (
      <output className="block text-[11px] text-gray-6">
        Context length ({context.length}) does not match feature count ({featureCount}).
      </output>
    );
  }

  if (context.some((v) => !Number.isFinite(v))) {
    return (
      <output className="block text-[11px] text-gray-6">
        Context contains invalid (non-finite) values.
      </output>
    );
  }

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
          const min = featureMins[i] ?? -1;
          const max = featureMaxs[i] ?? 1;
          const normalized = normalizeValue(value, min, max);
          const displayValue = value.toFixed(2);
          const interpretation = endpointLabel(
            normalized,
            featureLowLabels[i],
            featureHighLabels[i],
          );
          const description = featureDescriptions[i];

          return (
            <div key={i} className="flex items-center gap-[8px]">
              <span
                className="text-[11px] font-medium text-gray-7 w-[120px] flex-shrink-0 truncate"
                title={description}
              >
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
              <span
                className="text-[9px] text-gray-5 w-[72px] flex-shrink-0 truncate"
                title={description}
              >
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
