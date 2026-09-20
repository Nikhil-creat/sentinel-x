# Architecture

## Layers

| Layer | Responsibility | Implementation |
|---|---|---|
| Agent orchestrator | Coordinates Monitor, Planner, Analyst, Reasoner, Responder and Reporter agents with allow-listed tools and an approval gate | `backend/agents` (Python state machine) and `js/agents.js` |
| LLM reasoning | Explains risk and maps to MITRE ATT&CK | Ollama (optional) with a rule-based fallback |
| RAG knowledge | Retrieves cited evidence from the threat knowledge base | `backend/rag`, `js/rag.js` |
| CNN vision | Classifies files rendered as 32 by 32 byte-plot images | `backend/vision`, `js/vision.js` |
| Data ingestion | Normalises logs and events | Simulated in the demo, log analyser in `js/tools.js` |
| Docker runtime | Isolation, networks, secrets, health checks | `docker-compose.yml`, `web/` |

## Incident flow

1. **Monitor** receives an alert.
2. **Planner** builds the plan.
3. **Analyst** calls `rag.retrieve` and, when a file is involved, `vision.scan`.
4. **Reasoner** combines base severity, CNN confidence and retrieval similarity into a risk score (`risk_score` in `backend/agents/logic.py`) and writes a rationale.
5. **Responder** proposes actions. If approval is required the run pauses in `awaiting_approval`.
6. **Reporter** produces the incident report with the timeline as an audit trail.

## Networks

- `edge`: `web` and `gateway`. Only `web` publishes a port.
- `core` (internal): `gateway`, `rag`, `vision`, `agents`, `llm`. No internet route.
- `egress`: used only by the optional `llm` container to download models.

## Extending

- Replace TF-IDF with embeddings: swap `Index` in `backend/rag/logic.py` for a vector-database client. The response shape stays the same.
- Use a real dataset for the CNN: edit `make_dataset()` in `backend/vision/train.py`.
- Move to LangGraph: each agent step in `backend/agents/main.py` maps to one graph node.
- Add real response tooling: implement it behind `actions.execute` and keep `REQUIRE_APPROVAL=true`.
