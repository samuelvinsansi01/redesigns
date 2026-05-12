// api/create.js
// Salva o redirect no Upstash Redis e encurta via TinyURL

import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
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

  // Sanitiza o slug
  const slug = (alias || company)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const finalAlias = slug.endsWith('-rd') ? slug : `${slug}-rd`;

  // Salva no Upstash Redis: chave = slug, valor = { desktopUrl, mobileUrl }
  const redis = Redis.fromEnv();
  await redis.set(`redirect:${slug}`, JSON.stringify({ desktopUrl, mobileUrl, company }));

  // URL da página de redirect deste cliente
  const baseUrl = `https://${req.headers.host}`;
  const redirectPageUrl = `${baseUrl}/r/${slug}`;

  // Encurta via TinyURL API v2
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
