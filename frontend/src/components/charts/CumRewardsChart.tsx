"use client";

import { memo } from "react";
import { EmptyChart } from "@/components/shared/EmptyChart";
import { CHART_THEME } from "@/lib/chart-theme";
import { MAX_HISTORY_LENGTH } from "@/lib/constants";
import type { StepRecord } from "@/lib/types";
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

interface CumRewardsChartProps {
  history: StepRecord[];
  width?: number;
  height?: number;
  color?: string;
}

function CumRewardsChartComponent({
  history,
  width = 280,
  height = 110,
  color = "#12b886",
}: CumRewardsChartProps) {
  if (history.length < 2) {
    return <EmptyChart width={width} height={height} message="Run some steps to see rewards" />;
  }

  let cum = 0;
  const fullData = history.map((h) => {
    cum += h.outcome;
    return { t: h.t, rewards: cum };
  });
  const step = Math.max(1, Math.floor(fullData.length / MAX_HISTORY_LENGTH));
  const data = fullData.filter((_, i) => i % step === 0 || i === fullData.length - 1);
  const maxR = Math.max(...data.map((d) => d.rewards), 0.01);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 22, left: 4 }}>
        <CartesianGrid {...CHART_THEME.grid} />
        <XAxis
          dataKey="t"
          {...CHART_THEME.axis}
          label={{
            value: `t=${fullData.length}`,
            position: "insideBottomRight",
            offset: -2,
            fontSize: 9,
            fill: "#adb5bd",
          }}
        />
        <YAxis
          {...CHART_THEME.axis}
          domain={[0, maxR * 1.1]}
          tickFormatter={(v: number) => v.toFixed(0)}
          width={24}
        />
        <Tooltip
          {...CHART_THEME.tooltip}
          formatter={(v: number) => [v.toFixed(0), "Rewards"]}
          labelFormatter={(t: number) => `Step ${t}`}
        />
        <defs>
          <linearGradient id={`rewardsGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="rewards"
          fill={`url(#rewardsGrad-${color.replace("#", "")})`}
          stroke="none"
        />
        <Line
          type="monotone"
          dataKey="rewards"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export const CumRewardsChart = memo(CumRewardsChartComponent);
