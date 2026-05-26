"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "filled" | "outline" | "light" | "disabled";
type ButtonColor = "blue" | "teal" | "orange" | "violet" | "gray";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
}

const SIZE_MAP: Record<ButtonSize, string> = {
  xs: "h-[26px] text-[11px] px-sm",
  sm: "h-[30px] text-[12px] px-[10px]",
  md: "h-[36px] text-md px-md",
  lg: "h-[42px] text-lg px-lg",
};

const VARIANT_COLOR_MAP: Record<ButtonVariant, string> = {
  filled: "bg-blue-6 text-white hover:bg-blue-7",
  outline: "border border-blue-6 text-blue-6 bg-transparent hover:bg-blue-0",
  light: "bg-blue-0 text-blue-7 hover:bg-blue-1",
  disabled: "bg-gray-1 text-gray-4 cursor-not-allowed",
};

export function Button({
  children,
  variant = "filled",
  color = "blue",
  size = "md",
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  // Build color-specific styles for variant+color
  let colorStyles = VARIANT_COLOR_MAP[variant];

  if (variant === "filled") {
    if (color === "teal") colorStyles = "bg-teal-6 text-white hover:brightness-110";
    else if (color === "orange") colorStyles = "bg-orange-6 text-white hover:brightness-110";
    else if (color === "violet") colorStyles = "bg-violet-6 text-white hover:brightness-110";
    else if (color === "gray") colorStyles = "bg-gray-1 text-gray-9 hover:bg-gray-2";
    else colorStyles = "bg-blue-6 text-white hover:bg-blue-7";
  } else if (variant === "outline") {
    if (color === "gray")
      colorStyles = "border border-gray-3 text-gray-7 bg-transparent hover:bg-gray-1";
    else colorStyles = "border border-blue-6 text-blue-6 bg-transparent hover:bg-blue-0";
  } else if (variant === "light") {
    if (color === "teal") colorStyles = "bg-teal-0 text-teal-6 hover:brightness-95";
    else if (color === "orange") colorStyles = "bg-orange-0 text-orange-6 hover:brightness-95";
    else if (color === "violet") colorStyles = "bg-violet-0 text-violet-6 hover:brightness-95";
    else colorStyles = "bg-blue-0 text-blue-7 hover:bg-blue-1";
  }

  return (
    <button
      disabled={disabled || variant === "disabled"}
      className={`
        inline-flex items-center justify-center gap-[6px]
        rounded-sm font-sans font-medium border-none cursor-pointer
        whitespace-nowrap transition-all duration-base
        ${SIZE_MAP[size]}
        ${disabled || variant === "disabled" ? VARIANT_COLOR_MAP.disabled : colorStyles}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
