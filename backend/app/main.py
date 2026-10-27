import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import ALLOWED_ORIGINS, STORAGE_DIR
from .models.database import init_db
from .routers import (
    encrypt_router,
    decrypt_router,
    verify_router,
    share_router,
    audit_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure directory structure and initialize DB
    os.makedirs(STORAGE_DIR, exist_ok=True)
    init_db()
    yield
    # Shutdown logic if needed


app = FastAPI(
    title="SecureVault X API",
    description="Advanced File Encryption, Authentication & Integrity Verification Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows local dev and cross-origin frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Disposition",
        "X-Encrypted-Size",
        "X-Original-SHA256",
        "X-Decrypted-SHA256",
        "X-Original-Filename",
        "X-Is-Archive",
        "X-Downloads-Remaining"
    ]
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Include Routers
app.include_router(encrypt_router)
app.include_router(decrypt_router)
app.include_router(verify_router)
app.include_router(share_router)
app.include_router(audit_router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SecureVault X Backend",
        "security": {
            "cipher": "AES-256-GCM",
            "kdf": "Scrypt",
            "integrity": "SHA-256"
        }
    }


# Static frontend files mount if built
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_dirs = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path(__file__).resolve().parent.parent / "dist",
]
for dist_path in dist_dirs:
    if dist_path.exists() and (dist_path / "index.html").exists():
        assets_dir = dist_path / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        @app.get("/{full_path:path}")
        async def serve_frontend(full_path: str):
            if full_path.startswith("api"):
                return JSONResponse(status_code=404, content={"detail": "Not Found"})
            file_path = dist_path / full_path
            if file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(dist_path / "index.html")
        break
