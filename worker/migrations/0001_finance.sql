CREATE TABLE expenses (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 expense_date TEXT NOT NULL, voucher_no TEXT, paid_by TEXT,
 category TEXT NOT NULL, sub_category TEXT, description TEXT, vendor TEXT,
 base_amount REAL NOT NULL DEFAULT 0, gst_amount REAL NOT NULL DEFAULT 0,
 total_amount REAL NOT NULL CHECK(total_amount > 0), payment_mode TEXT, paid_from TEXT,
 reimbursable TEXT NOT NULL DEFAULT 'No', project_issue TEXT, event_name TEXT,
 bill_available TEXT NOT NULL DEFAULT 'No', bill_ref TEXT, remarks TEXT,
 status TEXT NOT NULL DEFAULT 'Submitted', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE income (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 invoice_date TEXT NOT NULL, invoice_no TEXT, customer TEXT NOT NULL, income_type TEXT NOT NULL,
 ad_type TEXT, magazine_issue TEXT, sales_person TEXT,
 base_amount REAL NOT NULL DEFAULT 0, gst_amount REAL NOT NULL DEFAULT 0,
 invoice_total REAL NOT NULL CHECK(invoice_total > 0), amount_received REAL NOT NULL DEFAULT 0,
 due_date TEXT, payment_mode TEXT, bank_name TEXT,
 status TEXT NOT NULL DEFAULT 'Invoice Raised', remarks TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE advances (
 id INTEGER PRIMARY KEY AUTOINCREMENT, person_name TEXT NOT NULL, advance_date TEXT NOT NULL,
 amount REAL NOT NULL CHECK(amount > 0), remarks TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE parties (
 id INTEGER PRIMARY KEY AUTOINCREMENT, party_name TEXT NOT NULL, party_type TEXT,
 contact_person TEXT, mobile TEXT, email TEXT, gstin TEXT, address TEXT, remarks TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE ad_bookings (
 id INTEGER PRIMARY KEY AUTOINCREMENT, booking_date TEXT NOT NULL, customer TEXT NOT NULL,
 magazine_issue TEXT NOT NULL, position TEXT, package_name TEXT,
 rate REAL NOT NULL DEFAULT 0, discount REAL NOT NULL DEFAULT 0, final_amount REAL NOT NULL DEFAULT 0,
 gst_amount REAL NOT NULL DEFAULT 0, invoice_total REAL NOT NULL DEFAULT 0,
 artwork_received TEXT NOT NULL DEFAULT 'No', artwork_approved TEXT NOT NULL DEFAULT 'No',
 invoice_raised TEXT NOT NULL DEFAULT 'No', payment_received TEXT NOT NULL DEFAULT 'No',
 published TEXT NOT NULL DEFAULT 'No', status TEXT NOT NULL DEFAULT 'Booked', remarks TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX expenses_category_idx ON expenses(category);
CREATE INDEX expenses_paid_by_idx ON expenses(paid_by, reimbursable);
CREATE INDEX expenses_issue_idx ON expenses(project_issue);
CREATE INDEX income_customer_idx ON income(customer);
CREATE INDEX income_issue_idx ON income(magazine_issue);
CREATE INDEX income_type_idx ON income(income_type);
CREATE INDEX advances_person_idx ON advances(person_name);
CREATE INDEX parties_name_idx ON parties(party_name);
CREATE INDEX ads_customer_idx ON ad_bookings(customer);
CREATE INDEX ads_issue_idx ON ad_bookings(magazine_issue);
