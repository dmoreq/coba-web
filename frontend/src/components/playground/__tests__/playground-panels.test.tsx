import { UCBDisplay } from "@/components/estimates/UCBDisplay";
import { ContextPanel } from "@/components/playground/ContextPanel";
import { EnvPanel } from "@/components/playground/EnvPanel";
import { ScenarioInfoBar } from "@/components/playground/ScenarioInfoBar";
import { ScenarioPicker } from "@/components/playground/ScenarioPicker";
import { StepFeed } from "@/components/playground/StepFeed";
import { WhyPanel } from "@/components/playground/WhyPanel";
import { api } from "@/lib/api";
import type { ScenarioInfo, SimState } from "@/lib/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    getScenarios: vi.fn(),
  },
}));

const contentFormatScenario: ScenarioInfo = {
  id: "content_format",
  label: "Content Format",
  description:
    "Includes concept drift at step 200: short-form dominates early (mobile-first era); long-form + interactive surge later (content quality trend).",
  domain: "Content",
  featureCount: 2,
  armCount: 5,
  hasDrift: true,
  recommendedAlgorithms: ["linucb_sw", "linucb"],
  difficulty: "intermediate",
  rewardSurface: "drifting",
  driftStep: 200,
  driftEndStep: 300,
};

function makeState(algorithm: SimState["algorithm"] = "linucb"): SimState {
  return {
    arms: [
      { id: "a", label: "A", trueProb: 0.2, color: "#111111", lightColor: "#eeeeee" },
      { id: "b", label: "B", trueProb: 0.8, color: "#222222", lightColor: "#dddddd" },
    ],
    armStates: [
      { n: 4, successes: 1, failures: 3 },
      { n: 4, successes: 3, failures: 1 },
    ],
    linMeta: [],
    algorithm,
    alpha: 2,
    epsilon: 0.1,
    hyperparams:
      algorithm === "softmax"
        ? { softmax_tau: 1 }
        : algorithm === "bootstrapped_ts"
          ? { n_bootstraps: 10 }
          : { alpha: 2 },
    scenarioId: "notification_channels",
    featureNames: ["mobile_usage", "recency_days"],
    featureLabels: ["Mobile Usage", "Recency"],
    featureDescriptions: [
      "Fraction of recent sessions from mobile device",
      "Days since last interaction",
    ],
    featureMins: [-1, -1],
    featureMaxs: [1, 1],
    featureLowLabels: ["desktop-only", "today"],
    featureHighLabels: ["mobile-only", "30+ days ago"],
    t: 8,
    history: [
      {
        t: 8,
        chosenIdx: 1,
        outcome: 1,
        stepRegret: 0,
        cumRegret: 0.3,
        scores:
          algorithm === "bootstrapped_ts"
            ? [
                { mean: 0, bonus: 0, score: 0.2, formula: "x" },
                { mean: 0, bonus: 0, score: 0.8, formula: "y" },
              ]
            : [
                { mean: 0.1, bonus: 0.2, score: 0.3, formula: "x" },
                { mean: 0.6, bonus: 0, score: 0.7, formula: "y" },
              ],
        context: [0.5, -0.3],
        contextSegment: "Mobile Active",
        wasRandom: false,
        trueProb: 0.9,
        optimalIdx: 1,
        optimalProb: 0.9,
        allTrueProbs: [0.1, 0.9],
      },
    ],
    regretHistory: [0.3],
  };
}

