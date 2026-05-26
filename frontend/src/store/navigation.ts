import { create } from "zustand";

export type Screen = "landing" | "playground" | "compare" | "settings" | "results" | "glossary";

interface NavigationState {
  screen: Screen;
  navigate: (s: Screen) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  screen: "landing",
  navigate: (screen) => set({ screen }),
}));
