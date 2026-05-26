# COBA Edu

Interactive educational simulator for contextual bandit algorithms. The project pairs a Next.js frontend with a FastAPI backend built on top of the [`coba`](https://github.com/dmoreq/coba) library so users can explore how different bandit strategies learn over time.

## Overview

COBA Edu is designed as a teaching tool rather than a generic dashboard. It explains exploration vs. exploitation through a playground, scenario-driven simulations, and visual feedback such as regret, reward, and pull-distribution charts.

Live deployment:

- Frontend: `https://coba-web-omega.vercel.app/`
- Backend API: `https://coba-backend-h92q.onrender.com`

Current product areas:

- Landing page with beginner-friendly algorithm framing
- Playground for step-by-step simulation playback
- Algorithm comparison and results views
- FastAPI backend that manages simulation lifecycle and exposes algorithm/scenario metadata

## Tech Stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Recharts
- Backend: FastAPI, Pydantic, NumPy, `coba`
- Tooling: `pnpm`, `uv`, Vitest, Playwright, Pytest, Ruff, Biome

## Repository Structure

```text
.
|-- frontend/   # Next.js application
|-- backend/    # FastAPI API server
|-- docs/       # Product and implementation notes
|-- Makefile    # Common local development commands
|-- render.yaml # Backend deployment config
`-- vercel.json # Frontend deployment config
```

## Getting Started

### Prerequisites

- Node.js 20+
- `pnpm` 10+
- Python 3.12+
- `uv`

### Install Dependencies

```bash
make install
```

Or install each app separately:

```bash
cd backend && uv sync --extra dev
cd frontend && pnpm install
```

## Running Locally

Start both services:

```bash
make dev
```

Run each service separately:

```bash
cd backend && uv run uvicorn coba_server:app --reload --port 8000
cd frontend && pnpm dev
```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Backend Swagger UI: `http://localhost:8000/docs`

## Live Demo

- Frontend: `https://coba-web-omega.vercel.app/`
- Backend API: `https://coba-backend-h92q.onrender.com`
- Backend Swagger UI: `https://coba-backend-h92q.onrender.com/docs`

## Testing

Run the full test suite:

```bash
make test
```

Run app-specific checks:

```bash
make test-backend
make test-frontend
make test-e2e
make lint
```

## API Summary

Main backend routes:

- `GET /api/health`
- `GET /api/algorithms`
- `GET /api/scenarios`
- `POST /api/simulate`
- `GET /api/simulate/{sim_id}`
- `POST /api/simulate/{sim_id}/step`
- `POST /api/simulate/{sim_id}/run`
- `GET /api/simulate/{sim_id}/results`
- `DELETE /api/simulate/{sim_id}`

## Configuration

Backend environment variables use the `COBA_` prefix.

- `COBA_HOST`
- `COBA_PORT`
- `COBA_CORS_ORIGINS`

Frontend API requests use `NEXT_PUBLIC_API_URL` when set. If omitted in local development, the frontend defaults to `http://localhost:8000`.

## Deployment

- Production frontend: `https://coba-web-omega.vercel.app/`
- Production backend: `https://coba-backend-h92q.onrender.com`
- Frontend is configured for Vercel through [vercel.json](/Users/quy.doan/Workspace/personal/coba-edu/vercel.json).
- Backend is configured for Render through [render.yaml](/Users/quy.doan/Workspace/personal/coba-edu/render.yaml).

## Additional Docs

- [Onboarding plan](/Users/quy.doan/Workspace/personal/coba-edu/docs/coba-onboarding-plan.md)
- [Testing plan](/Users/quy.doan/Workspace/personal/coba-edu/docs/testing-plan.md)
