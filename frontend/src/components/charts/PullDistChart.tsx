"use client";

import { EmptyChart } from "@/components/shared/EmptyChart";
import { CHART_THEME } from "@/lib/chart-theme";
import type { Arm, ArmState } from "@/lib/types";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface PullDistChartProps {
  arms: Arm[];
  armStates: ArmState[];
  width?: number;
  height?: number;
}

export function PullDistChart({ arms, armStates, width = 200, height = 110 }: PullDistChartProps) {
  const totalN = armStates.reduce((s, a) => s + a.n, 0);
  const data = arms.map((arm, i) => ({
    label: arm.label,
    pulls: armStates[i].n,
    color: arm.color,
    pct: totalN > 0 ? ((armStates[i].n / totalN) * 100).toFixed(0) : "0",
  }));

  if (totalN === 0) {
    return <EmptyChart width={width} height={height} message="No pulls yet" />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 16, right: 4, bottom: 22, left: 4 }}
        barCategoryGap="20%"
      >
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#868e96" }}
          tickLine={false}
          axisLine={{ stroke: "#dee2e6" }}
        />
        <YAxis hide />
        <Tooltip
          {...CHART_THEME.tooltip}
          formatter={(value: number) => [`${value} pulls`, "Pulls"]}
          labelFormatter={(label: string) => label}
        />
        <Bar dataKey="pulls" radius={[3, 3, 0, 0]} maxBarSize={60}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
