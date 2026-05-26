import type { ReactNode } from "react";

interface SectionHeaderProps {
  children: ReactNode;
}

export function SectionHeader({ children }: SectionHeaderProps) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-6 mb-[14px] pb-sm border-b border-gray-1">
      {children}
    </div>
  );
}
