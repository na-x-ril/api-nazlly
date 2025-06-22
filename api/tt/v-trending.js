import { formatNumber, formatTime, shortenUrl } from '../../utils.js';
import countries from '../../countries.js';
import { sendJson } from '../../utils/sendJson.js';

export default async function handler(req, res) {
  const { region, days } = req.query;

  if (!region) {
    return sendJson(res, 400, { error: 'Parameter "region" is required' });
  }

  try {
    // 1️⃣ Cari region code dari nama
    const regionData = countries.find(
      (c) => c.name.toLowerCase() === region.toLowerCase()
    );
    if (!regionData) {
      return sendJson(res, 404, { error: 'Region not found' });
    }

    // 2️⃣ Panggil trending feed by region
    const apiUrl = `https://www.tikwm.com/api/feed/list?region=${regionData.id.toLowerCase()}`;
    const response = await fetch(apiUrl, { timeout: 10000 });
    const data = await response.json();

    if (!data?.data?.length) {
      return sendJson(res, 404, { error: 'No trending videos found from this region' });
    }

    // 3️⃣ Filter by days jika ada
    let videos = data.data;
    if (days) {
      const now = Math.floor(Date.now() / 1000);
      const daysAgo = now - days * 24 * 60 * 60;
      videos = videos.filter((video) => video.create_time >= daysAgo);
    }

    // 4️⃣ Format + shorten
    const formattedVideos = await Promise.all(
      videos.map(async (video) => {
        const shortenedPlay = await shortenUrl(video.play);
        return {
          ...video,
          shortened_play: shortenedPlay,
          formatted: {
            play_count: formatNumber(video.play_count),
            digg_count: formatNumber(video.digg_count),
            comment_count: formatNumber(video.comment_count),
            create_time: formatTime(video.create_time),
          },
        };
      })
    );

    // 5️⃣ Build response final
    const formattedData = {
      data: {
        region: regionData.name,
        videos: formattedVideos,
      },
    };

    return sendJson(res, 200, formattedData);

  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message });
  }
}
