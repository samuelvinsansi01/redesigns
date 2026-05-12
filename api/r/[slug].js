import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  const { slug } = req.query;

  const data = await redis.get(`redirect:${slug}`);

  if (!data) {
    return res.status(404).send(`
      <h1>Link não encontrado: ${slug}</h1>
    `);
  }

  const { desktopUrl, mobileUrl, company } =
    typeof data === 'string' ? JSON.parse(data) : data;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  return res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${company || slug}</title>
</head>
<body>
<script>
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
    || window.innerWidth < 768;

  window.location.replace(isMobile
    ? "${mobileUrl}"
    : "${desktopUrl}");
</script>
</body>
</html>`);
}
