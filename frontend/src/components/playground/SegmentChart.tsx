"use client";

import { memo } from "react";

export interface SegmentChartSegment {
  name: string;
  weight: number;
}

interface SegmentChartProps {
  segments: SegmentChartSegment[];
  currentSegment?: string | null;
}

function segmentTestId(name: string): string {
  return `segment-${name.replace(/\s+/g, "-")}`;
}

function SegmentChartComponent({ segments, currentSegment }: SegmentChartProps) {
  if (segments.length === 0) return null;

  return (
    <div className="mt-[10px]" data-testid="segment-chart">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-5 mb-[6px]">
        Population segments
      </div>
      <div className="flex h-[10px] rounded-full overflow-hidden border border-gray-2 mb-[8px]">
        {segments.map((seg) => {
          const pct = Math.round(seg.weight * 100);
          const isActive = currentSegment === seg.name;
          return (
            <div
              key={seg.name}
              data-testid={segmentTestId(seg.name)}
              title={`${seg.name} (${pct}%)`}
              className={`h-full transition-all ${isActive ? "ring-2 ring-violet-5 ring-offset-1" : ""}`}
              style={{
                width: `${pct}%`,
                background: isActive ? "#7950f2" : "#dee2e6",
              }}
            />
          );
        })}
      </div>
      <ul className="space-y-[4px]">
        {segments.map((seg) => {
          const pct = Math.round(seg.weight * 100);
          const isActive = currentSegment === seg.name;
          return (
            <li
              key={seg.name}
              className={`flex justify-between text-[11px] ${isActive ? "font-semibold text-violet-7" : "text-gray-6"}`}
            >
              <span>{seg.name}</span>
              <span className="font-mono tabular-nums">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const SegmentChart = memo(SegmentChartComponent);
