# Infrastructure & Deployment Security

## Containerization
- **Redis**: Runs `redis:7-alpine` bound to `127.0.0.1`, configured with `--requirepass` password authentication and append-only persistence (`--appendonly yes`).
- **PostgreSQL**: Hardened configuration with strict connection timeouts, restricted connection pool (`max: 10`), and TLS encryption in production.

## Environment Variables & Secret Hygiene
- All environment variables are validated at startup. Missing configuration halts execution before socket binding.
- Secrets are never embedded in container images or committed to Git.
- Container images in CI/CD are pinned to specific version tags.
