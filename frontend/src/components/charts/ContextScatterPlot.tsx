"use client";

import type { Arm, StepRecord } from "@/lib/types";
import { memo, useMemo } from "react";

interface ContextScatterPlotProps {
  history: StepRecord[];
  arms: Arm[];
  featureNames: string[];
  featureLabels: string[];
  featureMins?: number[];
  featureMaxs?: number[];
  totalSteps?: number;
  historyWindow?: number;
  width?: number;
  height?: number;
}

function ContextScatterPlotComponent({
  history,
  arms,
  featureNames,
  featureLabels,
  featureMins,
  featureMaxs,
  totalSteps,
  historyWindow,
  width = 320,
  height = 280,
}: ContextScatterPlotProps) {
  if (featureNames.length !== 2 || history.length === 0) {
    return (
      <div className="flex items-center justify-center text-[12px] text-gray-5">
        Scatter plot requires exactly 2 context features
      </div>
    );
  }

  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  const ranges = useMemo(
    () => ({
      xMin: featureMins?.[0] ?? -1,
      xMax: featureMaxs?.[0] ?? 1,
      yMin: featureMins?.[1] ?? -1,
      yMax: featureMaxs?.[1] ?? 1,
    }),
    [featureMins, featureMaxs],
  );

  const pointsByArm = useMemo(() => {
    const groups: Record<number, Array<{ x: number; y: number; step: number }>> = {};
    for (let i = 0; i < arms.length; i++) {
      groups[i] = [];
    }

    const xSpan = ranges.xMax - ranges.xMin || 1;
    const ySpan = ranges.yMax - ranges.yMin || 1;

    for (const step of history) {
      if (step.context && step.context.length === 2) {
        const armIdx = step.chosenIdx;
        const xRatio = (step.context[0] - ranges.xMin) / xSpan;
        const yRatio = (ranges.yMax - step.context[1]) / ySpan;
        groups[armIdx].push({
          x: padding + xRatio * chartWidth,
          y: padding + yRatio * chartHeight,
          step: step.t,
        });
      }
    }

    return groups;
  }, [arms.length, chartHeight, chartWidth, history, ranges]);

  const xAxisLabel = featureLabels[0] || featureNames[0];
  const yAxisLabel = featureLabels[1] || featureNames[1];

  const xMinLabel = ranges.xMin.toFixed(2);
  const xMaxLabel = ranges.xMax.toFixed(2);
  const yMinLabel = ranges.yMin.toFixed(2);
  const yMaxLabel = ranges.yMax.toFixed(2);

  const subtitle =
    totalSteps != null && historyWindow != null
      ? `Showing last ${historyWindow} steps (total: ${totalSteps})`
      : `${history.filter((s) => s.context).length} contexts, recent points larger`;

  return (
    <div className="flex flex-col">
      <svg width={width} height={height} className="bg-white">
        <rect x={padding} y={padding} width={chartWidth} height={chartHeight} fill="#fafafa" />

        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const x = padding + frac * chartWidth;
          const y = padding + frac * chartHeight;
          return (
            <g key={`grid-${frac}`}>
              <line
                x1={x}
                y1={padding}
                x2={x}
                y2={padding + chartHeight}
                stroke="#e9ecef"
                strokeWidth="1"
              />
              <line
                x1={padding}
                y1={y}
                x2={padding + chartWidth}
                y2={y}
                stroke="#e9ecef"
                strokeWidth="1"
              />
            </g>
          );
        })}

        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={padding + chartHeight}
          stroke="#333"
          strokeWidth="2"
        />
        <line
          x1={padding}
          y1={padding + chartHeight}
          x2={padding + chartWidth}
          y2={padding + chartHeight}
          stroke="#333"
          strokeWidth="2"
        />

        <text
          x={padding + chartWidth / 2}
          y={height - 5}
          textAnchor="middle"
          fontSize="11"
          fontWeight="500"
          fill="#495057"
        >
          {xAxisLabel}
        </text>
        <text
          x={15}
          y={padding + chartHeight / 2}
          textAnchor="middle"
          fontSize="11"
          fontWeight="500"
          fill="#495057"
          transform={`rotate(-90 15 ${padding + chartHeight / 2})`}
        >
          {yAxisLabel}
        </text>

        {arms.map((arm, armIdx) => (
          <g key={`arm-${armIdx}`}>
            {pointsByArm[armIdx].map((point, i) => {
              const isRecent = history.length - point.step < 10;
              const size = isRecent ? 4 : 2.5;
              const opacity = isRecent ? 0.8 : 0.5;

              return (
                <circle
                  key={`point-${armIdx}-${i}`}
                  cx={point.x}
                  cy={point.y}
                  r={size}
                  fill={arm.color}
                  opacity={opacity}
                />
              );
            })}
          </g>
        ))}

        <text
          x={padding - 5}
          y={padding + chartHeight + 20}
          textAnchor="end"
          fontSize="9"
          fill="#666"
          data-testid="x-axis-min"
        >
          {xMinLabel}
        </text>
        <text
          x={padding + chartWidth + 5}
          y={padding + chartHeight + 20}
          fontSize="9"
          fill="#666"
          data-testid="x-axis-max"
        >
          {xMaxLabel}
        </text>
        <text x={padding - 8} y={padding + 3} textAnchor="end" fontSize="9" fill="#666">
          {yMaxLabel}
        </text>
        <text
          x={padding - 8}
          y={padding + chartHeight + 3}
          textAnchor="end"
          fontSize="9"
          fill="#666"
        >
          {yMinLabel}
        </text>
      </svg>

      <div className="flex gap-[12px] mt-[8px] flex-wrap text-[11px]">
        {arms.map((arm) => (
          <div key={arm.id} className="flex items-center gap-[5px]">
            <div className="w-[10px] h-[10px] rounded-full" style={{ background: arm.color }} />
            <span className="text-gray-7">{arm.label}</span>
          </div>
        ))}
      </div>

      <div className="text-[9px] text-gray-5 mt-[6px]">{subtitle}</div>
    </div>
  );
}

export const ContextScatterPlot = memo(ContextScatterPlotComponent);
