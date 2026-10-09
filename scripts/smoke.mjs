import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';

const remote = process.argv.includes('--remote');
const base = process.env.WORKER_URL || 'http://127.0.0.1:8787';
if (!remote && !['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Write checks require localhost. Use --remote for read-only verification.');
const secrets = process.env.FINANCE_PASSWORD ? {} : JSON.parse(await readFile(new URL('../.access/secrets.json', import.meta.url), 'utf8'));
const health = await fetch(`${base}/api/health`); assert.equal(health.status, 200); assert.equal((await health.json()).database, 'd1');
const denied = await fetch(`${base}/api/expenses`); assert.equal(denied.status, 401);
const login = await fetch(`${base}/auth/login`, { method: 'POST', body: new URLSearchParams({ password: process.env.FINANCE_PASSWORD || secrets.FINANCE_PASSWORD }), redirect: 'manual' });
assert.equal(login.status, 302);
const cookie = login.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
async function request(path, options = {}) {
  const result = await fetch(`${base}/api${path}`, { ...options, headers: { Cookie: cookie, ...options.headers } });
  return result;
}
async function get(path) { const response = await request(path); assert.equal(response.status, 200, path); return response.json(); }
async function post(path, body) { const response = await request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); assert.equal(response.status, 200, `${path}: ${await response.clone().text()}`); return response.json(); }
for (const path of ['/expenses', '/income', '/advances', '/parties', '/ads', '/reports/dashboard', '/reports/receivables', '/reports/issue-profitability', '/reports/reimbursements', '/features', '/attachments']) await get(path);
const template = await request('/imports/expenses/template'); assert.equal(template.status, 200);
const templateBook = new ExcelJS.Workbook(); await templateBook.xlsx.load(Buffer.from(await template.arrayBuffer()));
assert.equal(templateBook.worksheets[0].getRow(1).getCell(1).value, 'expense_date');
if (!remote) {
  if (!(await get('/attachments')).enabled) assert.equal((await request('/attachments', { method: 'POST' })).status, 503);
  else {
    const contents = '%PDF-1.4\n% Local attachment smoke proof\n%%EOF';
    const form = new FormData(); form.append('file', new Blob([contents], { type: 'application/pdf' }), 'smoke.pdf');
    const uploaded = await request('/attachments', { method: 'POST', body: form }); assert.equal(uploaded.status, 201);
    const metadata = await uploaded.json(); assert.equal(metadata.url, metadata.bill_ref);
    assert.ok((await get('/attachments')).files.some(file => file.id === metadata.id && file.filename === 'smoke.pdf' && file.size === contents.length));
    const downloaded = await request(`/attachments/${metadata.id}`); assert.equal(downloaded.status, 200); assert.equal(downloaded.headers.get('content-type'), 'application/pdf'); assert.equal(await downloaded.text(), contents);
    assert.equal((await fetch(`${base}${metadata.url}`)).status, 401, 'Attachments must require authentication');
    const invalid = new FormData(); invalid.append('file', new Blob(['script'], { type: 'text/html' }), 'unsafe.html');
    assert.equal((await request('/attachments', { method: 'POST', body: invalid })).status, 422);
    console.log('PASS: local R2 upload, private retrieval, D1 metadata, authentication, MIME restriction');
  }
  const tag = `Smoke-${Date.now()}`;
  const before = await get('/reports/dashboard');
  const expense = await post('/expenses', { expense_date: '2026-10-09', category: tag, paid_by: tag, project_issue: tag, reimbursable: 'Yes', total_amount: 40 });
  const income = await post('/income', { invoice_date: '2026-10-09', customer: tag, income_type: tag, magazine_issue: tag, invoice_total: 100, amount_received: 30 });
  await post('/advances', { person_name: tag, advance_date: '2026-10-09', amount: 10 });
  await post('/parties', { party_name: tag });
  const ad = await post('/ads', { booking_date: '2026-10-09', customer: tag, magazine_issue: tag });
  assert.equal(ad.rate, 0); assert.equal(ad.status, 'Booked');
  const after = await get('/reports/dashboard');
  assert.equal(after.total_income - before.total_income, 100); assert.equal(after.total_expense - before.total_expense, 40);
  assert.equal(after.net_profit - before.net_profit, 60); assert.equal(after.receivable - before.receivable, 70);
  assert.equal((await get('/reports/receivables')).find(row => row.id === income.id).outstanding, 70);
  assert.equal((await get('/reports/issue-profitability')).find(row => row.issue === tag).profit, 60);
  assert.equal((await get('/reports/reimbursements')).find(row => row.person === tag).balance, 30);
  const invalid = await request('/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expense_date: '2026-02-30', category: tag, total_amount: -1 }) }); assert.equal(invalid.status, 422);
  async function upload(rows) {
    const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Expenses'); sheet.addRow(['date', 'category', 'total']); rows.forEach(row => sheet.addRow(row));
    const form = new FormData(); form.append('file', new Blob([await book.xlsx.writeBuffer()]), 'smoke.xlsx'); return request('/imports/expenses', { method: 'POST', body: form });
  }
  const count = (await get('/expenses')).length;
  const badImport = await upload([['2026-10-09', tag, 15], ['invalid-date', tag, 10]]); assert.equal(badImport.status, 422); assert.equal((await get('/expenses')).length, count, 'Invalid import must not insert its valid row');
  const goodImport = await upload([['2026-10-09', tag, 15]]); assert.equal(goodImport.status, 200, await goodImport.clone().text()); assert.equal((await goodImport.json()).imported, 1);
  assert.equal((await get('/expenses')).length, count + 1);
  for (const [name, id] of [['expenses', expense.id], ['income', income.id]]) { assert.equal((await request(`/${name}/${id}`, { method: 'DELETE' })).status, 200); assert.equal((await request(`/${name}/${id}`, { method: 'DELETE' })).status, 404); }
}
console.log(`PASS: ${remote ? 'read-only remote' : 'local CRUD, reports, validation, atomic Excel imports'} smoke (${base})`);
