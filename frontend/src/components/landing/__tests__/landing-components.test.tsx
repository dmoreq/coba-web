import { AlgoStrip } from "@/components/landing/AlgoStrip";
import { ConceptCards } from "@/components/landing/ConceptCards";
import { ScenarioShowcase } from "@/components/landing/ScenarioShowcase";
import { ALGO_META } from "@/lib/constants";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    getScenarios: vi.fn().mockResolvedValue([
      {
        id: "s1",
        label: "Scenario One",
        description: "Desc",
        domain: "Test",
        armCount: 3,
        featureCount: 2,
      },
    ]),
  },
}));

describe("AlgoStrip", () => {
  it("renders all algorithm pills from ALGO_META", () => {
    render(<AlgoStrip />);
    for (const meta of Object.values(ALGO_META)) {
      expect(screen.getByText(meta.label)).toBeInTheDocument();
    }
  });
});

describe("ConceptCards", () => {
  it("renders four concept titles", () => {
    render(<ConceptCards />);
    expect(screen.getByText("A choice you can make")).toBeInTheDocument();
    expect(screen.getByText("Feedback after each action")).toBeInTheDocument();
    expect(screen.getByText("The cost of uncertainty")).toBeInTheDocument();
    expect(screen.getByText("The core tension")).toBeInTheDocument();
  });
});

describe("ScenarioShowcase", () => {
  it("shows loading then scenario cards", async () => {
    render(<ScenarioShowcase />);
    expect(screen.getByText(/Loading scenarios/)).toBeInTheDocument();
    expect(await screen.findByText("Scenario One")).toBeInTheDocument();
    expect(screen.getByText("Real-World Scenarios")).toBeInTheDocument();
  });
});
