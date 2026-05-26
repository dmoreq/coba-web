"use client";

import type { ReactNode } from "react";

type BadgeVariant = "filled" | "light" | "outline";
type BadgeColor = "blue" | "teal" | "orange" | "violet" | "green" | "red" | "gray";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  color?: BadgeColor;
}

const FILLED: Record<BadgeColor, string> = {
  blue: "bg-blue-6 text-white",
  teal: "bg-teal-6 text-white",
  orange: "bg-orange-6 text-white",
  violet: "bg-violet-6 text-white",
  green: "bg-green-6 text-white",
  red: "bg-red-6 text-white",
  gray: "bg-gray-1 text-gray-7",
};

const LIGHT: Record<BadgeColor, string> = {
  blue: "bg-blue-0 text-blue-7",
  teal: "bg-teal-0 text-teal-6",
  orange: "bg-orange-0 text-orange-6",
  violet: "bg-violet-0 text-violet-6",
  green: "bg-green-0 text-green-6",
  red: "bg-red-0 text-red-6",
  gray: "bg-gray-1 text-gray-6",
};

const OUTLINE: Record<BadgeColor, string> = {
  blue: "border border-blue-6 text-blue-6",
  teal: "border border-teal-6 text-teal-6",
  orange: "border border-orange-6 text-orange-6",
  violet: "border border-violet-6 text-violet-6",
  green: "border border-green-6 text-green-6",
  red: "border border-red-6 text-red-6",
  gray: "border border-gray-3 text-gray-6",
};

export function Badge({ children, variant = "filled", color = "gray" }: BadgeProps) {
  const colorMap = variant === "filled" ? FILLED : variant === "light" ? LIGHT : OUTLINE;

  return (
    <span
      className={`
        inline-flex items-center h-5 px-sm rounded-full
        text-[11px] font-semibold whitespace-nowrap
        ${colorMap[color]}
      `}
    >
      {children}
    </span>
  );
}
