# Vercel environment and Supabase build failures

## Cause

Next.js imports route modules while collecting route configuration/page data, including POST-only APIs. A module-level `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)` therefore executes during the build. TypeScript's `!` is erased and does not supply a missing environment value. When the deployment lacks that URL, the Supabase constructor throws `supabaseUrl is required` before the route can run its authorization checks.

The batch score broadcast, single-class broadcast and parent Telegram webhook now use the existing validated `createAdminClient()` factory inside authorized requests. The webhook passes that request-local client into its score helper. No privileged client is constructed when those modules are imported. Missing service configuration returns a controlled 503 after authorization; unauthenticated callers/invalid webhook secrets remain rejected first.

## Required deployment configuration

Configure actual values for the deployment environment; `.env.local` is ignored by Git and is not uploaded by a normal repository deployment. Example values are for local test setup, not production credentials.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Real Supabase project URL, available at build time and runtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key for browser/session authentication, available at build time |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service credential for authorized background/API operations; never use a `NEXT_PUBLIC_` prefix |
| `PARENT_TELEGRAM_BOT_TOKEN` | Parent notification bot used by these three APIs |
| `TELEGRAM_WEBHOOK_SECRET` | Secret matching the parent Telegram webhook header |
| `NEXT_PUBLIC_SITE_URL` | Correct application origin used for report-card links |

Ensure values are available to the applicable **Preview** deployment scope/branch as well as **Production**. This incident was on `feat/school-pretest-paste`; having values only in a different environment does not configure that deployment. Redeploy after changing variables because `NEXT_PUBLIC_*` values are embedded during builds. Keep the URL/client key/service key paired with the intended project. Never commit real credentials or copy them into logs.

Deferring API clients does not make the application independent of its public Supabase configuration. The existing browser auth provider also requires the real public URL/key during production prerendering and at runtime. Do not bypass this with invented URLs, dummy credentials or disabled authentication.

The npm `cache-dir`/install-script warnings in the supplied log were not the fatal failure: compilation and TypeScript completed before the Supabase constructor error.

## Verification

`tests/reliability/telegram-route-build-safety.test.ts` imports the actual three routes in an isolated process with all Supabase credentials absent. It verifies imports succeed without network calls, broadcast requests reject unauthenticated users, webhook secrets fail closed, and an authorized but unconfigured webhook returns 503. Runtime admin-client creation still rejects missing credentials.

Production builds additionally require access to Google Fonts used by `next/font/google`; a local sandbox denial for that request is separate from the Supabase failure.

Local verification on 2026-10-30: type checking passed; all 36 selected Telegram/grading/report-card/authorization regressions passed with zero skips; the new test passed ESLint and the existing routes gained zero lint findings. The production build completed with `SUPABASE_SERVICE_ROLE_KEY` explicitly empty and the configured public URL/client key present. The first restricted build attempt was blocked fetching public Google Fonts; rerunning with network access passed. No Telegram messages, production data changes or deployments were performed.
