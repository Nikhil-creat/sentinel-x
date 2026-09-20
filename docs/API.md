# API

All routes go through the gateway (`/api/...` on the web container, or port 8000 of the gateway). If `API_KEY` is set, send it as the `X-API-Key` header. Interactive docs are served by each FastAPI service at `/docs` when you run it directly.

| Method and path | Body | Response |
|---|---|---|
| `GET /health` | none | `{status, services:{rag,vision,agents}}` |
| `POST /api/rag/query` | `{"query": "how do I detect ransomware?"}` | `{none, answer:[{text,cite}], hits:[{id,title,text,score}]}` |
| `POST /api/vision/scan` | multipart file field `file` (8 MB limit) | `{probs, top, confidence, entropy, features, engine}` |
| `POST /api/agents/run` | `{"scenario":"ransom","require_approval":true}` | run object with `id`, `status`, `timeline`, `summary` |
| `GET /api/agents/runs/{id}` | none | run object |
| `POST /api/agents/runs/{id}/approve` | `{"approve": true}` | finished run object |

Scenarios: `phishing`, `ransom`, `sqli`, `brute`, `beacon`, `deepfake`.

Example:

```bash
curl -s -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" -H "X-API-Key: $API_KEY" \
  -d '{"query":"how do I detect SQL injection?"}'
```
