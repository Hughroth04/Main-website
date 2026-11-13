export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  const expectedToken = env.STATS_TOKEN || 'hughroth-stats-2024';

  if (token !== expectedToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
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
    return new Response(JSON.stringify({ error: 'Init failed', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
