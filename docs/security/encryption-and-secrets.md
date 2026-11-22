# Cryptography, Encryption & Secrets Management

## Cryptographic Primitives & Specifications

| Purpose | Primitives | Key / Hash Specification | Implementation File |
| :--- | :--- | :--- | :--- |
| **Password Hashing** | Argon2id | Memory: 64MB, Iterations: 3, Parallelism: 4 | `src/auth/password/password.service.ts` |
| **OTP Verification** | Argon2id | 6-digit random code hashed at rest | `src/auth/otp/otp.service.ts` |
| **Access Tokens** | JOSE JWT (`HS256`) | 256-bit (32 bytes Base64) secret | `src/auth/token/token.service.ts` |
| **Selection Tokens** | JOSE JWT (`HS256`) | 256-bit (32 bytes Base64) secret | `src/auth/token/token.service.ts` |
| **Refresh Tokens** | Cryptographic Random | 256-bit random, stored as SHA-256 | `src/auth/session/session.service.ts` |
| **Member Document Data**| AES-256-GCM | 12-byte random IV, 16-byte auth tag, format `v1.iv.tag.ciphertext` | `src/members/member-identifier.service.ts` |
| **Document Blind Index**| HMAC-SHA-256 | 256-bit secret key, hex digest output | `src/members/member-identifier.service.ts` |
| **Global User Discovery**| HMAC-SHA-256 | Deterministic hash over normalized email/phone | `src/auth/identity/identity.service.ts` |

## Secrets Management Rules
1. All secret keys must be valid Base64 representations of exactly 32 bytes (256 bits).
2. Missing or malformed keys fail fast at startup (`loadSecret` / `loadKey` checks byte length and rejects invalid keys).
3. Secrets are loaded via process environment variables and must never be committed to source code or logged.
