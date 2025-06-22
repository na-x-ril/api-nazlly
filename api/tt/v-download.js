import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import { getDesktopUrl } from '../../utils.js';
import { sendJson } from '../../utils/sendJson.js';

const streamPipeline = promisify(pipeline);

export default async function handler(req, res) {
  const { url, quality } = req.query;
  if (!url) return sendJson(res, 400, { error: 'Video URL is required' });

  try {
    const finalUrl = await getDesktopUrl(url);
    const tiktokApiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(finalUrl)}&hd=1`;

    const response = await fetch(tiktokApiUrl);
    const data = await response.json();

    if (!data.data) return sendJson(res, 404, { error: 'Video not found' });

    const username = data.data.author?.unique_id || 'unknown';
    const videoID = data.data.id || 'unknown';
    const filename = `TikTok_${username}_${videoID}.mp4`;

    const videoUrl = quality === 'hd' ? data.data.hdplay : data.data.play;
    const videoResponse = await fetch(videoUrl);

    if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');

    // ✅ CONVERT Web Stream -> Node.js Readable
    const nodeReadable = Readable.fromWeb(videoResponse.body);

    // ✅ Stream it to Next.js response safely
    await streamPipeline(nodeReadable, res);

  } catch (error) {
    console.error(error); // selalu log dulu untuk debug
    sendJson(res, 500, { error: error.message });
  }
}
