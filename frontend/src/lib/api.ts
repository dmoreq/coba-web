/**
 * Typed API client for the coba backend.
 * Returns camelCase objects matching @/lib/types interfaces.
 */

import type { AlgorithmId } from "./types";

const FALLBACK_ARM_COLORS = ["#228be6", "#12b886", "#fd7e14", "#7950f2", "#e64980", "#2b8a3e"];
const FALLBACK_ARM_LIGHT_COLORS = [
  "#e7f5ff",
  "#e6fcf5",
  "#fff4e6",
  "#f3f0ff",
  "#fce4ec",
  "#d3f9d8",
];

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function getApiBase(): string {
  const envUrl = typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_API_URL?.trim() : "";
  if (envUrl) {
    return normalizeBaseUrl(envUrl);
  }

  if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") {
    return "http://localhost:8000";
  }

  if (typeof window !== "undefined") {
    return "";
  }

  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    return "http://127.0.0.1:8000";
  }

  return "";
}

const API_BASE = getApiBase();

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

function normalizeSimulationArms<T extends ApiSimulation>(simulation: T): T {
  return {
    ...simulation,
    state: {
      ...simulation.state,
      arms: simulation.state.arms.map((arm, index) => ({
        ...arm,
        color: arm.color || FALLBACK_ARM_COLORS[index % FALLBACK_ARM_COLORS.length],
        lightColor:
          arm.lightColor || FALLBACK_ARM_LIGHT_COLORS[index % FALLBACK_ARM_LIGHT_COLORS.length],
      })),
    },
  };
}

// ── API response types (mapped to camelCase, matching @/lib/types) ──

export interface ApiSimulation {
  id: string;
  state: ApiSimState;
  algorithm: string;
  seed: number;
  scenarioId: string | null;
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
  scenarioId: string | null;
  featureNames: string[];
  featureLabels: string[];
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
    context: number[] | null;
    contextSegment: string | null;
    wasRandom: boolean;
    trueProb: number;
    optimalIdx?: number | null;
    optimalProb?: number | null;
    allTrueProbs?: number[] | null;
  }>;
  regretHistory: number[];
}

export type SimStateResponse = ApiSimState & { hyperparams: Record<string, number> };

/** Response from POST /simulate/{id}/step */
export interface ApiStepResponse {
  t: number;
  step: ApiSimState["history"][number];
  armStates: ApiSimState["armStates"];
  regretHistory: number[];
}

/** Response from POST /simulate/{id}/run */
export interface ApiRunResponse {
  stepsRun: number;
  finalT: number;
  history: ApiSimState["history"];
  regretHistory: number[];
  armStates: ApiSimState["armStates"];
}

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

export interface ApiScenarioInfo {
  id: string;
  label: string;
  description: string;
  domain: string;
  featureCount: number;
  armCount: number;
  hasDrift: boolean;
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

    let json: unknown;
    try {
      json = await res.json();
    } catch (error) {
      if (!res.ok) {
        throw new ApiError(
          res.status,
          `Unexpected non-JSON response from ${path}. Check NEXT_PUBLIC_API_URL or Next.js API rewrites.`,
        );
      }

      throw error;
    }

    if (!res.ok) {
      const detail =
        typeof json === "object" && json !== null && "detail" in json
          ? json.detail
          : `HTTP ${res.status}`;
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

  async getScenarios(): Promise<ApiScenarioInfo[]> {
    return request<ApiScenarioInfo[]>("GET", "/api/scenarios");
  },

  async createSimulation(
    arms: Array<{
      id: string;
      label: string;
      true_prob: number;
      color?: string;
      light_color?: string;
    }> | null,
    algorithm: string,
    hyperparams: Record<string, number>,
    seed: number,
    scenarioId = "notification_channels",
  ): Promise<ApiSimulation> {
    const simulation = await request<ApiSimulation>(
      "POST",
      "/api/simulate",
      { arms, algorithm, hyperparams, seed, scenario_id: scenarioId },
      { timeout: 15_000 },
    );
    return normalizeSimulationArms(simulation);
  },

  async getSimulation(id: string): Promise<ApiSimulation> {
    const simulation = await request<ApiSimulation>("GET", `/api/simulate/${id}`);
    return normalizeSimulationArms(simulation);
  },

  async step(id: string): Promise<ApiStepResponse> {
    return request<ApiStepResponse>("POST", `/api/simulate/${id}/step`);
  },

  async run(id: string, steps: number): Promise<ApiRunResponse> {
    return request<ApiRunResponse>("POST", `/api/simulate/${id}/run`, { steps });
  },

  async deleteSimulation(id: string): Promise<void> {
    return request<void>("DELETE", `/api/simulate/${id}`);
  },

  async getResults(id: string): Promise<ApiResultsResponse> {
    return request<ApiResultsResponse>("GET", `/api/simulate/${id}/results`);
  },
};
