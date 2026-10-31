# ZapFormat: owner access — deployment runbook

## Principle

Customer registration must never create or elevate an administrative user.
The business owner is provisioned once **on the trusted server**, not from a
public webpage. The app checks the role on every `/api/admin/*` request.
The role and password hash live in PostgreSQL; no admin credentials are in
GitHub, HTML, JavaScript, build variables, or a shared default account.

## First owner

Prerequisites: authenticated server operator, PostgreSQL `DATABASE_URL`
configured in a private backend environment, migrations already applied,
Node.js and dependencies installed. Execute from an **interactive private
server terminal**, not CI/logging or a chat terminal which records output:

```sh
cd /path/to/ZapFormat/backend
npm ci
npm run owner:provision -- --name "Owner" --email "owner@example.com"
```

Use the owner's actual chosen email, and optionally `--phone +7XXXXXXXXXX`.
The command refuses to run without a TTY, takes an advisory transaction lock,
refuses a second owner, refuses an identity already used by a customer, and
creates a server-side bcrypt password hash. It generates a random initial
password and shows it **only once** in the private terminal. Save that password
in the owner's password manager; do not send it by email or in a chat.
The owner can log in at `/admin/` with the chosen email and initial password.

The process is deliberately not a public endpoint and must not be callable
through browser registration. If an owner already exists, stop and perform a
documented, verified account-recovery procedure; do not reset or promote a
different account by guesswork. Verify ownership of the email/phone out of
band before initial provisioning.

## Password rotation

The owner panel has **Security → Change password**.
`POST /api/account/password/change` requires the current authenticated session,
the current password, and a new 12–128-character password. It rechecks the
current bcrypt hash, commits the new hash, and removes all old sessions.
After success the owner logs in with the new password.

## Operational gates before calling this production-grade

- [ ] Provision and verify the actual owner directly on the server.
- [ ] Configure and verify production deploy agent (currently
      `/api/deploy/status` reports `not_configured`).
- [ ] Deploy backend password-change route and perform live owner smoke tests.
- [ ] Put admin and API under a trusted business-controlled HTTPS origin.
      GitHub Pages currently serves a public **login UI**; the API correctly
      protects the data, but the cross-site bearer token in localStorage must
      be replaced with an HttpOnly Secure SameSite cookie and CSRF protection
      on the final same-site architecture.
- [ ] Enable MFA for owner login (passkey/TOTP; SMS recovery is not configured).
- [ ] Implement audit logging, backup/recovery, session monitoring and
      emergency owner revocation. Check that backups can be restored.
- [ ] Verify that customers cannot access `/api/admin/*` (401/403) and that
      owner access is enforced by the backend, not a hidden button.
- [ ] Do not equate sales minus purchase price to net profit.

Until these gates are complete, the published `/admin/` interface is an
independently deployed owner panel, **not a fully hardened production admin**.
