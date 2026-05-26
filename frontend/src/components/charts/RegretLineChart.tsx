"use client";

import { memo } from "react";
import { EmptyChart } from "@/components/shared/EmptyChart";
import { CHART_THEME } from "@/lib/chart-theme";
import { MAX_HISTORY_LENGTH } from "@/lib/constants";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
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
}

function RegretLineChartComponent({
  regretHistory,
  width = 280,
  height = 110,
  color = "#228be6",
}: RegretLineChartProps) {
  if (regretHistory.length < 2) {
    return <EmptyChart width={width} height={height} message="Run some steps to see regret" />;
  }

  const data = regretHistory.map((r, i) => ({ t: i + 1, regret: r }));
  const step = Math.max(1, Math.floor(data.length / MAX_HISTORY_LENGTH));
  const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);
  const maxR = Math.max(...regretHistory, 0.01);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={sampled} margin={{ top: 8, right: 12, bottom: 22, left: 4 }}>
        <CartesianGrid {...CHART_THEME.grid} />
        <XAxis
          dataKey="t"
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
      </LineChart>
    </ResponsiveContainer>
  );
}

export const RegretLineChart = memo(RegretLineChartComponent);
