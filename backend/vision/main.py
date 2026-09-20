"""Sentinel-X vision service: malware triage from byte-plot images."""
import os

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile

from logic import KINDS, classify, features, gen_sample, scan_bytes, to_image

app = FastAPI(title="Sentinel-X Vision", version="1.0.0")
MAX_BYTES = 8 * 1024 * 1024

# Use the trained CNN when PyTorch and model.pt are present; otherwise use the feature classifier.
cnn = None
if os.path.exists("model.pt"):
    try:
        import torch
        from cnn import SmallCNN

        cnn = SmallCNN(len(KINDS))
        cnn.load_state_dict(torch.load("model.pt", map_location="cpu"))
        cnn.eval()
    except Exception as exc:  # torch not installed or model incompatible
        print("CNN not loaded, using feature classifier:", exc)
        cnn = None


def run(data: bytes):
    out = scan_bytes(data)
    if cnn is not None:
        import torch

        x = torch.tensor(to_image(data), dtype=torch.float32).reshape(1, 1, 32, 32) / 255.0
        with torch.no_grad():
            p = torch.softmax(cnn(x), dim=1)[0].numpy()
        top = int(p.argmax())
        out.update(
            probs={k: round(float(v), 4) for k, v in zip(KINDS, p)},
            top=KINDS[top],
            confidence=round(float(p[top]), 4),
            engine="pytorch-cnn",
        )
    return out


@app.get("/health")
def health():
    return {"status": "ok", "engine": "pytorch-cnn" if cnn is not None else "prototype-features"}


@app.post("/scan")
async def scan(file: UploadFile = File(...)):
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large (8 MB limit)")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    result = run(data)
    result["filename"] = (file.filename or "upload")[:80]
    return result


@app.get("/sample/{kind}")
def sample(kind: str):
    """Scan a synthetic sample of the given family. Used by the agents for demos."""
    if kind not in KINDS:
        raise HTTPException(status_code=404, detail="Unknown sample kind")
    seed = int(np.random.randint(500, 900))
    return run(gen_sample(kind, seed).tobytes())
