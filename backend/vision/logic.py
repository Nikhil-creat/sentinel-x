"""Byte-plot malware triage. Features + prototype classifier (NumPy only)."""
import numpy as np

KINDS = ["benign", "trojan", "ransomware", "botnet"]


def gen_sample(kind, seed):
    r = np.random.RandomState(seed)
    a = np.zeros((32, 32), dtype=np.uint8)
    pal = np.array([0, 0, 0, 32, 64, 72, 101, 116, 128, 144], dtype=np.uint8)

    def benign_rows(rows):
        for y in rows:
            if y > 0 and r.rand() < 0.55:
                a[y] = a[y - 1]
                continue
            x = 0
            while x < 32:
                n = 3 + r.randint(0, 8)
                a[y, x : x + n] = pal[r.randint(0, len(pal))]
                x += n

    if kind == "benign":
        benign_rows(range(32))
    elif kind == "ransomware":
        a = r.randint(0, 256, (32, 32)).astype(np.uint8)
    elif kind == "trojan":
        benign_rows(range(14))
        a[14:] = r.randint(0, 256, (18, 32)).astype(np.uint8)
    else:
        tile = r.randint(0, 256, (8, 8)).astype(np.uint8)
        a = np.tile(tile, (4, 4))
        noise = r.rand(32, 32) < 0.04
        a[noise] = r.randint(0, 256, int(noise.sum()))
    return a.reshape(-1)


def to_image(data: bytes):
    u = np.frombuffer(data[:262144], dtype=np.uint8)
    n = len(u)
    img = np.zeros(1024, dtype=np.uint8)
    for r in range(32):
        off = int(r * (n - 32) / 31) if n > 32 else 0
        chunk = u[off : off + 32]
        img[r * 32 : r * 32 + len(chunk)] = chunk
    return img


def entropy_bits(u):
    counts = np.bincount(u, minlength=256).astype(float)
    p = counts[counts > 0] / counts.sum()
    return float(-(p * np.log2(p)).sum())


def _corr(a, lag):
    x, y = a[:-lag].astype(float), a[lag:].astype(float)
    if x.std() == 0 or y.std() == 0:
        return 0.0
    return max(0.0, float(np.corrcoef(x, y)[0, 1]))


def features(a):
    hist = np.bincount(a >> 3, minlength=32).astype(float)
    p = hist[hist > 0] / hist.sum()
    h = float(-(p * np.log2(p)).sum())
    return np.array([h / 5, _corr(a, 1), _corr(a, 8), _corr(a, 256)])


PROTO = {k: np.mean([features(gen_sample(k, i + 1)) for i in range(30)], axis=0) for k in KINDS}


def classify(feat):
    logits = np.array([-np.linalg.norm(PROTO[k] - feat) / 0.12 for k in KINDS])
    e = np.exp(logits - logits.max())
    p = e / e.sum()
    top = int(p.argmax())
    return {
        "probs": {k: round(float(v), 4) for k, v in zip(KINDS, p)},
        "top": KINDS[top],
        "confidence": round(float(p[top]), 4),
    }


def scan_bytes(data: bytes):
    img = to_image(data)
    out = classify(features(img))
    out["entropy"] = round(entropy_bits(np.frombuffer(data[:262144], dtype=np.uint8)), 3) if data else 0.0
    out["features"] = [round(float(x), 4) for x in features(img)]
    out["engine"] = "prototype-features"
    return out
