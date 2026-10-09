import { Hono } from 'hono';
import { api, type Bindings } from './api';
import { accessGate } from './auth';
const app = new Hono<{Bindings: Bindings & {FINANCE_PASSWORD:string;SESSION_SECRET:string;LOGIN_LIMITER:RateLimit}}>();
app.use('*', accessGate);
app.route('/api', api);
app.all('/api/*', c => c.json({detail:'Not found'},404));
app.get('*', c => c.env.ASSETS.fetch(c.req.raw));
export default app;
