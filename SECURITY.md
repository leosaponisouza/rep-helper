# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `1.0.x` (`master`) | Yes |

## Security Architecture Highlights

- **Stateless JWT + Refresh Rotation:** Short-lived access tokens paired with server-side persisted refresh tokens that rotate on use and revoke immediately on reuse or logout.
- **Strict Multi-Tenant RBAC:** Household ("republic") isolation and `OWNER` / `ADMIN` / `MEMBER` role permissions are enforced server-side across all domain controllers via `RepublicSecurityService`.
- **Input & Upload Validation:** Jakarta Bean Validation on all API payloads, parameterized JPA queries (`ddl-auto=validate`), per-route rate limiting (`RateLimitFilter`), and binary magic-byte verification on uploaded media files.
- **Zero Client-Side Secret Exposure:** Environment variables in the Expo client are restricted strictly to `EXPO_PUBLIC_*` non-sensitive endpoints.

## Reporting a Vulnerability

Please **do not** open public GitHub issues for suspected security vulnerabilities.

Instead, report security findings privately via GitHub's **Report a vulnerability** advisory flow (or reach out directly via [LinkedIn](https://www.linkedin.com/in/leonardosaponi)) with:
1. Affected component (`backend/` or `frontend/`) and endpoint/file path.
2. Minimal reproduction steps or proof-of-concept request.
3. Potential impact assessment.

Reports are reviewed promptly and addressed before public disclosure.
