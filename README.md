# OROZONE Finance Desk — Python + TypeScript

Full-stack starter application for OROZONE JEWEL NEWS finance management.

## Stack
- Backend: Python, FastAPI, SQLAlchemy, SQLite
- Frontend: TypeScript, React, Vite, Axios, Recharts
- Database can later move to PostgreSQL by changing DATABASE_URL.

## Included modules
- Dashboard
- Expenses
- Income
- Advertisement Bookings
- Advances & Reimbursements
- Parties Master
- Outstanding Receivables
- Issue-wise Profitability
- API documentation

## Run backend
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Backend: http://127.0.0.1:8000
API docs: http://127.0.0.1:8000/docs

## Run frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

## Production upgrades recommended
1. Login + roles: Admin, Accounts, Sales, Staff, Viewer.
2. PostgreSQL instead of SQLite for multi-user cloud use.
3. Bill/PDF/image uploads with secure object storage.
4. Payment receipt and bank reconciliation modules.
5. GST input/output and invoice PDF generation.
6. Automatic invoice/voucher numbering.
7. Edit approval and audit log.
8. Soft-delete rather than permanent delete.
9. Excel/PDF exports.
10. Budget vs actual and partner drawings/settlement.
11. HTTPS, daily backups and environment secrets.

## Note
This is an operational finance-management MVP, not statutory accounting software. GST returns, TDS, audited books and statutory filings should remain reconciled with the official accounting system/CA.
