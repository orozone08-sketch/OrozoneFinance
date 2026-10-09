# Architecture & Screen Flow

## Expense workflow
Draft -> Submitted -> Approved -> Paid

Main fields: date, voucher, paid by, category, sub-category, vendor, description, base, GST, total, mode, paid from, reimbursable, magazine issue, event, bill status/reference, remarks, status.

## Income workflow
Quotation -> Confirmed -> Invoice Raised -> Part Paid -> Paid

Main fields: invoice date/no., customer, income type, ad/package, magazine issue, salesperson, base, GST, invoice total, amount received, due date, payment mode, bank, status, remarks.

## Advertisement workflow
Booked -> Artwork Pending -> Approved -> Published -> Closed

Tracks customer, issue, ad position, package, rate, discount, final amount, GST, invoice total, artwork, invoice, payment and publication status.

## Dashboard KPIs
- Total income
- Total expenses
- Net profit/loss
- Amount received
- Receivables
- Advances given
- Expense category chart
- Income source chart

## Reports currently implemented
- Outstanding receivables
- Issue-wise profitability
- Reimbursement settlement

## Suggested V2 database tables
users, roles, permissions, attachments, payments, bank_accounts, audit_logs, budgets, partner_drawings, financial_years, invoice_sequences, gst_rates.

## Cloudflare production runtime

Browser -> Hono Worker (signed-session access gate) -> D1. The same Worker serves the React frontend as static assets. Login attempts use Cloudflare's native rate limiter. Finance routes are under /api; read/write requests require a server-side session. No browser database credentials exist.

Excel uploads are validated and parsed synchronously from ZIP/XML, then inserted in one D1 batch. This avoids stream callbacks crossing Worker request lifetimes. Templates remain .xlsx files. A failed workbook inserts no rows.

Optional attachments: authenticated upload -> private R2 object -> D1 metadata; metadata failures remove the newly uploaded object. R2 is unbound until activation. IMAP is a placeholder; no credentials, polling, or cron trigger is configured.

Native Workers Builds is connected to orozone08-sketch/OrozoneFinance, production branch main. Preview builds are disabled. The build runs TypeScript and the frontend build; deploy applies append-only D1 migrations before publishing the Worker. GitHub Actions separately exercises local D1 integration checks on pushes and pull requests.
