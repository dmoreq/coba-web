/**
 * Typed API client for the coba backend.
 * Returns camelCase objects matching @/lib/types interfaces.
 */

import type { AlgorithmId } from "./types";

const API_BASE: string =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) || "http://localhost:8000";

// ── Recursive snake_case → camelCase mapper ──

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function mapKeys<T>(obj: unknown): T {
  if (Array.isArray(obj)) return obj.map(mapKeys) as T;
  if (obj !== null && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[toCamel(k)] = mapKeys<unknown>(v);
    }
    return out as T;
  }
  return obj as T;
}

// ── API response types (mapped to camelCase, matching @/lib/types) ──

export interface ApiSimulation {
  id: string;
  state: ApiSimState;
  algorithm: string;
  seed: number;
}

/** The simulation state returned by the API (camelCased) */
export interface ApiSimState {
  t: number;
  arms: Array<{ id: string; label: string; trueProb: number; color: string; lightColor: string }>;
  armStates: Array<{ n: number; successes: number; failures: number }>;
  linMeta: Array<{ A: [[number, number], [number, number]]; b: [number, number] }>;
  algorithm: AlgorithmId;
  alpha: number;
  epsilon: number;
  history: Array<{
    t: number;
    chosenIdx: number;
    outcome: number;
    stepRegret: number;
    cumRegret: number;
    scores: Array<{
      mean: number;
      bonus: number;
      score: number;
      sample?: number | null;
      formula: string;
    }>;
    context: [number, number] | null;
    wasRandom: boolean;
    trueProb: number;
  }>;
  regretHistory: number[];
}

export type SimStateResponse = ApiSimState;

export interface ApiResultsResponse {
  totalSteps: number;
  cumulativeRegret: number;
  avgReward: number;
  bestArmFound: string | null;
  accuracyTable: Array<{
    arm: string;
    estimated: number;
    true: number;
    error: number;
    pulls: number;
  }>;
  narrative: string;
}

export interface ApiAlgoInfo {
  id: string;
  label: string;
  description: string;
  hyperparams: string[];
}

// ── Request helpers ──

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { timeout?: number },
): Promise<T> {
  const controller = new AbortController();
  const timeout = opts?.timeout ?? 10_000;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (res.status === 204) return undefined as T;

    const json = await res.json();

    if (!res.ok) {
      const detail = json?.detail ?? `HTTP ${res.status}`;
      throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
    }

    return mapKeys<T>(json);
  } finally {
    clearTimeout(timer);
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

// ── Public API ──

export const api = {
  async health(): Promise<boolean> {
    const r = await request<{ status: string }>("GET", "/api/health");
    return r.status === "ok";
  },

  async getAlgorithms(): Promise<ApiAlgoInfo[]> {
    return request<ApiAlgoInfo[]>("GET", "/api/algorithms");
  },

  async createSimulation(
    arms: Array<{
      id: string;
      label: string;
      true_prob: number;
      color?: string;
      light_color?: string;
    }>,
    algorithm: string,
    hyperparams: Record<string, number>,
    seed: number,
  ): Promise<ApiSimulation> {
    return request<ApiSimulation>(
      "POST",
      "/api/simulate",
      { arms, algorithm, hyperparams, seed },
      { timeout: 15_000 },
    );
  },

  async getSimulation(id: string): Promise<ApiSimulation> {
    return request<ApiSimulation>("GET", `/api/simulate/${id}`);
  },

  async step(
    id: string,
  ): Promise<{ t: number; step: unknown; armStates: unknown[]; regretHistory: number[] }> {
    return request("POST", `/api/simulate/${id}/step`);
  },

  async run(
    id: string,
    steps: number,
  ): Promise<{
    stepsRun: number;
    finalT: number;
    history: unknown[];
    regretHistory: number[];
    armStates: unknown[];
  }> {
    return request("POST", `/api/simulate/${id}/run`, { steps });
  },

  async deleteSimulation(id: string): Promise<void> {
    return request<void>("DELETE", `/api/simulate/${id}`);
  },

  async getResults(id: string): Promise<ApiResultsResponse> {
    return request<ApiResultsResponse>("GET", `/api/simulate/${id}/results`);
  },
};
