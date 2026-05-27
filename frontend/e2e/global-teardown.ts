import { request } from "@playwright/test";
import { API, apiPurgeSimulations } from "./helpers/api";

export default async function globalTeardown() {
  const ctx = await request.newContext({ baseURL: API });
  try {
    await apiPurgeSimulations(ctx);
  } finally {
    await ctx.dispose();
  }
}
