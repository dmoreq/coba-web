import ComparePage from "@/app/compare/page";
import { api } from "@/lib/api";
import { createDefaultSimState } from "@/lib/constants";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/compare",
}));

vi.mock("@/hooks/useSimulationRunner", () => ({
  useSimulationRunner: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    createSimulation: vi.fn(),
    stepSimulation: vi.fn(),
    deleteSimulation: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockSimResponse = {
  id: "sim-a",
  state: createDefaultSimState("ucb1"),
};

describe("ComparePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.createSimulation).mockResolvedValue(mockSimResponse as never);
  });

  it("renders compare heading", async () => {
    render(<ComparePage />);
    expect(await screen.findByText("Compare Algorithms")).toBeInTheDocument();
  });

  it("shows error when initialization fails", async () => {
    vi.mocked(api.createSimulation).mockRejectedValue(new Error("Network down"));
    render(<ComparePage />);
    await waitFor(() => {
      expect(screen.getByText("Network down")).toBeInTheDocument();
    });
  });
});
