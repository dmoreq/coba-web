import { request } from "@playwright/test";
import { API, apiPurgeSimulations } from "./helpers/api";

export default async function globalSetup() {
  const ctx = await request.newContext({ baseURL: API });
  try {
    await apiPurgeSimulations(ctx);
  } catch (e) {
    console.warn(
      "[e2e] Could not purge simulations — restart backend with COBA_ALLOW_SIMULATION_PURGE=1:",
      e,
    );
  } finally {
    await ctx.dispose();
  }
}
