// api/yt/v-get.js
import { fetchYouTubeData } from '../../utils/parser.js';

export default async function handler(req, res) {
  // 1️⃣  CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2️⃣  Handle pre-flight
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 3️⃣  Pull data from the **request body**
  const { videoId, cookie, userAgent, acceptLanguage } = req.body;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  // 4️⃣  Forward cookies & UA to YouTube
  const apiHeaders = {
    cookie,
    'user-agent': userAgent,
    'accept-language': acceptLanguage
  };

  try {
    const ytData = await fetchYouTubeData(videoId, apiHeaders);

    // 5️⃣  Return clean JSON
    res.status(200).json({
      videoId,
      ...ytData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch or parse data' });
  }
}