/** Display labels must match AlgorithmSelector UI (from ALGO_META). */
export const ALGORITHM_SMOKE = [
  { name: "UCB1" },
  { name: "Thompson" },
  { name: "ε-Greedy" },
  { name: "LinUCB" },
  { name: "LinTS" },
  { name: "Hybrid LinUCB" },
  { name: "SW-LinUCB" },
  { name: "Softmax" },
  { name: "Neural Linear" },
  { name: "Bootstrapped TS" },
  { name: "Bootstrapped UCB" },
  { name: "Logistic UCB" },
  { name: "Logistic TS" },
  { name: "GP-UCB" },
  { name: "RF UCB" },
  { name: "RF TS" },
] as const;
