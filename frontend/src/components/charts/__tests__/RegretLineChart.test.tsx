import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { RegretLineChart, historyStartStep } from "../RegretLineChart";

const regretHistory = Array.from({ length: 320 }, (_, i) => (i + 1) * 0.01);

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    private callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [
          {
            contentRect: {
              width: 400,
              height: 200,
              top: 0,
              left: 0,
              bottom: 200,
              right: 400,
              x: 0,
              y: 0,
              toJSON: () => ({}),
            },
          } as ResizeObserverEntry,
        ],
        this,
      );
      Object.defineProperty(target, "clientWidth", { configurable: true, value: 400 });
      Object.defineProperty(target, "clientHeight", { configurable: true, value: 200 });
    }

    unobserve() {}
    disconnect() {}
  };
});

describe("historyStartStep", () => {
  it("maps windowed history to absolute step numbers", () => {
    expect(historyStartStep(205, 150)).toBe(56);
    expect(historyStartStep(50, 50)).toBe(1);
  });
});

describe("RegretLineChart", () => {
  it("renders drift begin when drift step is inside a windowed history", () => {
    const regretHistory = Array.from({ length: 150 }, (_, i) => (i + 1) * 0.01);
    render(<RegretLineChart regretHistory={regretHistory} driftStep={200} totalSteps={205} />);
    expect(screen.getByText("Drift begins")).toBeInTheDocument();
  });

  it("renders drift begin and complete annotations at configured steps", () => {
    render(<RegretLineChart regretHistory={regretHistory} driftStep={200} driftEndStep={300} />);
    expect(screen.getByText("Drift begins")).toBeInTheDocument();
    expect(screen.getByText("Drift complete")).toBeInTheDocument();
  });

  it("renders no drift annotations when driftStep is undefined", () => {
    render(<RegretLineChart regretHistory={regretHistory} />);
    expect(screen.queryByText("Drift begins")).not.toBeInTheDocument();
    expect(screen.queryByText("Drift complete")).not.toBeInTheDocument();
  });
});
