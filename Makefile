PID_FILE := /tmp/coba-server.pid
FRONTEND_PORT := 3000
BACKEND_PORT := 8000

.PHONY: dev dev-backend dev-frontend stop status \
        test test-backend test-frontend test-e2e \
        lint format install precommit

# ── Development ──

dev: dev-backend dev-frontend

dev-backend:
	@echo "Starting backend on :$(BACKEND_PORT)..."
	@cd backend && uv run uvicorn coba_server.main:app --reload --port $(BACKEND_PORT) &
	@echo $$! > $(PID_FILE)
	@sleep 2
	@echo "Backend ready at http://localhost:$(BACKEND_PORT)"

dev-frontend:
	@echo "Starting frontend on :$(FRONTEND_PORT)..."
	@cd frontend && pnpm dev

stop:
	@echo "Stopping backend..."
	@if [ -f $(PID_FILE) ]; then \
		kill `cat $(PID_FILE)` 2>/dev/null && rm $(PID_FILE) && echo "Stopped." || echo "Already stopped."; \
	else \
		echo "No PID file found. Trying pkill..."; \
		pkill -f "uvicorn.*coba_server" 2>/dev/null && echo "Stopped." || echo "Nothing running."; \
	fi
	@echo "Stopping frontend..."
	@pkill -f "next dev" 2>/dev/null && echo "Frontend stopped." || echo "Nothing running."

status:
	@echo "Backend:"
	@if pgrep -f "uvicorn.*coba_server" > /dev/null 2>&1; then \
		echo "  Running on http://localhost:$(BACKEND_PORT)"; \
	else \
		echo "  Stopped"; \
	fi
	@echo "Frontend:"
	@if pgrep -f "next dev" > /dev/null 2>&1; then \
		echo "  Running on http://localhost:$(FRONTEND_PORT)"; \
	else \
		echo "  Stopped"; \
	fi
	@echo "Backend tests:"
	@cd backend && uv run --extra dev pytest tests/ -q 2>/dev/null | tail -1 || echo "  (check config)"

# ── Test ──

test-backend:
	cd backend && uv run --extra dev pytest -v

test-frontend:
	cd frontend && pnpm vitest run

test-e2e:
	cd frontend && pnpm test:e2e

test: test-backend test-frontend

# ── Lint & Format ──

lint:
	cd backend && uv run --extra dev ruff check src/
	cd frontend && npx @biomejs/biome check src/

format:
	cd backend && uv run --extra dev ruff format src/
	cd frontend && npx @biomejs/biome format src/ --write

# ── Setup ──

install:
	cd backend && uv sync --extra dev
	cd frontend && pnpm install
	pre-commit install

precommit:
	pre-commit run --all-files
