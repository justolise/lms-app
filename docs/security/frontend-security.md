# Frontend Security Architecture (Next.js 16)

## Security Headers
Configured in `apps/web/next.config.ts`:
- **Content-Security-Policy (CSP)**:
  `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' wasm-unsafe-eval; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 ws:; frame-ancestors 'none'; object-src 'none';`
- **Permissions-Policy**:
  `camera=(self), microphone=(), geolocation=()` (Enables same-origin camera barcode scanning while locking down microphone and location).
- **X-Frame-Options**: `DENY` (Protects against clickjacking).
- **X-Content-Type-Options**: `nosniff` (Prevents MIME-sniffing).
- **Referrer-Policy**: `strict-origin-when-cross-origin`.

## Client Token Security
- Zero token storage in browser `localStorage` or `sessionStorage`.
- All tokens transported via `HttpOnly`, `SameSite: 'lax'`, `Secure` (production) cookies.
- No `dangerouslySetInnerHTML` in the entire UI; all dynamic variables safely escaped by React 19 JSX parser.
