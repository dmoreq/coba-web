# Performance Baseline — Coba Edu

> Fill after running `pnpm perf:baseline` on a **production** frontend build.
> Date: ___________  Machine: ___________  Commit: ___________

## How to measure

1. `cd frontend && pnpm build && pnpm start` (port 3000)
2. Backend: `cd backend && COBA_ALLOW_SIMULATION_PURGE=1 uv run uvicorn coba_server:app --port 8000`
3. Chrome DevTools → Performance: record from click until UI settles
4. Note three numbers: **click → first paint**, **click → network idle**, **click → fully idle**
5. Optional: check `performance.getEntriesByName("playground-step")` in console after steps (dev marks)

## Thresholds (product)

| Flow | Good | OK | Bad |
|------|------|-----|-----|
| Nav: Playground → Glossary | < 300 ms | 300–500 ms | > 500 ms |
| Nav: Glossary → Playground | < 500 ms | 500 ms–1 s | > 1 s |
| Scenario picker open | < 200 ms | 200–400 ms | > 400 ms |
| Scenario switch (recreate) | < 1.5 s | 1.5–3 s | > 3 s |
| Step (UCB1) end-to-end | < 600 ms | 600 ms–1.2 s | > 1.2 s |
| Algorithm switch (recreate) | < 1.5 s | 1.5–3 s | > 3 s |
| Compare dual step | < 1.2 s | 1.2–2.5 s | > 2.5 s |

## Measurements (before optimization)

| # | Flow | First paint | Network done | Fully idle | Notes |
|---|------|-------------|--------------|------------|-------|
| 1 | Playground → Glossary → Playground | | | | |
| 2 | Open scenario picker | | | | |
| 3 | Switch to Content Format | | | | |
| 4 | Single Step (UCB1) | | | | |
| 5 | UCB1 → LinUCB | | | | |
| 6 | Compare: one dual step | | | | |

## Measurements (after optimization)

| # | Flow | First paint | Network done | Fully idle | Delta |
|---|------|-------------|--------------|------------|-------|
| 1 | | | | | |

## Chart throttling gate

Implement `useThrottledValue` / `PlaygroundCharts` extraction only if production profiling shows Recharts repaint is a meaningful cost during auto-play. Otherwise prioritize API latency and immediate control feedback.
