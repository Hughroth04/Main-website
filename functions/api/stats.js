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

  try {
    const groupBy = url.searchParams.get('by') || 'type';
    const days = parseInt(url.searchParams.get('days') || '30', 10);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    let query;
    if (groupBy === 'day') {
      query = `
        SELECT date, link_type, SUM(count) as total
        FROM clicks
        WHERE date >= ?
        GROUP BY date, link_type
        ORDER BY date DESC, link_type
      `;
    } else if (groupBy === 'page') {
      query = `
        SELECT link_type, page, SUM(count) as total
        FROM clicks
        WHERE date >= ?
        GROUP BY link_type, page
        ORDER BY link_type, total DESC
      `;
    } else {
      query = `
        SELECT link_type, SUM(count) as total
        FROM clicks
        WHERE date >= ?
        GROUP BY link_type
        ORDER BY total DESC
      `;
    }

    const results = await env.DB.prepare(query).bind(cutoff).all();

    const allTimeQuery = `
      SELECT link_type, SUM(count) as total
      FROM clicks
      GROUP BY link_type
      ORDER BY total DESC
    `;
    const allTime = await env.DB.prepare(allTimeQuery).all();

    return new Response(JSON.stringify({
      period: `last ${days} days`,
      cutoff,
      data: results.results,
      allTime: allTime.results,
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return new Response(JSON.stringify({ error: 'Service error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
