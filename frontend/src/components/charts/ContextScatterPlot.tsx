"use client";

import type { Arm, StepRecord } from "@/lib/types";
import { memo, useMemo } from "react";

interface ContextScatterPlotProps {
  history: StepRecord[];
  arms: Arm[];
  featureNames: string[];
  featureLabels: string[];
  width?: number;
  height?: number;
}

function ContextScatterPlotComponent({
  history,
  arms,
  featureNames,
  featureLabels,
  width = 320,
  height = 280,
}: ContextScatterPlotProps) {
  // Only works with exactly 2 features
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

  // Find feature ranges from history
  const ranges = useMemo(() => {
    let xMin = Infinity,
      xMax = -Infinity,
      yMin = Infinity,
      yMax = -Infinity;

    for (const step of history) {
      if (step.context && step.context.length === 2) {
        xMin = Math.min(xMin, step.context[0]);
        xMax = Math.max(xMax, step.context[0]);
        yMin = Math.min(yMin, step.context[1]);
        yMax = Math.max(yMax, step.context[1]);
      }
    }

    // Add some padding to ranges
    const xPad = (xMax - xMin) * 0.1 || 0.5;
    const yPad = (yMax - yMin) * 0.1 || 0.5;

    return {
      xMin: xMin - xPad,
      xMax: xMax + xPad,
      yMin: yMin - yPad,
      yMax: yMax + yPad,
    };
  }, [history]);

  // Map context value to pixel coordinate
  const xToPixel = (x: number) => {
    const ratio = (x - ranges.xMin) / (ranges.xMax - ranges.xMin);
    return padding + ratio * chartWidth;
  };

  const yToPixel = (y: number) => {
    const ratio = (ranges.yMax - y) / (ranges.yMax - ranges.yMin); // Flip Y
    return padding + ratio * chartHeight;
  };

  // Group points by arm for rendering (so we can color them)
  const pointsByArm = useMemo(() => {
    const groups: Record<number, Array<{ x: number; y: number; step: number }>> = {};
    for (let i = 0; i < arms.length; i++) {
      groups[i] = [];
    }

    for (const step of history) {
      if (step.context && step.context.length === 2) {
        const armIdx = step.chosenIdx;
        groups[armIdx].push({
          x: xToPixel(step.context[0]),
          y: yToPixel(step.context[1]),
          step: step.t,
        });
      }
    }

    return groups;
  }, [history, xToPixel, yToPixel]);

  // Format axis labels
  const xAxisLabel = featureLabels[0] || featureNames[0];
  const yAxisLabel = featureLabels[1] || featureNames[1];

  const xMin = ranges.xMin.toFixed(2);
  const xMax = ranges.xMax.toFixed(2);
  const yMin = ranges.yMin.toFixed(2);
  const yMax = ranges.yMax.toFixed(2);

  return (
    <div className="flex flex-col">
      <svg width={width} height={height} className="bg-white">
        {/* Grid background */}
        <rect x={padding} y={padding} width={chartWidth} height={chartHeight} fill="#fafafa" />

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const x = padding + frac * chartWidth;
          const y = padding + frac * chartHeight;
          return (
            <g key={`grid-${frac}`}>
              <line x1={x} y1={padding} x2={x} y2={padding + chartHeight} stroke="#e9ecef" strokeWidth="1" />
              <line x1={padding} y1={y} x2={padding + chartWidth} y2={y} stroke="#e9ecef" strokeWidth="1" />
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={padding + chartHeight} stroke="#333" strokeWidth="2" />
        <line
          x1={padding}
          y1={padding + chartHeight}
          x2={padding + chartWidth}
          y2={padding + chartHeight}
          stroke="#333"
          strokeWidth="2"
        />

        {/* Axis labels */}
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

        {/* Data points by arm */}
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

        {/* Axis tick labels */}
        <text x={padding - 5} y={padding + chartHeight + 20} textAnchor="end" fontSize="9" fill="#666">
          {xMin}
        </text>
        <text x={padding + chartWidth + 5} y={padding + chartHeight + 20} fontSize="9" fill="#666">
          {xMax}
        </text>
        <text x={padding - 8} y={padding + 3} textAnchor="end" fontSize="9" fill="#666">
          {yMax}
        </text>
        <text x={padding - 8} y={padding + chartHeight + 3} textAnchor="end" fontSize="9" fill="#666">
          {yMin}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex gap-[12px] mt-[8px] flex-wrap text-[11px]">
        {arms.map((arm) => (
          <div key={arm.id} className="flex items-center gap-[5px]">
            <div className="w-[10px] h-[10px] rounded-full" style={{ background: arm.color }} />
            <span className="text-gray-7">{arm.label}</span>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="text-[9px] text-gray-5 mt-[6px]">
        {history.filter((s) => s.context).length} contexts, recent points larger
      </div>
    </div>
  );
}

export const ContextScatterPlot = memo(ContextScatterPlotComponent);
