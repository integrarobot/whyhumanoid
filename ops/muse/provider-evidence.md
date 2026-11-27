# Muse questionnaire: provider evidence (27 Nov 2026)

This is a companion to `data-questionnaire-evidence.md`, which covers what the repository shows. This file covers what
the **providers** document about their own platforms. It is not a policy, a certification or a commitment by Why
Humanoid? / Integrarobot.

- Provider certifications belong to the provider, never to the operator.
- Contracts are the providers' own standard terms. Nothing here says the operator signed or accepted anything
  separately.
- No security control is claimed beyond what is written here.

**Evidence marks**
- **[V] Verbatim:** quoted from the provider's published documentation source, at a recorded commit:
  - Cloudflare: `cloudflare/cloudflare-docs` 21deb01, 27 Nov 2026;
  - GitHub: `github/site-policy` b9578b5.
  
  A last look at the live page before submitting is still advisable.
- **[U] Unverified:** the page URL is known, but the page could not be fetched from this session. Open it and copy
  the exact sentence before using it.

## Muse domain challenge

- Muse fetches this from the MCP host: `https://whyhumanoid-premium.javier-198.workers.dev/.well-known/muse-challenge/0f4b178779974ebde7e015a3353e0c0167fbf88f0afa2ca08aa90379b8c09dcb`
- It must get back exactly `muse-challenge=0f4b…9dcb`. The route is already in the reviewed code (PR 175, `server/src/app.js`).
- State observed by Codex on 27 Nov 2026, after deploying the reviewed bundles (PROD version 8171c73c, TEST 1ac00a70):
  - the challenge answers 200 with the exact body on both;
  - in the Muse portal: company verification Approved, challenge Verified, connector test Passed with 6 tools;
  - credentials Submitted, technical review In review.
  
  The check command is in `ops/worker-deploy.md`, section 4. No new challenge was needed.
- The challenge expires on 3 Dec 2026 at 19:32 Europe/Madrid.

## Hosting, location and transfers (Cloudflare)

- **Where the code runs: global.** [V] Workers "run in a data center closest to where the request was received"
  (developers.cloudflare.com/workers/configuration/placement/).
  - Pinning execution to a region needs Regional Services: [V] an Enterprise add-on, and only on a custom domain,
    not on workers.dev (developers.cloudflare.com/data-localization/how-to/workers/).
  - Neither is in use.
- **Where the data is stored: the EU.** The D1 database was created with jurisdiction `eu` (recorded in
  `server/wrangler.toml` and `DEPLOYMENT.md`). [V] "Jurisdictions are used to create D1 databases that only run and
  store data within a region"; "Workers may still access the database … from anywhere in the world"; it can only be
  set when the database is created (developers.cloudflare.com/d1/configuration/data-location/).
  - Confirmed in the dashboard (Codex, 27 Nov 2026): the production D1 database, under Settings, shows Jurisdiction The
    European Union, Region Eastern Europe, Read replication Disabled.
- **Encryption at rest.** [V] D1: "All objects stored in D1 … are encrypted at rest", AES-256 (GCM), with keys
  managed by Cloudflare (developers.cloudflare.com/d1/reference/data-security/).
  - Worker secrets are encrypted bindings (developers.cloudflare.com/workers/configuration/secrets/).
  - No customer-managed keys.
- **Encryption in transit.** [V] Traffic between the Worker and D1, and API and wrangler access, uses TLS (same D1
  page).
  - The minimum TLS version and HTTP-to-HTTPS behaviour of workers.dev are not documented by Cloudflare.
  - The application sends no HSTS header. A `HEAD /mcp` on 27 Nov 2026 showed none.
  - [V] Cloudflare describes workers.dev as intended "for personal or hobby projects"
    (developers.cloudflare.com/workers/configuration/routing/workers-dev/).
- **Backups.** [V] D1 Time Travel restores to any minute within the last 7 days (Free) or 30 days (Paid)
  (developers.cloudflare.com/d1/reference/time-travel/).
