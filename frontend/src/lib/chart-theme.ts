/** Shared Recharts configuration for consistent chart styling. */

export const CHART_THEME = {
  axis: {
    tick: { fontSize: 9, fill: "#adb5bd" },
    tickLine: false,
    axisLine: { stroke: "#dee2e6" },
  },
  grid: {
    strokeDasharray: "3 3" as const,
    stroke: "#f1f3f5",
    vertical: false,
  },
  tooltip: {
    contentStyle: {
      fontSize: 11,
      fontFamily: "'Inter', sans-serif",
      borderRadius: 4,
      border: "1px solid #dee2e6",
    },
  },
};
