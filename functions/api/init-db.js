function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const maxLen = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const aChar = i < a.length ? a.charCodeAt(i) : 0;
    const bChar = i < b.length ? b.charCodeAt(i) : 0;
    result |= aChar ^ bChar;
  }
  return result === 0;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.STATS_TOKEN) {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';

  if (!timingSafeEqual(token, env.STATS_TOKEN)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS clicks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link_type TEXT NOT NULL,
        page TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        UNIQUE(link_type, page, date)
      )
    `).run();

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_clicks_date ON clicks(date)
    `).run();

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_clicks_type ON clicks(link_type)
    `).run();

    return new Response(JSON.stringify({ ok: true, message: 'Database initialized' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Init error:', error);
    return new Response(JSON.stringify({ error: 'Service error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
