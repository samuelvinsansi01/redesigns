// api/shorten.js — Vercel Serverless Function
// Uses TinyURL API v2 with Bearer token (set TINYURL_TOKEN in Vercel env vars)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.TINYURL_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TINYURL_TOKEN not configured in environment variables.' });
  }

  const { url, alias } = req.body;
  if (!url || !alias) return res.status(400).json({ error: 'url and alias are required' });

  // Sanitize alias
  const safeAlias = alias
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const finalAlias = safeAlias.endsWith('-rd') ? safeAlias : `${safeAlias}-rd`;

  try {
    // TinyURL API v2 — authenticated endpoint supports custom alias + update
    const response = await fetch('https://api.tinyurl.com/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        url,
        alias: finalAlias,
        domain: 'tinyurl.com',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // API v2 returns { errors: [...] } on failure
      const msg = data?.errors?.[0] || data?.message || 'TinyURL API error';
      return res.status(400).json({ error: msg, alias: finalAlias });
    }

    return res.status(200).json({
      shortUrl: data.data?.tiny_url || `https://tinyurl.com/${finalAlias}`,
      alias: finalAlias,
      stats: `https://tinyurl.com/stats/${finalAlias}`,
    });

  } catch (err) {
    console.error('TinyURL fetch error:', err);
    return res.status(500).json({ error: 'Failed to reach TinyURL API' });
  }
}
