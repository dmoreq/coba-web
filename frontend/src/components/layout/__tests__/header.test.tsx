import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prefetch = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push, prefetch }),
}));

import { Header } from "../Header";

describe("Header", () => {
  beforeEach(() => {
    prefetch.mockClear();
  });

  it("prefetches route on mouse enter when not active", () => {
    render(<Header />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Playground" }));
    expect(prefetch).toHaveBeenCalledWith("/playground");
  });

  it("does not prefetch the active route", () => {
    render(<Header />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Overview" }));
    expect(prefetch).not.toHaveBeenCalled();
  });

  it("prefetches route on focus", () => {
    render(<Header />);
    fireEvent.focus(screen.getByRole("button", { name: "Glossary" }));
    expect(prefetch).toHaveBeenCalledWith("/glossary");
  });
});
