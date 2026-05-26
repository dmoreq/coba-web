import type { ReactNode } from "react";

interface StatCardProps {
  value: ReactNode;
  label: string;
  sub?: string;
  color?: string;
}

export function StatCard({ value, label, sub, color }: StatCardProps) {
  return (
    <div className="flex-1 min-w-[140px] bg-white border border-gray-3 rounded-md shadow-sm p-lg">
      <div
        className="text-[26px] font-bold leading-none mb-1 tabular-nums"
        style={{ color: color || "#212529" }}
      >
        {value}
      </div>
      <div className="text-[12px] text-gray-6 font-medium">{label}</div>
      {sub && <div className="text-[11px] text-gray-5 mt-[3px]">{sub}</div>}
    </div>
  );
}
