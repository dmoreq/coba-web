import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaybackControls } from "../PlaybackControls";

describe("PlaybackControls", () => {
  it("disables step and sets aria-busy when isStepping", () => {
    render(
      <PlaybackControls
        isRunning={false}
        isStepping={true}
        onStep={vi.fn()}
        onPlayPause={vi.fn()}
      />,
    );
    const step = screen.getByRole("button", { name: /step/i });
    expect(step).toBeDisabled();
    expect(step).toHaveAttribute("aria-busy", "true");
  });

  it("clears aria-busy when not stepping", () => {
    render(
      <PlaybackControls
        isRunning={false}
        isStepping={false}
        onStep={vi.fn()}
        onPlayPause={vi.fn()}
      />,
    );
    expect(screen.getByTestId("playback-step-button")).toHaveAttribute("aria-busy", "false");
  });
});
