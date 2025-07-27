import https from 'https-localhost';
import { parse } from 'url';
import handler from './api/yt/v-get.js';   // adjust path to your handler

const server = https();
server.all('*', async (req, res) => {
  // Vercel-style query parsing
  const { pathname, query } = parse(req.url, true);
  req.query = query;
  await handler(req, res);
});

server.listen(3001, () =>
  console.log('HTTPS dev server ready: https://localhost:3001')
);