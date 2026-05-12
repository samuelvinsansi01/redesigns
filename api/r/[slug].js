import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) return res.status(400).send('Slug inválido.');

  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
  const raw = await redis.get(`redirect:${slug}`);

  if (!raw) {
    return res.status(404).send(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>404</title></head>
      <body style="margin:0;display:flex;align-items:center;justify-content:center;
      min-height:100vh;background:#0e0e0e;font-family:sans-serif;color:#888;">
      <p>Link não encontrado: <strong>${slug}</strong></p></body></html>
    `);
  }

  const { desktopUrl, mobileUrl, company } = typeof raw === 'string' ? JSON.parse(raw) : raw;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${company || slug}</title>
  <style>
    body{margin:0;display:flex;align-items:center;justify-content:center;
         min-height:100vh;background:#0e0e0e;font-family:sans-serif;color:#888;}
    p{font-size:13px;letter-spacing:0.05em;}
  </style>
</head>
<body>
  <p>Redirecionando...</p>
  <script>
    (function(){
      var ua = navigator.userAgent || '';
      var w  = window.innerWidth || screen.width;
      var mobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) || w < 768;
      window.location.replace(mobile ? ${JSON.stringify(mobileUrl)} : ${JSON.stringify(desktopUrl)});
    })();
  </script>
</body>
</html>`);
}
