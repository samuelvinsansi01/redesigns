import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).send('Slug inválido.');
  }

  const data = await redis.get(`redirect:${slug}`);

  if (!data) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>404</title></head>
      <body style="margin:0;display:flex;align-items:center;justify-content:center;
      min-height:100vh;background:#0e0e0e;font-family:sans-serif;color:#888;">
        <p>Link não encontrado: <strong>${slug}</strong></p>
      </body>
      </html>
    `);
  }

  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  const { desktopUrl, mobileUrl, company } = parsed;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${company || slug}</title>
</head>
<body>
  <p>Redirecionando...</p>

  <script>
    const mobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;

    window.location.replace(mobile ? "${mobileUrl}" : "${desktopUrl}");
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
