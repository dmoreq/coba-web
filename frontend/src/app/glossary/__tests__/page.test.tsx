import GlossaryPage from "@/app/glossary/page";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/glossary",
}));

describe("GlossaryPage", () => {
  it("renders heading and default term list", () => {
    render(<GlossaryPage />);
    expect(screen.getByRole("heading", { name: "Glossary" })).toBeInTheDocument();
    expect(screen.getByText("Bandit Problem")).toBeInTheDocument();
    expect(screen.getByText("UCB1")).toBeInTheDocument();
  });

  it("filters terms when searching", () => {
    render(<GlossaryPage />);
    fireEvent.change(screen.getByPlaceholderText(/Search terms/), {
      target: { value: "thompson" },
    });
    expect(screen.getByText("Thompson Sampling")).toBeInTheDocument();
    expect(screen.queryByText("Bandit Problem")).not.toBeInTheDocument();
  });

  it("shows empty state for unmatched query", () => {
    render(<GlossaryPage />);
    fireEvent.change(screen.getByPlaceholderText(/Search terms/), {
      target: { value: "zzznomatch" },
    });
    expect(screen.getByText(/No terms match/)).toBeInTheDocument();
  });

  it("expands card detail on click", () => {
    render(<GlossaryPage />);
    fireEvent.click(screen.getByText("Bandit Problem"));
    expect(screen.getByText(/Named after "one-armed bandit" slot machines/)).toBeInTheDocument();
  });
});
