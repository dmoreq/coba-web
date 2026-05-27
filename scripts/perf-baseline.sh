#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== Coba perf baseline ==="
echo "1. Start backend (terminal A):"
echo "   cd $ROOT/backend && COBA_ALLOW_SIMULATION_PURGE=1 uv run uvicorn coba_server:app --port 8000"
echo "2. Production frontend (terminal B):"
echo "   cd $ROOT/frontend && pnpm build && pnpm start"
echo "3. Open http://localhost:3000 and record timings in docs/PERF_BASELINE.md"
echo "4. Optional: Chrome Lighthouse on /playground (after 5 steps)"
echo "5. Run perf E2E (with servers up): cd $ROOT/frontend && pnpm test:e2e:perf"
