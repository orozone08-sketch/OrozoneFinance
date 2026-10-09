# Deployment verification

Verified 9 October 2026 on Orozone Cloudflare account 1a970a489b3675156722383f7ce0fffd.

- Live URL: https://orozone-finance.orozone08.workers.dev
- Initial implementation commit: d8345ecec781ff00b80ecc36398206e9b313deec.
- GitHub checks: https://github.com/orozone08-sketch/OrozoneFinance/actions/runs/37943685378 (passed).
- Production D1 migrations 0001 and 0002 applied. No source database was supplied; initial production data is empty.
- TypeScript, production frontend build, Worker bundle, and local integration checks passed.
- Local integration checked five datasets, report totals, date/amount validation, atomic rejected imports, repeated valid Excel uploads, and deletion responses.
- Live login, unauthenticated API denial, all modules/reports, template download, and two consecutive real Excel uploads passed. Only temporary synthetic verification rows were created; those exact rows were deleted and original production count restored.
- Browser-rendered dashboard and import screen inspected. Mailbox placeholder and R2 pending state confirmed.
- R2 tested locally with private PDF upload, metadata, byte-exact download, unauthenticated denial, and MIME rejection. Production R2 remains unbound and awaits activation.
- Root and frontend dependency audits returned zero vulnerabilities.
- Native Workers Builds connection saved for main, with non-production builds disabled. Build command and migration/deploy command documented in README.

Local credentials and screenshots are in ignored .access/. They are not committed. The CI test password is disposable and only used with local simulated resources.
