import LandingPage from "@/app/page";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api", () => ({
  api: {
    getScenarios: vi.fn().mockResolvedValue([
      {
        id: "notification_channels",
        label: "Notification Channels",
        description: "Test scenario",
        domain: "Marketing",
        armCount: 3,
        featureCount: 2,
      },
    ]),
  },
}));

describe("LandingPage", () => {
  it("renders hero and primary sections", async () => {
    render(<LandingPage />);
    expect(screen.getByText("Bandit Simulator")).toBeInTheDocument();
    expect(screen.getByText("Algorithms")).toBeInTheDocument();
    expect(await screen.findByText("Real-World Scenarios")).toBeInTheDocument();
  });

  it("renders bottom playground CTA", () => {
    render(<LandingPage />);
    expect(screen.getByRole("button", { name: /Start the Playground/i })).toBeInTheDocument();
  });
});
