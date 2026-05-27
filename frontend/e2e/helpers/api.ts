import type { APIRequestContext } from "@playwright/test";

export const API = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function apiHealth(request: APIRequestContext): Promise<boolean> {
  const r = await request.get(`${API}/api/health`);
  if (!r.ok()) return false;
  const body = (await r.json()) as { status: string };
  return body.status === "ok";
}

export async function apiListScenarios(request: APIRequestContext) {
  const r = await request.get(`${API}/api/scenarios`);
  if (!r.ok()) throw new Error(`scenarios ${r.status()}`);
  return r.json() as Promise<
    Array<{ id: string; label: string; has_drift: boolean; feature_count: number }>
  >;
}

export async function apiCreateSim(
  request: APIRequestContext,
  opts: { algorithm?: string; scenarioId?: string; seed?: number } = {},
) {
  const r = await request.post(`${API}/api/simulate`, {
    data: {
      arms: null,
      algorithm: opts.algorithm ?? "ucb1",
      hyperparams: {},
      seed: opts.seed ?? 42,
      scenario_id: opts.scenarioId ?? "notification_channels",
    },
  });
  if (r.status() !== 201) throw new Error(`create ${r.status()} ${await r.text()}`);
  return r.json() as Promise<{ id: string }>;
}

export async function apiStep(request: APIRequestContext, simId: string) {
  const r = await request.post(`${API}/api/simulate/${simId}/step`);
  if (!r.ok()) throw new Error(`step ${r.status()}`);
  return r.json() as Promise<{ t: number; step: { context: number[] | null } }>;
}

export async function apiRun(request: APIRequestContext, simId: string, steps: number) {
  const r = await request.post(`${API}/api/simulate/${simId}/run`, { data: { steps } });
  if (!r.ok()) throw new Error(`run ${r.status()}`);
  return r.json() as Promise<{ final_t: number }>;
}

export async function apiDelete(request: APIRequestContext, simId: string) {
  await request.delete(`${API}/api/simulate/${simId}`);
}

export async function apiPurgeSimulations(request: APIRequestContext) {
  const r = await request.post(`${API}/api/simulate/purge`);
  if (r.status() === 403) {
    throw new Error("purge disabled — set COBA_ALLOW_SIMULATION_PURGE=1 on backend");
  }
  if (!r.ok() && r.status() !== 204) {
    throw new Error(`purge ${r.status()} ${await r.text()}`);
  }
}
