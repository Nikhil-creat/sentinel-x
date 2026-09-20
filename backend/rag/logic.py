"""TF-IDF retrieval and grounded answering. Pure Python, no third-party dependencies."""
import json
import math
import re
from pathlib import Path

STOP = set(
    "the and for with that this from are was were has have had how what when where which who why can could "
    "should would you your not but all any use used using into over than then they them their its our out too "
    "via one two about does did do is it in on of to as at by an be or if so we my me i a".split()
)


def tok(text):
    words = [w for w in re.sub(r"[^a-z0-9\s]", " ", text.lower()).split() if len(w) > 2 and w not in STOP]
    return [re.sub(r"(ing|ed|es|s)$", "", w) if len(w) > 4 else w for w in words]


class Index:
    def __init__(self, docs):
        self.docs = docs
        for d in docs:
            d["toks"] = tok(d["title"] + " " + d["title"] + " " + d["text"])
        n = len(docs)
        df = {}
        for d in docs:
            for t in set(d["toks"]):
                df[t] = df.get(t, 0) + 1
        self.idf = {t: math.log(1 + n / c) for t, c in df.items()}
        self.vecs = [self._vec(d["toks"]) for d in docs]

    def _vec(self, toks):
        tf = {}
        for t in toks:
            tf[t] = tf.get(t, 0) + 1
        v = {t: c * self.idf[t] for t, c in tf.items() if t in self.idf}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
        return {t: x / norm for t, x in v.items()}

    def search(self, q, k=3):
        qv = self._vec(tok(q))
        scored = []
        for d, dv in zip(self.docs, self.vecs):
            scored.append((sum(w * dv.get(t, 0.0) for t, w in qv.items()), d))
        scored.sort(key=lambda x: -x[0])
        return scored[:k]

    def query(self, q):
        hits = [h for h in self.search(q) if h[0] > 0.02]
        if not hits or hits[0][0] < 0.08:
            return {"none": True, "answer": [], "hits": []}
        qt = set(tok(q))
        top = hits[0][0]

        def pick(doc, k):
            sents = [s.strip() for s in re.findall(r"[^.!?]+[.!?]+", doc["text"])] or [doc["text"]]
            ranked = sorted(
                enumerate(sents), key=lambda p: (-len([w for w in tok(p[1]) if w in qt]), p[0])
            )[:k]
            return [s for _, s in sorted(ranked)]

        answer = [{"text": s, "cite": 1} for s in pick(hits[0][1], 2)]
        if len(hits) > 1 and hits[1][0] > 0.6 * top:
            answer += [{"text": s, "cite": 2} for s in pick(hits[1][1], 1)]
        return {
            "none": False,
            "answer": answer,
            "hits": [{"id": d["id"], "title": d["title"], "text": d["text"], "score": round(s, 4)} for s, d in hits],
        }


def load_index(path=None):
    p = Path(path or Path(__file__).parent / "data" / "kb.json")
    return Index(json.loads(p.read_text(encoding="utf-8")))
