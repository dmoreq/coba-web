import SettingsPage from "@/app/settings/page";
import { createDefaultSimState } from "@/lib/constants";
import { useSimulationStore } from "@/store/simulation";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/settings",
}));

const applySettings = vi.fn();
const setSeed = vi.fn();

vi.mock("@/store/simulation", () => ({
  useSimulationStore: vi.fn(),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    applySettings.mockClear();
    setSeed.mockClear();
    vi.mocked(useSimulationStore).mockImplementation((selector) =>
      selector({
        simState: createDefaultSimState("ucb1"),
        seed: 42,
        applySettings,
        setSeed,
      } as never),
    );
  });

  it("renders settings heading and default arms", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Email")).toBeInTheDocument();
  });

  it("adds an arm when Add arm is clicked", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Add arm/i }));
    expect(screen.getByDisplayValue("Arm 4")).toBeInTheDocument();
  });

  it("calls applySettings when Apply is clicked", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Apply/i }));
    expect(applySettings).toHaveBeenCalled();
    expect(setSeed).toHaveBeenCalled();
  });
});
