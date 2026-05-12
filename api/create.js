import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
    import { Redis } from '@upstash/redis';

    export default async function handler(req, res) {
  
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
  });
        
    await redis.set(`redirect:${finalAlias}`, {
          desktopUrl,
          mobileUrl,
          company
        });
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.TINYURL_TOKEN;
  if (!token) return res.status(500).json({ error: 'TINYURL_TOKEN não configurado.' });

  const { company, alias, desktopUrl, mobileUrl } = req.body;
  if (!company || !desktopUrl || !mobileUrl) {
    return res.status(400).json({ error: 'company, desktopUrl e mobileUrl são obrigatórios.' });
  }

  const slug = (alias || company)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const finalAlias = slug.endsWith('-rd') ? slug : `${slug}-rd`;

  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
  await redis.set(`redirect:${slug}`, JSON.stringify({ desktopUrl, mobileUrl, company }));

  const baseUrl = `https://${req.headers.host}`;
  const redirectPageUrl = `${baseUrl}/r/${slug}`;

  try {
    const tinyRes = await fetch('https://api.tinyurl.com/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: redirectPageUrl,
        alias: finalAlias,
        domain: 'tinyurl.com',
      }),
    });

    const tinyData = await tinyRes.json();

    if (!tinyRes.ok) {
      const msg = tinyData?.errors?.[0] || 'Erro no TinyURL';
      return res.status(400).json({ error: msg, redirectPageUrl, alias: finalAlias });
    }

    return res.status(200).json({
      shortUrl: tinyData.data?.tiny_url || `https://tinyurl.com/${finalAlias}`,
      redirectPageUrl,
      alias: finalAlias,
      stats: `https://tinyurl.com/stats/${finalAlias}`,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Falha ao chamar TinyURL', redirectPageUrl, alias: finalAlias });
  }
}
