# Security Policy — Alpendre

## Supported Versions

| Version | Supported |
|---|---|
| `1.0.x` (`master`) | Yes |

## Security Architecture Highlights

- **Stateless JWT + Refresh Rotation:** Short-lived HS256 access tokens paired with server-side SHA-256 hashed refresh tokens that rotate on every use and revoke immediately on reuse, password change/reset, or logout.
- **Strict Multi-Tenant Household RBAC:** Household (`house`) isolation and `OWNER` / `ADMIN` / `MEMBER` role permissions (including `allMembersAdmin` shared-governance rules while protecting the `OWNER` from removal or demotion) are enforced server-side across all domain controllers via `HouseSecurityService`.
- **Adaptive Financial & Domain Invariants:** When `hasSharedFund = false`, fund-only mutations (`/api/v1/incomes`, `/adjust-balance`, `/reimburse`) are rejected server-side with `400 SHARED_FUND_DISABLED`. When `requireRsvp = false`, RSVP mutations (`/respond`, `/invite`) are rejected with `400 RSVP_NOT_ENABLED`. All balance mutations acquire PostgreSQL `PESSIMISTIC_WRITE` row locks via `HouseBalanceLedger`.
- **Input & Upload Validation:** Jakarta Bean Validation on all API payloads, parameterized JPA queries (`ddl-auto=validate`), per-route rate limiting (`RateLimitFilter`), and binary magic-byte signature verification (`JPEG`, `PNG`, `WebP`, `GIF`) on uploaded media files.
- **Zero Client-Side Secret Exposure:** Environment variables in the Expo client (`com.alpendre.app`) are restricted strictly to `EXPO_PUBLIC_*` non-sensitive endpoints, enforced by automated security tests (`envSecurity.test.ts`).

## Reporting a Vulnerability

Please **do not** open public GitHub issues for suspected security vulnerabilities.

Instead, report security findings privately via GitHub's **Report a vulnerability** advisory flow (or reach out to `contato@alpendre.app` / [LinkedIn](https://www.linkedin.com/in/leonardosaponi)) with:
1. Affected component (`backend/` or `frontend/`) and endpoint/file path.
2. Minimal reproduction steps or proof-of-concept request.
3. Potential impact assessment.

Reports are reviewed promptly and addressed before public disclosure.
