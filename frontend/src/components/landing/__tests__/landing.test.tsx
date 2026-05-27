import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("Landing", () => {
  it("Hero navigates to playground on CTA click", () => {
    const onNavigate = vi.fn();
    render(<Hero onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: /Open Playground/i }));
    expect(onNavigate).toHaveBeenCalledWith("playground");
  });

  it("HowItWorks renders step headings", () => {
    render(<HowItWorks />);
    expect(screen.getByText("Set up the environment")).toBeInTheDocument();
    expect(screen.getByText("Watch it converge")).toBeInTheDocument();
  });
});
