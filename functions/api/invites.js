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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const results = await env.DB.prepare(`
      SELECT id, created_at, name, phone, email, reason, details, page
      FROM invite_requests
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM invite_requests
    `).first();

    return new Response(JSON.stringify({
      requests: results.results,
      total: countResult?.total || 0,
      limit,
      offset,
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Invites fetch error:', error);
    return new Response(JSON.stringify({ error: 'Service error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
