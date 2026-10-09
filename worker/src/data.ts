export type Dataset = {
  table: string; columns: string[]; required: string[]; positive: string[];
  defaults: Record<string, string | number>; aliases: Record<string, string>;
};
export const datasets: Record<string, Dataset> = {
  expenses: { table: 'expenses', columns: 'expense_date voucher_no paid_by category sub_category description vendor base_amount gst_amount total_amount payment_mode paid_from reimbursable project_issue event_name bill_available bill_ref remarks status'.split(' '), required: ['expense_date', 'category', 'total_amount'], positive: ['total_amount'], defaults: { base_amount: 0, gst_amount: 0, reimbursable: 'No', bill_available: 'No', status: 'Submitted' }, aliases: { date: 'expense_date', total: 'total_amount', gst: 'gst_amount', vendor_person: 'vendor' } },
  income: { table: 'income', columns: 'invoice_date invoice_no customer income_type ad_type magazine_issue sales_person base_amount gst_amount invoice_total amount_received due_date payment_mode bank_name status remarks'.split(' '), required: ['invoice_date', 'customer', 'income_type', 'invoice_total'], positive: ['invoice_total'], defaults: { base_amount: 0, gst_amount: 0, amount_received: 0, status: 'Invoice Raised' }, aliases: { date: 'invoice_date', total: 'invoice_total', gst: 'gst_amount', received: 'amount_received' } },
  advances: { table: 'advances', columns: 'person_name advance_date amount remarks'.split(' '), required: ['person_name', 'advance_date', 'amount'], positive: ['amount'], defaults: {}, aliases: { person: 'person_name', name: 'person_name', date: 'advance_date' } },
  parties: { table: 'parties', columns: 'party_name party_type contact_person mobile email gstin address remarks'.split(' '), required: ['party_name'], positive: [], defaults: {}, aliases: { name: 'party_name', party: 'party_name', type: 'party_type' } },
  ads: { table: 'ad_bookings', columns: 'booking_date customer magazine_issue position package_name rate discount final_amount gst_amount invoice_total artwork_received artwork_approved invoice_raised payment_received published status remarks'.split(' '), required: ['booking_date', 'customer', 'magazine_issue'], positive: [], defaults: { rate: 0, discount: 0, final_amount: 0, gst_amount: 0, invoice_total: 0, artwork_received: 'No', artwork_approved: 'No', invoice_raised: 'No', payment_received: 'No', published: 'No', status: 'Booked' }, aliases: { date: 'booking_date', issue: 'magazine_issue', total: 'invoice_total' } },
};
const numeric = new Set('base_amount gst_amount total_amount invoice_total amount_received amount rate discount final_amount'.split(' '));
export function validate(config: Dataset, source: Record<string, unknown>, spreadsheet = false) {
  const payload: Record<string, string | number | null> = {};
  const errors: string[] = [];
  for (const key of config.columns) {
    let value = source[key] ?? config.defaults[key] ?? null;
    if (spreadsheet && typeof value === 'string') value = value.trim() || (config.defaults[key] ?? null);
    if (value === null) { payload[key] = null; continue; }
    if (numeric.has(key)) {
      if (spreadsheet && typeof value === 'string') value = value.replace(/[,₹$]/g, '').trim();
      if ((typeof value !== 'number' && typeof value !== 'string') || value === '' || !Number.isFinite(Number(value))) errors.push(`${key} must be a number`);
      else payload[key] = Number(value);
    } else if (key.endsWith('_date')) {
      if (spreadsheet && value instanceof Date) value = value.toISOString().slice(0, 10);
      if (spreadsheet && typeof value === 'number' && value >= 1 && value <= 2958465) value = new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) errors.push(`${key} must be a valid YYYY-MM-DD date`);
      else payload[key] = value;
    } else if (typeof value !== 'string' && !spreadsheet) errors.push(`${key} must be text`);
    else payload[key] = String(value);
  }
  for (const key of config.required) if (payload[key] === null || payload[key] === undefined || payload[key] === '') errors.push(`${key} is required`);
  for (const key of config.positive) if (typeof payload[key] === 'number' && Number(payload[key]) <= 0) errors.push(`${key} must be greater than 0`);
  return { payload, errors };
}
export function insert(db: D1Database, config: Dataset, payload: Record<string, string | number | null>, returning = true) {
  return db.prepare(`INSERT INTO ${config.table} (${config.columns.join(',')}) VALUES (${config.columns.map(() => '?').join(',')})${returning ? ' RETURNING *' : ''}`).bind(...config.columns.map(key => payload[key] ?? null));
}