- **Processor terms and transfers.** [U] Cloudflare Customer DPA (www.cloudflare.com/cloudflare-customer-dpa/), which
  the GDPR FAQ (www.cloudflare.com/trust-hub/gdpr/) describes as incorporated into the self-serve agreement.
  - Transfers: the EU-U.S. Data Privacy Framework, with SCCs as a fallback (www.cloudflare.com/cloudflare-customer-scc/).
  - Subprocessors: www.cloudflare.com/gdpr/subprocessors/.
- **Cloudflare's certifications, not the operator's.** Do not name a specific certification as checked.
  - On 27 Nov 2026, the live D1 data-security page links to the Trust Hub. It no longer carries the SOC 2 and ISO
    27001 sentence of an earlier documentation commit.
  - [U] Cloudflare's list: www.cloudflare.com/trust-hub/compliance-resources/. Reports can be downloaded in the
    dashboard under Compliance Documents
    (developers.cloudflare.com/fundamentals/reference/policies-compliances/compliance-docs/).
  - Cite a certification only after reading it there on the day of the answer.
- **Government requests.** [U] Cloudflare publishes a transparency report (www.cloudflare.com/transparency/).
  - The operator publishes no report of its own.
  - Javier confirmed on 27 Nov 2026 that **no disclosures** were made to authorities in response to national-security
    requests in the past 12 months. That is not a statement that no requests were received, and none is made here.
  - Javier also confirmed on 27 Nov 2026 that four procedures apply to any request from authorities: a legality
    review, challenging requests where appropriate, disclosing the minimum, and keeping a record. These are
    procedures, not a statement about requests received. The separate security question (Q11) is answered on its own.

## Logs

- **Default setting.** Cloudflare's documentation is inconsistent about whether Workers Logs is on by default:
  - [V] "enabled by default" for new Workers;
  - [V] "You must add the observability setting" (developers.cloudflare.com/workers/observability/logs/workers-logs/).
  
  `server/wrangler.toml` has no observability block. **The dashboard decides:** Workers & Pages, the Worker,
  Observability.
- **Retention.** [V] 3 days (Free) or 7 days (Paid), per the Workers pricing page. Pricing changes on 1 Dec 2026.
- **Where logs are stored.** [V] Logs "may be stored in Cloudflare's core data centers globally" unless a boundary is
  configured.
- **Live logs.** [V] Real-time logs ("Live", `wrangler tail`) are not stored.
- **Account audit log.** [V] Kept for 18 months (Manage Account, Audit Logs).
- **What the application itself logs.** Error messages and stacks only, never request bodies, headers or keys
  (`data-questionnaire-evidence.md`).

## Other processors

- **Stripe (payments).** [U] DPA stripe.com/legal/dpa; service providers stripe.com/legal/service-providers.
  Transfers: DPF, SCCs and the UK addendum.
- **Resend (email).** [U] DPA resend.com/legal/dpa; subprocessors resend.com/legal/subprocessors.
  - Data is stored in the United States.
  - Transfers rely on SCCs and the DPF.
- **GitHub (code; imports run in GitHub Actions).** [V] Personal data is processed "in a variety of locations,
  including your local region, the United States". GitHub relies on SCCs (decision 2021/914) and complies with the
  EU-U.S. DPF (docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
  - The GitHub DPA and its subprocessor list cover the services it governs (docs.github.com/…/github-subprocessors).
  - Whether the DPA applies to this plan is to be confirmed.
- **Not covered here:** Google (Sheets read-only for imports) and Yahoo Finance (public RSS, no personal data sent).

## Only the account holders can confirm

- MFA on the Cloudflare, Stripe, Resend, GitHub and Google accounts.
- Whether Workers Logs is on, and its retention.
- The Workers plan: Free or Paid.
- Who has access: account members and roles.
- Which DPA version applies on each provider.

Answer "not established" for anything not confirmed. No SOC 2, penetration test, incident plan, government-request
history or SCC acceptance is claimed for the operator.
