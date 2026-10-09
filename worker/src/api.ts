import { Hono } from 'hono';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { datasets, insert, validate } from './data';
import { readWorkbook } from './xlsx';

export type Bindings = { DB: D1Database; ASSETS: Fetcher; ATTACHMENTS?: R2Bucket; [key: string]: unknown };
export const api = new Hono<{ Bindings: Bindings }>();
api.onError((error, c) => {
  console.error('Finance API request failed', error.message);
  return c.json({ detail: 'The request could not be completed. Please try again.' }, 500);
});
api.get('/attachments', async c => {
  if (!c.env.ATTACHMENTS) return c.json({ enabled: false, status: 'pending_r2_activation', files: [] });
  const result = await c.env.DB.prepare('SELECT id,filename,content_type,size,created_at FROM attachments ORDER BY created_at DESC').all();
  return c.json({ enabled: true, files: result.results });
});
api.post('/attachments', async c => {
  const bucket = c.env.ATTACHMENTS;
  if (!bucket) return c.json({ detail: 'Attachments will be available after R2 activation' }, 503);
  if (Number(c.req.header('content-length') || 0) > 11 * 1024 * 1024) return c.json({ detail: 'Attachment limit is 10 MB' }, 413);
  let file: File | string | null;
  try { file = (await c.req.formData()).get('file'); } catch { return c.json({ detail: 'Invalid multipart upload' }, 400); }
  if (!(file instanceof File) || !file.size) return c.json({ detail: 'Choose a nonempty file' }, 422);
  if (file.size > 10 * 1024 * 1024) return c.json({ detail: 'Attachment limit is 10 MB' }, 413);
  if (!['application/pdf','image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) return c.json({ detail: 'Only PDF, JPEG, PNG, WebP and GIF attachments are supported' }, 422);
  const id = crypto.randomUUID(), key = `bills/${id}`;
  await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  try { await c.env.DB.prepare('INSERT INTO attachments(id,object_key,filename,content_type,size) VALUES(?,?,?,?,?)').bind(id,key,file.name,file.type,file.size).run(); }
  catch (error) { await bucket.delete(key); throw error; }
  return c.json({ id, filename: file.name, content_type: file.type, size: file.size, url: `/api/attachments/${id}`, bill_ref: `/api/attachments/${id}` }, 201);
});
api.get('/attachments/:id', async c => {
  if (!c.env.ATTACHMENTS) return c.json({ detail: 'Attachments will be available after R2 activation' }, 503);
  const record = await c.env.DB.prepare('SELECT object_key,filename,content_type FROM attachments WHERE id=?').bind(c.req.param('id')).first<{ object_key: string; filename: string; content_type: string }>();
  if (!record) return c.json({ detail: 'Attachment not found' }, 404);
  const object = await c.env.ATTACHMENTS.get(record.object_key);
  if (!object) return c.json({ detail: 'Attachment file not found' }, 404);
  return new Response(object.body, { headers: { 'Content-Type': record.content_type, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(record.filename)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
});
api.get('/features', c => c.json({ imap: { enabled: false, status: 'placeholder', message: 'Manual Excel imports are available. Mailbox ingestion is not configured.' }, attachments: { enabled: !!c.env.ATTACHMENTS, status: c.env.ATTACHMENTS ? 'binding_ready' : 'pending_r2_activation' } }));
api.get('/health', async c => {
  await c.env.DB.prepare('SELECT 1').first();
  return c.json({ ok: true, database: 'd1', storage: c.env.ATTACHMENTS ? 'ready' : 'pending_activation' });
});
for (const [name, config] of Object.entries(datasets)) {
  api.get(`/${name}`, async c => c.json((await c.env.DB.prepare(`SELECT * FROM ${config.table} ORDER BY id DESC`).all()).results));
  api.post(`/${name}`, async c => {
    let source: unknown;
    try { source = await c.req.json(); } catch { return c.json({ detail: 'Invalid JSON body' }, 400); }
    if (!source || typeof source !== 'object' || Array.isArray(source)) return c.json({ detail: 'Expected a JSON object' }, 422);
    const { payload, errors } = validate(config, source as Record<string, unknown>);
    if (errors.length) return c.json({ detail: errors.join('; ') }, 422);
    return c.json(await insert(c.env.DB, config, payload).first());
  });
}
for (const name of ['expenses', 'income']) api.delete(`/${name}/:id`, async c => {
  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id <= 0) return c.json({ detail: 'Invalid record ID' }, 422);
  const deleted = await c.env.DB.prepare(`DELETE FROM ${name} WHERE id = ? RETURNING id`).bind(id).first();
  if (!deleted) return c.json({ detail: name === 'expenses' ? 'Expense not found' : 'Income record not found' }, 404);
  return c.json({ ok: true });
});
api.get('/reports/dashboard', async c => {
  const results = await c.env.DB.batch<Record<string, unknown>>([
    c.env.DB.prepare('SELECT COALESCE(SUM(invoice_total),0) total_income, COALESCE(SUM(amount_received),0) amount_received FROM income'),
    c.env.DB.prepare('SELECT COALESCE(SUM(total_amount),0) total_expense FROM expenses'),
    c.env.DB.prepare('SELECT COALESCE(SUM(amount),0) advances_given FROM advances'),
    c.env.DB.prepare("SELECT COALESCE(category,'Uncategorised') category, SUM(total_amount) amount FROM expenses GROUP BY category"),
    c.env.DB.prepare("SELECT COALESCE(income_type,'Other') type, SUM(invoice_total) amount FROM income GROUP BY income_type"),
  ]);
  const total_income = Number(results[0].results[0].total_income), amount_received = Number(results[0].results[0].amount_received), total_expense = Number(results[1].results[0].total_expense);
  return c.json({ total_income, total_expense, net_profit: total_income - total_expense, amount_received, receivable: total_income - amount_received, advances_given: Number(results[2].results[0].advances_given), expense_by_category: results[3].results, income_by_type: results[4].results });
});
api.get('/reports/receivables', async c => c.json((await c.env.DB.prepare('SELECT id, invoice_no, customer, invoice_total, amount_received, invoice_total-amount_received outstanding, due_date, status FROM income WHERE invoice_total-amount_received > 0').all()).results));
api.get('/reports/issue-profitability', async c => c.json((await c.env.DB.prepare("SELECT issue,SUM(income) income,SUM(expense) expense,SUM(income)-SUM(expense) profit FROM (SELECT COALESCE(NULLIF(magazine_issue,''),'Unassigned') issue,invoice_total income,0 expense FROM income UNION ALL SELECT COALESCE(NULLIF(project_issue,''),'Unassigned') issue,0 income,total_amount expense FROM expenses) GROUP BY issue").all()).results));
api.get('/reports/reimbursements', async c => c.json((await c.env.DB.prepare("SELECT person,SUM(advance_given) advance_given,SUM(reimbursable_expense) reimbursable_expense,SUM(reimbursable_expense)-SUM(advance_given) balance FROM (SELECT person_name person,amount advance_given,0 reimbursable_expense FROM advances WHERE person_name<>'' UNION ALL SELECT paid_by person,0 advance_given,total_amount reimbursable_expense FROM expenses WHERE reimbursable='Yes' AND paid_by IS NOT NULL AND paid_by<>'') GROUP BY person ORDER BY person").all()).results));
api.get('/imports/:dataset/template', async c => {
  const name = c.req.param('dataset').toLowerCase(), config = datasets[name];
  if (!config) return c.json({ detail: 'Unknown import dataset' }, 404);
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet(name).addRow(config.columns);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="orozone_${name}_import_template.xlsx"` } });
});
api.post('/imports/:dataset', async c => {
  const name = c.req.param('dataset').toLowerCase(), config = datasets[name];
  if (!config) return c.json({ detail: 'Unknown import dataset' }, 404);
  // Bound both compressed upload size and resulting row count to fit one atomic D1 batch.
  if (Number(c.req.header('content-length') || 0) > 5 * 1024 * 1024) return c.json({ detail: 'Workbook upload limit is 5 MB' }, 413);
  let file: File | string | null;
  try { file = (await c.req.formData()).get('file'); } catch { return c.json({ detail: 'Invalid multipart upload' }, 400); }
  if (!(file instanceof File) || !/\.(xlsx|xlsm)$/i.test(file.name)) return c.json({ detail: 'Please upload an .xlsx or .xlsm Excel file' }, 400);
  if (file.size > 5 * 1024 * 1024) return c.json({ detail: 'Workbook upload limit is 5 MB' }, 413);
  let sheet: ReturnType<typeof readWorkbook>;
  try { sheet = readWorkbook(await file.arrayBuffer()); } catch (error) { return c.json({ detail: `Could not read the Excel file: ${error instanceof Error ? error.message : 'Invalid workbook'}` }, 400); }
  if (!sheet.rows.length) return c.json({ detail: 'The first worksheet is empty' }, 400);
  const headers: Record<number, string> = {};
  sheet.headers.forEach((header, index) => {
    const normalized = header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const key = config.aliases[normalized] || normalized;
    if (config.columns.includes(key)) headers[index] = key;
  });
  const statements: D1PreparedStatement[] = [], errors: { row: number; errors: string[] }[] = [];
  sheet.rows.forEach(row => {
    if (!row.cells.some(value => value !== null && value !== undefined && value !== '')) return;
    const source: Record<string, unknown> = {};
    for (const [column, key] of Object.entries(headers)) {
      source[key] = row.cells[Number(column)];
      if (sheet.date1904 && key.endsWith('_date') && typeof source[key] === 'number') source[key] = Number(source[key]) + 1462;
    }
    const result = validate(config, source, true);
    if (result.errors.length) errors.push({ row: row.row, errors: result.errors });
    else statements.push(insert(c.env.DB, config, result.payload, false));
  });
  if (errors.length) return c.json({ detail: { message: 'No rows were imported. Fix the workbook and try again.', errors: errors.slice(0, 50), error_count: errors.length } }, 422);
  if (!statements.length) return c.json({ detail: 'The first worksheet is empty' }, 400);
  await c.env.DB.batch(statements);
  return c.json({ dataset: name, file: file.name, imported: statements.length });
});
api.notFound(c => c.json({ detail: 'Not found' }, 404));
