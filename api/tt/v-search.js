import { formatNumber, formatTime, shortenUrl } from '../../utils.js';
import { sendJson } from '../../utils/sendJson.js';

export default async function handler(req, res) {
  const { keywords, unique_id, days, cursor = 0, count = 30 } = req.query;

  if (!keywords) {
    return sendJson(res, 400, { error: 'Parameter "keywords" is required' });
  }

  try {
    // 1️⃣ Panggil Tikwm API
    const tiktokApiUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(
      keywords
    )}&cursor=${cursor}&count=${count}`;
    const response = await fetch(tiktokApiUrl);
    const data = await response.json();

    if (!data.data || !data.data.videos) {
      return sendJson(res, 404, { error: 'No videos found' });
    }

    // 2️⃣ Filter unique_id (jika ada)
    let videos = data.data.videos;
    if (unique_id) {
      videos = videos.filter(
        (video) =>
          video.author?.unique_id?.toLowerCase() === unique_id.toLowerCase()
      );
    }

    // 3️⃣ Filter days (jika ada)
    if (days) {
      const now = Math.floor(Date.now() / 1000); // detik
      const daysAgo = now - days * 24 * 60 * 60;
      videos = videos.filter((video) => video.create_time >= daysAgo);
    }

    // 4️⃣ Format & shorten
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
            collect_count: formatNumber(video.collect_count || 0),
            create_time: formatTime(video.create_time),
          },
        };
      })
    );

    // 5️⃣ Build response final
    const formattedData = {
      ...data,
      data: {
        ...data.data,
        videos: formattedVideos,
      },
    };

    return sendJson(res, 200, formattedData);

  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message });
  }
}
