"""Sentinel-X API gateway: single entry point with optional API key, rate limiting and security headers."""
import asyncio
import os
import time
from collections import defaultdict, deque

import httpx
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

RAG_URL = os.getenv("RAG_URL", "http://rag:8000")
VISION_URL = os.getenv("VISION_URL", "http://vision:8000")
AGENTS_URL = os.getenv("AGENTS_URL", "http://agents:8000")
API_KEY = os.getenv("API_KEY", "")
ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MIN", "60"))
MAX_UPLOAD = 8 * 1024 * 1024

app = FastAPI(title="Sentinel-X Gateway", version="1.0.0")
if ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])

hits = defaultdict(deque)


@app.middleware("http")
async def security(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    q = hits[ip]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= RATE_LIMIT and request.url.path != "/health":
        from fastapi.responses import JSONResponse

        return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
    q.append(now)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


def auth(x_api_key: str = Header(default="")):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


async def forward(method, url, **kw):
    try:
        async with httpx.AsyncClient() as c:
            r = await c.request(method, url, timeout=30, **kw)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Upstream service unavailable")
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.json().get("detail", "Upstream error") if r.headers.get("content-type", "").startswith("application/json") else "Upstream error")
    return r.json()


class Query(BaseModel):
    query: str = Field(min_length=2, max_length=500)


class RunReq(BaseModel):
    scenario: str
    require_approval: bool | None = None


class Approval(BaseModel):
    approve: bool


@app.get("/health")
async def health():
    async def probe(name, url):
        try:
            async with httpx.AsyncClient() as c:
                r = await c.get(url + "/health", timeout=3)
            return name, "up" if r.status_code == 200 else "degraded"
        except httpx.HTTPError:
            return name, "down"

    results = await asyncio.gather(probe("rag", RAG_URL), probe("vision", VISION_URL), probe("agents", AGENTS_URL))
    services = dict(results)
    return {"status": "ok" if all(v == "up" for v in services.values()) else "degraded", "services": services}


@app.post("/api/rag/query", dependencies=[Depends(auth)])
async def rag_query(body: Query):
    return await forward("POST", f"{RAG_URL}/query", json=body.model_dump())


@app.post("/api/vision/scan", dependencies=[Depends(auth)])
async def vision_scan(file: UploadFile = File(...)):
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="File too large (8 MB limit)")
    return await forward("POST", f"{VISION_URL}/scan", files={"file": (file.filename or "upload", data)})


@app.post("/api/agents/run", dependencies=[Depends(auth)])
async def agents_run(body: RunReq):
    return await forward("POST", f"{AGENTS_URL}/run", json=body.model_dump(exclude_none=True))


@app.get("/api/agents/runs/{run_id}", dependencies=[Depends(auth)])
async def agents_get(run_id: str):
    return await forward("GET", f"{AGENTS_URL}/runs/{run_id}")


@app.post("/api/agents/runs/{run_id}/approve", dependencies=[Depends(auth)])
async def agents_approve(run_id: str, body: Approval):
    return await forward("POST", f"{AGENTS_URL}/runs/{run_id}/approve", json=body.model_dump())
