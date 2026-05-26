import { Header } from "@/components/layout/Header";
import type { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans">
      <Header />
      <div className="flex-1 overflow-y-auto bg-surface-page">{children}</div>
    </div>
  );
}
