import { sendJson } from '../../utils/sendJson.js'
import { fetchYouTubeData } from '../../utils/parser.js';
import { getSponsorSegments } from '../../utils/sponsorblock.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');   // or 'chrome-extension://YOUR_ID'

  // 2️⃣  Handle pre-flight OPTIONS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  
  const { videoId } = req.query;

  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  try {
    const data = await fetchYouTubeData(videoId);
    const sponsorSegments = await getSponsorSegments(videoId);

    sendJson( res, 200, {
      videoId,
      ...data,
      sponsorSegments
    })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch or parse data' });
  }
}