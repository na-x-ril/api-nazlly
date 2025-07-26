import { sendJson } from '../../utils/sendJson.js'
import { fetchYouTubeData } from '../../utils/parser.js';
import { getSponsorSegments } from '../../utils/sponsorblock.js';

export default async function handler(req, res) {
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