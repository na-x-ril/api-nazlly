import { getDesktopUrl } from '../../utils.js';
import { sendJson } from '../../utils/sendJson.js';

function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '_');
}

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return sendJson(res, 400, { error: 'Parameter url is required'});

  try {
    const finalUrl = await getDesktopUrl(url);
    const apiUrl = `https://www.tikwm.com/api/music/info?url=${finalUrl}`;
    const response = await fetch(apiUrl, { timeout: 10000 });
    const data = await response.json();

    if (!data.data) {
      return sendJson(res, 404, { error: 'Audio not found' });
    }

    const audioId = data.data.id || 'unknown';
    let audioTitle = data.data.title || 'unknown';
    audioTitle = audioTitle.replace(/^original sound - /, '');
    audioTitle = sanitizeFilename(audioTitle);

    const filename = `${audioTitle}-${audioId}.mp3`;
    const audioUrl = data.data.play;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    const audioResponse = await fetch(audioUrl);

    // ⚙️ stream dengan pipeline yang benar
    const { Readable } = await import('node:stream');
    const { pipeline } = await import('node:stream/promises');
    const nodeReadable = Readable.fromWeb(audioResponse.body);
    await pipeline(nodeReadable, res);

  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error.message });
  }
}
