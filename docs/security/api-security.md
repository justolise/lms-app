# API Security & Input Validation

## Request Pipeline Hardening

1. **Payload Limits**: Express JSON and URL-encoded parsers restricted to 1MB to prevent memory exhaustion denial of service.
2. **Global ValidationPipe**:
   - `whitelist: true`: Strips undeclared properties from request bodies.
   - `forbidNonWhitelisted: true`: Immediately rejects payloads with unapproved fields (400 Bad Request).
   - `transform: true`: Automatically coerces types into declared DTO models.
3. **CORS Configuration**: Dynamic validation against `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL`. Disallows wildcard origins with credentials.
4. **Rate Limiting**: Sliding-window Redis counters with atomic Lua evaluation. Client IP extracted via Express trusted proxy (`request.ip`).
5. **Centralized Error Handling**: `HttpExceptionFilter` intercepts all runtime exceptions, strips database stack traces from client responses, and logs structured security events.
6. **SQL Injection Defense**: Drizzle ORM query builders and `sql` tagged template literals strictly parameterize all inputs into query variables (`$1`, `$2`). No raw string interpolation is permitted.
7. **SSRF Defense**: ISBN lookup normalizes input to 13 digits before executing outbound queries; user-controlled target URLs are forbidden.
