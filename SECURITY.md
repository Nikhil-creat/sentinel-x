# Security policy

Sentinel-X is an educational and portfolio project. The in-browser demos use simulated data and send nothing anywhere.

## Reporting a vulnerability

Please open a private security advisory on the GitHub repository (Security tab, "Report a vulnerability")
or contact the author through the GitHub profile: https://github.com/Nikhil-creat

## Hardening notes for anyone deploying the Docker stack

- Set a long random `API_KEY` in `.env`. Without it the gateway accepts unauthenticated requests.
- Keep `DRY_RUN=true` and `REQUIRE_APPROVAL=true` unless you have connected real response tooling and reviewed the policies.
- Only the `web` service is published. Do not publish the gateway, RAG, vision or agents ports to the internet without TLS and authentication.
- The knowledge base and log samples are illustrative. Do not treat the detections as a replacement for a production SIEM or EDR.
