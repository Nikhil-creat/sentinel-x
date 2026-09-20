# Threat model (summary)

| Threat | Mitigation in this project |
|---|---|
| Prompt injection through logs or retrieved text | Retrieved text is treated as data. The LLM prompt says so. Tools are allow-listed and arguments are validated by Pydantic models |
| Agent takes a harmful action | Dry-run by default, human approval by default, every step recorded in the timeline |
| Malicious file upload | 8 MB limit, files are only read as bytes and never executed, services run as non-root with read-only filesystems |
| Abuse of the API | Optional API key, per-IP rate limiting, security headers, only `web` is published |
| Lateral movement between containers | Segmented networks, analysis services on an internal network, all Linux capabilities dropped, `no-new-privileges` |
| Secrets exposure | `.env` is git-ignored, no secrets in images |
| Supply-chain risk | Pinned Python dependencies, CI checks, image scanning recommended before deployment |
| Over-trust in the model | Cited answers, refusal when evidence is missing, explainable CNN heatmap, design targets clearly separated from measured results |

Out of scope: real network capture, production-grade detection content, multi-tenant isolation.
