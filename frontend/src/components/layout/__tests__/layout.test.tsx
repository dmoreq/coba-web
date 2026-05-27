import { PageShell } from "@/components/layout/PageShell";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

describe("PageShell", () => {
  it("renders children inside layout", () => {
    render(<PageShell>Child content</PageShell>);
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });
});