describe("ContextPanel", () => {
  it("shows semantic endpoint labels instead of generic low/mid/high", () => {
    render(<ContextPanel simState={makeState()} contextSegment="Mobile Active" />);
    expect(screen.getByText("mobile-only")).toBeTruthy();
    expect(screen.queryByText("low")).toBeNull();
    expect(screen.queryByText("mid")).toBeNull();
    expect(screen.queryByText("high")).toBeNull();
  });

  it("applies feature description as tooltip on feature name", () => {
    render(<ContextPanel simState={makeState()} contextSegment={null} />);
    const label = screen.getByText("Mobile Usage");
    expect(label.getAttribute("title")).toContain("mobile device");
  });

  it("reports context length mismatch", () => {
    const state = makeState();
    state.history[0].context = [0.5];
    render(<ContextPanel simState={state} contextSegment={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/does not match feature count/i);
  });
});

describe("EnvPanel", () => {
  it("shows current contextual truth instead of static trueProb", () => {
    render(<EnvPanel simState={makeState()} showGroundTruth={true} onToggle={vi.fn()} />);
    expect(screen.getByText("10%")).toBeTruthy();
    expect(screen.getByText("90%")).toBeTruthy();
    expect(screen.getByText("best now")).toBeTruthy();
  });
});

describe("UCBDisplay", () => {
  it("shows mean/breakdown legend for LinUCB even if one arm has zero bonus", () => {
    render(<UCBDisplay simState={makeState("linucb")} showGroundTruth={false} />);
    expect(screen.getByText("Mean estimate")).toBeTruthy();
    expect(screen.getByText("Exploration bonus")).toBeTruthy();
    expect(screen.queryByText("Policy score")).toBeNull();
  });

  it("shows policy-score legend for raw-score families", () => {
    render(<UCBDisplay simState={makeState("bootstrapped_ts")} showGroundTruth={false} />);
    expect(screen.getByText("Policy score")).toBeTruthy();
    expect(screen.queryByText("Mean estimate")).toBeNull();
  });
});

describe("StepFeed", () => {
  const arms = makeState().arms;

  it("expands context by default for contextual algorithms", () => {
    render(
      <StepFeed
        history={makeState("linucb").history}
        arms={arms}
        t={8}
        featureNames={["mobile_usage", "recency_days"]}
        featureLabels={["Mobile Usage", "Recency"]}
        algorithm="linucb"
      />,
    );
    expect(screen.getByTestId("context-values")).toBeInTheDocument();
    expect(screen.getByText(/Mobile Usage:/)).toBeInTheDocument();
  });

  it("collapses context by default for non-contextual algorithms", () => {
    render(
      <StepFeed
        history={makeState("ucb1").history}
        arms={arms}
        t={8}
        featureNames={["mobile_usage", "recency_days"]}
        featureLabels={["Mobile Usage", "Recency"]}
        algorithm="ucb1"
      />,
    );
    expect(screen.queryByTestId("context-values")).not.toBeInTheDocument();
  });
});

describe("ScenarioInfoBar", () => {
  it("shows description, domain, difficulty, and recommended algorithm chips", () => {
    render(<ScenarioInfoBar scenario={contentFormatScenario} />);
    expect(screen.getByTestId("scenario-description")).toHaveTextContent(/content quality trend/i);
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.getByTestId("scenario-difficulty")).toHaveTextContent("Intermediate");
    expect(screen.getByText("SW-LinUCB")).toBeTruthy();
    expect(screen.getByText("LinUCB")).toBeTruthy();
  });

  it("shows drift badge when scenario has drift", () => {
    render(<ScenarioInfoBar scenario={contentFormatScenario} />);
    expect(screen.getByTestId("scenario-drift-badge")).toHaveTextContent("Concept drift (200–300)");
  });

  it("collapses and hides content when toggled", () => {
    render(<ScenarioInfoBar scenario={contentFormatScenario} />);
    expect(screen.getByTestId("scenario-info-content")).toBeTruthy();
    fireEvent.click(screen.getByTestId("scenario-info-toggle"));
    expect(screen.queryByTestId("scenario-info-content")).toBeNull();
  });

  it("renders nothing when scenario is null", () => {
    const { container } = render(<ScenarioInfoBar scenario={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("ScenarioPicker", () => {
  it("shows truncated description in dropdown entries", async () => {
    vi.mocked(api.getScenarios).mockResolvedValue([contentFormatScenario]);
    render(
      <ScenarioPicker
        selectedScenarioId="content_format"
        onScenarioChange={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    await waitFor(() => expect(screen.getByText("Content Format")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /content format/i }));
    expect(screen.getByText(/content quality trend/i)).toBeTruthy();
  });
});

describe("WhyPanel", () => {
  it("renders LinUCB copy from the shared presentation model", () => {
    render(<WhyPanel simState={makeState("linucb")} />);
    expect(screen.getByText(/highest LinUCB score for this context/i)).toBeTruthy();
    expect(screen.getByText(/uncertainty bonus: 0.000/i)).toBeTruthy();
  });

  it("renders softmax-specific copy from the shared presentation model", () => {
    render(<WhyPanel simState={makeState("softmax")} />);
    expect(screen.getByText(/softmax distribution over policy scores/i)).toBeTruthy();
    expect(screen.getByText(/temperature τ=1.0/i)).toBeTruthy();
  });
});
