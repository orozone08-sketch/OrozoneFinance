import type { MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';

type AuthBindings = { FINANCE_PASSWORD: string; SESSION_SECRET: string; LOGIN_LIMITER: RateLimit };
const login = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>OROZONE Finance — Sign in</title><style>body{background:#f4f6fa;color:#18243a;font:16px system-ui;display:grid;place-items:center;min-height:95vh}main{background:white;padding:40px;border-radius:18px;width:min(360px,80vw);box-shadow:0 10px 40px #18243a15}input,button{box-sizing:border-box;width:100%;padding:14px;margin-top:12px;border:1px solid #ccd3df;border-radius:8px}button{background:#17243b;color:white;cursor:pointer}p{color:#526178}</style></head><body><main><h1>OROZONE Finance</h1><p>Sign in to your finance desk.</p><form method="post" action="/auth/login"><label for="password">Access password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button>Sign in</button></form></main></body></html>`;
export const accessGate: MiddlewareHandler<{ Bindings: AuthBindings }> = async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'same-origin');
  if (c.req.path === '/api/health') return next();
  if (!c.env.FINANCE_PASSWORD || !c.env.SESSION_SECRET) return c.text('Access is not configured.', 503);
  const secure = new URL(c.req.url).protocol === 'https:';
  if (['POST','PUT','DELETE','PATCH'].includes(c.req.method)) {
    const origin = c.req.header('Origin');
    if (origin && origin !== new URL(c.req.url).origin) return c.text('Invalid origin', 403);
  }
  if (c.req.path === '/auth/login' && c.req.method === 'POST') {
    if (c.env.LOGIN_LIMITER && !(await c.env.LOGIN_LIMITER.limit({ key: c.req.header('CF-Connecting-IP') || 'local' })).success) return c.text('Too many attempts. Try again in a minute.', 429);
    const form = await c.req.parseBody();
    const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
    const a = await digest(String(form.password || '')); const b = await digest(c.env.FINANCE_PASSWORD);
    let mismatch = 0; for (let i=0;i<a.length;i++) mismatch |= a[i]^b[i];
    if (mismatch) return c.html(login.replace('Sign in to your finance desk.', 'Incorrect password. Please try again.'), 401);
    const token = await sign({ sub: 'finance', exp: Math.floor(Date.now()/1000)+28800 }, c.env.SESSION_SECRET, 'HS256');
    setCookie(c, 'finance_session', token, { httpOnly:true, secure, sameSite:'Strict', path:'/', maxAge:28800 });
    return c.redirect('/');
  }
  if (c.req.path === '/auth/logout' && c.req.method === 'POST') { deleteCookie(c, 'finance_session', {path:'/'}); return c.redirect('/'); }
  try { const token = getCookie(c,'finance_session'); if (!token) throw new Error(); const claims = await verify(token,c.env.SESSION_SECRET,'HS256'); if (claims.sub !== 'finance') throw new Error(); }
  catch { return c.req.path.startsWith('/api/') ? c.json({detail:'Sign in required'},401) : c.html(login); }
  return next();
};
