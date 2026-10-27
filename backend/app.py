import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routes.auth import auth_router
from backend.routes.onboarding import onboarding_router
from backend.routes.dashboard import dashboard_router
from backend.routes.workouts import workouts_router
from backend.routes.nutrition import nutrition_router
from backend.routes.scanner import scanner_router
from backend.routes.assistant import assistant_router
from backend.routes.hydration import hydration_router
from backend.routes.habits import habits_router
from backend.routes.progress import progress_router
from backend.routes.notifications import notifications_router

app = FastAPI(
    title="Intelligent Personalized Fitness and Health Assistant",
    description="Original, intelligent, database-backed personalized fitness and health platform",
    version="2.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/") or request.url.path == "/" or request.url.path.endswith(".html"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Register API Routers
app.include_router(auth_router)
app.include_router(onboarding_router)
app.include_router(dashboard_router)
app.include_router(workouts_router)
app.include_router(nutrition_router)
app.include_router(scanner_router)
app.include_router(assistant_router)
app.include_router(hydration_router)
app.include_router(habits_router)
app.include_router(progress_router)
app.include_router(notifications_router)

# Mount Frontend Static Assets
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
static_dir = frontend_dir / "static"

if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
def serve_index():
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(
            str(index_file),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
        )
    return {"message": "Intelligent Personalized Fitness and Health Assistant API is running!"}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Intelligent Personalized Fitness and Health Assistant", "version": "2.0.0"}
