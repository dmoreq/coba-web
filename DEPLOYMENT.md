# Deployment

## Backend on Render

This repo includes a root [render.yaml](./render.yaml) for the FastAPI backend.

Render service settings:

- Service type: `Web Service`
- Runtime: `Python`
- Root directory: `backend`
- Build command: `uv sync --frozen`
- Start command: `.venv/bin/uvicorn --app-dir src coba_server:app --host 0.0.0.0 --port $PORT`
- Health check path: `/api/health`

Environment variables to set in Render:

- `COBA_CORS_ORIGINS`
  - Example: `https://your-frontend-domain.com,https://your-preview-domain.vercel.app`

## GitHub Actions -> Render

The workflow [deploy-backend.yml](./.github/workflows/deploy-backend.yml) triggers Render after every push to `main`.

Add this repository secret in GitHub Actions:

- `RENDER_DEPLOY_HOOK_URL`
  - Value: the backend service Deploy Hook URL from Render

## Frontend integration

Set this environment variable in your frontend host:

- `NEXT_PUBLIC_API_URL=https://your-backend-name.onrender.com`

If `NEXT_PUBLIC_API_URL` is omitted in production, the frontend falls back to same-origin `/api` requests instead of `localhost`.
