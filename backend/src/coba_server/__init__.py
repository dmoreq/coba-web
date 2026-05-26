"""FastAPI application for coba bandit simulator backend."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from coba_server.config import Settings
from coba_server.di import get_simulation_service
from coba_server.routes.algorithms import router as algorithms_router
from coba_server.routes.health import router as health_router
from coba_server.routes.simulate import router as simulate_router

settings = Settings()

CLEANUP_INTERVAL_SECONDS = 300  # 5 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    service = get_simulation_service()

    async def cleanup_loop() -> None:
        while True:
            await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
            await asyncio.to_thread(service.prune_expired)

    task = asyncio.create_task(cleanup_loop())
    yield
    task.cancel()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Coba Bandit Simulator API",
        version="0.1.0",
        docs_url="/docs",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix="/api")
    app.include_router(simulate_router, prefix="/api")
    app.include_router(algorithms_router, prefix="/api")

    return app


app = create_app()
