"""Sentinel-X RAG service: retrieval over the threat-intelligence knowledge base."""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from logic import Index, load_index

app = FastAPI(title="Sentinel-X RAG", version="1.0.0")
index = load_index()


class Query(BaseModel):
    query: str = Field(min_length=2, max_length=500)


class Doc(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=20, max_length=5000)


@app.get("/health")
def health():
    return {"status": "ok", "chunks": len(index.docs)}


@app.post("/query")
def query(body: Query):
    return index.query(body.query)


@app.post("/ingest")
def ingest(doc: Doc):
    """Add a knowledge chunk at runtime (kept in memory; rebuilds the index)."""
    global index
    if any(d["id"] == doc.id for d in index.docs):
        raise HTTPException(status_code=409, detail="A chunk with this id already exists")
    docs = [{"id": d["id"], "title": d["title"], "text": d["text"]} for d in index.docs]
    docs.append(doc.model_dump())
    index = Index(docs)
    return {"status": "indexed", "chunks": len(index.docs)}
