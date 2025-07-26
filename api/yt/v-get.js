import { sendJson } from '../../utils/sendJson.js'
import { fetchYouTubeData } from '../../utils/parser.js';
import { getSponsorSegments } from '../../utils/sponsorblock.js';

export default async function handler(req, res) {
  const { videoUrl } = req.query;

  if (!videoUrl) return res.status(400).json({ error: 'Missing videoUrl' });

  try {
    const data = await fetchYouTubeData(videoUrl);
    const sponsorSegments = await getSponsorSegments(videoUrl);

    sendJson( res, 200, {
      videoUrl,
      ...data,
      sponsorSegments
    })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch or parse data' });
  }
}