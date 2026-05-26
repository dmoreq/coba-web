.PHONY: dev test lint format install precommit

.PHONY: dev test test-backend test-frontend test-e2e lint format install precommit

# Dev — start both servers
dev:
	@echo "Starting backend + frontend..."
	@cd backend && uv run uvicorn coba_server.main:app --reload --port 8000 &
	@sleep 2
	@cd frontend && pnpm dev

# Test
test-backend:
	cd backend && uv run --extra dev pytest -v

test-frontend:
	cd frontend && pnpm vitest run

test-e2e:
	cd frontend && pnpm test:e2e

test: test-backend test-frontend

# Lint
lint:
	cd backend && uv run --extra dev ruff check src/
	cd frontend && npx @biomejs/biome check src/

# Format
format:
	cd backend && uv run --extra dev ruff format src/
	cd frontend && npx @biomejs/biome format src/ --write

# Install
install:
	cd backend && uv sync --extra dev
	cd frontend && pnpm install
	pre-commit install

precommit:
	pre-commit run --all-files
