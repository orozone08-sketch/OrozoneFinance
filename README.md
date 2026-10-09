# OROZONE Finance Desk

React + TypeScript finance desk served by a Hono Cloudflare Worker. D1 stores all finance records and attachment metadata. No Python server or VM is needed for production.

Production: https://orozone-finance.orozone08.workers.dev

## Local development

Use Node 24+. Run `npm ci`, `npm ci --prefix frontend`, copy `.dev.vars.example` to `.dev.vars` and replace both example secrets. Then run `npm run db:local`, `npm run build`, and `npm run dev`. Open http://localhost:8787 and use the local password. For frontend hot reload, run `npm --prefix frontend run dev` separately; it proxies API/auth to the Worker.

## Git flow and deployment

Use feature branches and pull requests. GitHub Actions validates TypeScript, frontend build, Worker bundle, and local D1 integration tests. Cloudflare Workers Builds deploys pushes to `main`.

Build configuration:
- Root: `/`; production branch: `main`.
- Build: `npm ci && npm ci --prefix frontend && npm run check && npm run build`.
- Deploy: `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`.
- Disable non-production branch deployments to isolate production D1.

Account `1a970a489b3675156722383f7ce0fffd`, Worker `orozone-finance`, D1 binding `DB` / database `orozone-finance`.

Runtime secrets `FINANCE_PASSWORD` and `SESSION_SECRET` are stored in Cloudflare. Initial access details are in ignored local `.access/credentials.txt`. Shared password access uses an eight-hour signed HttpOnly cookie, origin validation, and Cloudflare login rate limiting. Sign out is in the sidebar. No secrets are committed or embedded in frontend bundles.

Manual deploy: `npm run deploy`. Configure secrets with `npx wrangler secret put FINANCE_PASSWORD` and `npx wrangler secret put SESSION_SECRET`. Rotating the session secret invalidates sessions. Local tests: `npm test` while Worker runs. Read-only production checks: set `WORKER_URL` to the live URL and run `node scripts/smoke.mjs --remote`, supplying `FINANCE_PASSWORD` or using ignored local credentials.

Migrations are append-only. Roll back code using Cloudflare Deployments or a reverted commit; preserve D1. D1 Time Travel is the data recovery path. Original Python backend remains under `backend/` for reference and is not deployed. No existing source database was provided; production starts empty. Import existing records through Excel.

## R2 activation later

R2 is intentionally unbound. Attachment API, private retrieval, D1 metadata, and frontend upload controls are prepared; uploads stay disabled until binding exists.

After activating R2 in Orozone's account, run `npx wrangler r2 bucket create orozone-finance-attachments`. Add the `r2_buckets` field from `wrangler.r2.example.jsonc` to `wrangler.jsonc`, commit and push `main`. Binding `ATTACHMENTS` enables upload automatically. Files remain private behind login. Copy uploaded reference into a bill reference or remarks. Verify production upload/retrieval after activation. No public bucket is needed.

## IMAP

Placeholder by request: no mailbox connection or background polling. Excel imports work independently. When ready, specify provider and ingestion behavior; forwarding selected mail through Cloudflare Email Routing could avoid a persistent IMAP poller.

## Modules and imports

Dashboard, expenses, income, ad bookings, advances, parties, receivables, issue profitability, reimbursements, Excel imports/templates. Imports are limited to 500 rows/5MB and insert nothing if any row fails validation. This operational desk does not replace statutory accounting.
