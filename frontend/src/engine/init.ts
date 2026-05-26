import { DEFAULT_ARMS } from "./constants";
import type { Arm, SimState } from "./types";

/** Create an initial simulation state with zeroed counts */
export function createInitialSimState(
  arms: Arm[] = DEFAULT_ARMS,
  algorithm: SimState["algorithm"] = "ucb1",
  alpha = 2.0,
  epsilon = 0.1,
): SimState {
  return {
    arms,
    armStates: arms.map(() => ({ n: 0, successes: 0, failures: 0 })),
    linMeta: arms.map(() => ({
      A: [
        [1, 0],
        [0, 1],
      ],
      b: [0, 0],
    })),
    algorithm,
    alpha,
    epsilon,
    t: 0,
    history: [],
    regretHistory: [],
  };
}
