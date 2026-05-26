import type { ReactNode } from "react";

interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, children, className = "" }: PanelProps) {
  return (
    <div className={`bg-white border border-gray-3 rounded-md shadow-sm p-lg ${className}`}>
      {title && (
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
