# Muse connector: source evidence for the data questionnaire

Facts from this repository at main `71cdac5` (26 Nov 2026), for answering Muse's data questionnaire about the public
read-only Why Humanoid? MCP connector (`https://whyhumanoid-premium.javier-198.workers.dev/mcp`). It records what
the code and configuration show and what they do not. It is not a policy, a certification or a commitment, and
nothing here should be stated to Muse as more than it says.

## What the repository shows

**Hosting and location**
- The backend is one Cloudflare Worker (`server/src/worker.js`). `server/wrangler.toml` sets no placement or
  location, so requests run on Cloudflare's network wherever Cloudflare routes them.
- Its database is Cloudflare D1. `whyhumanoid-premium` is recorded as created in the EU jurisdiction
  (`server/wrangler.toml`, comment on the production `d1_databases`; `DEPLOYMENT.md`, production environment). The
  jurisdiction is chosen when the database is created in the dashboard; the repository records it but cannot
  enforce it.
- Other services the code calls:
  - Stripe, for payments (`server/src/billing.js`);
  - Resend, for email (`EMAIL_FROM`, `server/src/mailer.js`);
  - Google Sheets, read-only, for imports run from GitHub Actions (`.github/workflows/import-workbook.yml`);
  - Yahoo Finance's public RSS feed, for headlines (`server/src/news/yahoo.js`).

**What an MCP request processes**
- The tools are read-only queries of the catalogue (`server/src/mcp.js`). They apply the same access rules as the
  HTTP API: public values without a key, and full values only with a subscriber's key (`server/src/access/`).
- With an API key, the Worker keeps per-key request counters by minute and by day, under the key's SHA-256 hash.
  Old windows are pruned (`server/src/usage.js`). Without a key, nothing about the request is stored by the
  application.

**Unexpected errors**
- An unhandled error is logged as `unhandled error` with the error object (message and stack) through `console.error`,
  and the caller receives `{"error":"internal_error"}` (`server/src/app.js`). The code does not log request bodies,
  headers or keys.
- Other log lines:
  - email delivery failures (message only);
  - rejected import tokens (reason only);
  - Stripe price mismatches;
  - failed scheduled imports.
- `server/wrangler.toml` has no `[observability]` block. Whether Workers Logs or Logpush are on, and for how long they
  keep logs, is an account setting not visible here.

**Retention and deletion in D1**
- Only `usage_counters` is pruned by code (`server/src/usage.js`).
- These tables have no automatic deletion and no deletion-on-request route; they can only be deleted manually:
  - accounts (email addresses);
  - sessions, login tokens and API keys;
  - Stripe events;
  - report orders;
  - the email outbox;
  - import runs.
- Login links expire after 15 minutes and sessions after 30 days (`server/src/worker.js`). Expired rows are not
  removed.

**Security controls implemented in code**
- **Hashed credentials:** login tokens, sessions and API keys are stored as SHA-256 hashes, never in clear
  (`server/src/auth.js`). A login link works once; at most 5 can be requested per email per hour.
- **Rate limits:** API keys are limited to 60 requests a minute and 5,000 a day, with 429 and `Retry-After`
  (`server/src/usage.js`). Browser sessions and requests without a key are not rate-limited by the application.
- **Input validation:**
  - MCP tool inputs are checked with zod schemas: maximum lengths and integer ranges (`server/src/mcp.js`);
  - Stripe webhooks are verified by signature, with a 300-second tolerance (`server/src/billing.js`);
  - the admin import accepts only GitHub's OIDC token for this repository, workflow, environment and an allowed
    branch, and validates its body (`server/src/import/github-oidc.js`, `server/src/app.js`).
- **Server-side access:** access is decided on the server (`server/src/access/matrix.js`); paid values are never sent
  to a caller without a subscription.
- **CORS:** limited to `ALLOWED_ORIGINS`.
- **App page headers:** a content security policy, `nosniff`, `no-referrer` and `noindex`
  (`server/scripts/dashboard-entry.js`).
- **Secrets:** they are Worker secrets, kept out of Git; guards check public files (`tools/check-public.mjs`,
  `tools/check-reserved.mjs`).
- **Transport:** the Worker is served over HTTPS on workers.dev. The application does not send an HSTS header.

## Not shown by the repository (to confirm with the provider or the account)

- **Encryption at rest:** D1 and Cloudflare storage. This is a platform property; check Cloudflare's documentation
  and DPA.
- **TLS on workers.dev:** the minimum TLS version and the HTTP-to-HTTPS behaviour.
- **Logs:** whether Workers Logs or Logpush are enabled, and their retention.
- **Staff access:** MFA and access control on the Cloudflare, GitHub, Stripe, Google and Resend accounts.
- **No evidence in the repository of:**
  - SOC 2 or other certifications;
  - penetration tests;
  - an incident response plan;
  - a history of government data requests;
  - acceptance of standard contractual clauses.
- **Operator and Persona identity verification:** this belongs to Javier.
