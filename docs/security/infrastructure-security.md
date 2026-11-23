# Infrastructure & Deployment Security

## Containerization & Multi-Stage Production Images

- **NestJS API (`apps/api/Dockerfile`)**: Multi-stage Alpine build. Dependencies are pruned to production-only in the runner stage. The application runs under an unprivileged non-root user (`nodejs:nodejs` UID 1001), preventing container breakout vulnerabilities.
- **Next.js Web (`apps/web/Dockerfile`)**: Multi-stage Alpine build outputting a standalone Node.js server. Static assets are cached, and the server runs under unprivileged non-root user (`nextjs:nodejs` UID 1001).
- **PostgreSQL 16**: Hardened Alpine image with custom initialization scripts, restricted connection pools, and persistent Docker volume storage (`postgres_data`).
- **Redis 7**: Runs `redis:7-alpine` configured with `--requirepass` password authentication, append-only persistence (`--appendonly yes`), and persistent Docker volume storage (`redis_data`).
- **Standalone DB Migrator**: Containerized migration runner executing TypeScript/Drizzle migrations before API container starts, preventing application boot with pending schema diffs.
- **Docker Compose Stack (`docker-compose.yml`)**: Coordinates inter-container networking over an isolated bridge network (`lms-network`), with health-check dependency gating (`condition: service_healthy`).

## Environment Variables & Secret Hygiene
- All environment variables are validated at startup. Missing configuration halts execution before socket binding.
- Secrets (`ACCESS_TOKEN_SECRET`, `PLATFORM_JWT_SECRET`, `PLATFORM_MFA_ENCRYPTION_KEY`, `IDENTITY_LOOKUP_HMAC_KEY`) are never embedded in container images or committed to Git.
- Container images in CI/CD are pinned to specific version tags.
