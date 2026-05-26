"use client";

import { EmptyChart } from "@/components/shared/EmptyChart";
import { CHART_THEME } from "@/lib/chart-theme";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DualRegretChartProps {
  histA: number[];
  histB: number[];
  colorA: string;
  colorB: string;
  labelA: string;
  labelB: string;
  width?: number;
  height?: number;
}

export function DualRegretChart({
  histA,
  histB,
  colorA,
  colorB,
  labelA,
  labelB,
  width = 560,
  height = 140,
}: DualRegretChartProps) {
  const maxLen = Math.max(histA.length, histB.length, 2);
  const maxR = Math.max(...histA, ...histB, 0.01);
  const data: { t: number; [key: string]: number }[] = [];
  for (let i = 0; i < maxLen; i++) {
    data.push({ t: i + 1, [labelA]: histA[i] ?? null, [labelB]: histB[i] ?? null });
  }

  if (data.length < 2) {
    return <EmptyChart width={width} height={height} message="Run some steps to see regret" />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 22, left: 8 }}>
        <CartesianGrid {...CHART_THEME.grid} />
        <XAxis dataKey="t" {...CHART_THEME.axis} />
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
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: "'Inter', sans-serif" }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey={labelA}
          stroke={colorA}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey={labelB}
          stroke={colorB}
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={false}
          activeDot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
