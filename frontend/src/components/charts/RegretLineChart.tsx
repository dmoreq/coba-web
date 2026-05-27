"use client";

import { EmptyChart } from "@/components/shared/EmptyChart";
import { CHART_THEME } from "@/lib/chart-theme";
import { MAX_HISTORY_LENGTH } from "@/lib/constants";
import { memo } from "react";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface RegretLineChartProps {
  regretHistory: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Absolute simulation step when drift starts (scenario config). */
  driftStep?: number;
  /** Absolute simulation step when drift ends (scenario config). */
  driftEndStep?: number;
  /** Current simulation step; maps windowed regretHistory to absolute t on the x-axis. */
  totalSteps?: number;
}

/** First absolute step index represented by regretHistory[0]. */
export function historyStartStep(totalSteps: number, historyLength: number): number {
  if (historyLength <= 0) return 1;
  return Math.max(1, totalSteps - historyLength + 1);
}

function RegretLineChartComponent({
  regretHistory,
  width = 280,
  height = 110,
  color = "#228be6",
  driftStep,
  driftEndStep,
  totalSteps,
}: RegretLineChartProps) {
  if (regretHistory.length < 2) {
    return <EmptyChart width={width} height={height} message="Run some steps to see regret" />;
  }

  const startT = totalSteps != null ? historyStartStep(totalSteps, regretHistory.length) : 1;
  const data = regretHistory.map((r, i) => ({ t: startT + i, regret: r }));
  const step = Math.max(1, Math.floor(data.length / MAX_HISTORY_LENGTH));
  const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);
  const maxR = Math.max(...regretHistory, 0.01);
  const domainMin = data[0]?.t ?? 1;
  const domainMax = data[data.length - 1]?.t ?? domainMin;
  const showDriftBegin = driftStep != null && driftStep >= domainMin && driftStep <= domainMax;
  const showDriftEnd =
    driftEndStep != null && driftEndStep >= domainMin && driftEndStep <= domainMax;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={sampled} margin={{ top: 8, right: 12, bottom: 22, left: 4 }}>
        <CartesianGrid {...CHART_THEME.grid} />
        <XAxis
          dataKey="t"
          type="number"
          domain={[domainMin, domainMax]}
          allowDataOverflow
          {...CHART_THEME.axis}
          label={{
            value: `t=${data.length}`,
            position: "insideBottomRight",
            offset: -2,
            fontSize: 9,
            fill: "#adb5bd",
          }}
        />
        <YAxis
          {...CHART_THEME.axis}
          domain={[0, maxR * 1.1]}
          tickFormatter={(v: number) => v.toFixed(1)}
          width={24}
        />
        <Tooltip
          {...CHART_THEME.tooltip}
          formatter={(v: number) => [v.toFixed(3), "Regret"]}
          labelFormatter={(t: number) => `Step ${t}`}
        />
        <defs>
          <linearGradient id={`regretGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="regret"
          fill={`url(#regretGrad-${color.replace("#", "")})`}
          stroke="none"
        />
        <Line
          type="monotone"
          dataKey="regret"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
        {showDriftBegin && (
          <ReferenceLine
            x={driftStep}
            stroke="#e8590c"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: "Drift begins",
              position: "insideTopLeft",
              fontSize: 9,
              fill: "#e8590c",
            }}
          />
        )}
        {showDriftEnd && (
          <ReferenceLine
            x={driftEndStep}
            stroke="#e8590c"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: "Drift complete",
              position: "insideTopRight",
              fontSize: 9,
              fill: "#e8590c",
            }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

export const RegretLineChart = memo(RegretLineChartComponent);
