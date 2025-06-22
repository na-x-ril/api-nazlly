import { getDesktopUrl, formatDuration, formatNumber } from '../../utils.js';
import { sendJson } from '../../utils/sendJson.js';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return sendJson(res, 400, { error: 'Audio URL is required' });

  try {
    const finalUrl = await getDesktopUrl(url);
    const apiUrl = `https://www.tikwm.com/api/music/info?url=${encodeURIComponent(finalUrl)}`;
    const response = await fetch(apiUrl, { timeout: 10000 });
    const data = await response.json();

    if (!data.data) {
      return sendJson(res, 404, { error: 'Audio not found' });
    }

    const formattedData = {
      ...data,
      data: {
        ...data.data,
        formatted: {
          duration: formatDuration(data.data.duration),
          video_count: formatNumber(data.data.video_count),
        },
      },
    };

    return sendJson(res, 200, formattedData);

  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message });
  }
}
