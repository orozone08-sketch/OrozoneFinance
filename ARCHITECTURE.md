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
