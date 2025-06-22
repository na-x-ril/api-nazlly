import { formatNumber, formatTime, formatRegion, shortenUrl } from '../../utils.js';
import countries from '../../countries.js';
import { sendJson } from '../../utils/sendJson.js';

export default async function handler(req, res) {
  const { username } = req.query;
  if (!username) return sendJson(res, 400, { error: 'Username is required' });

  try {
    const apiUrl = `https://www.tikwm.com/api/user/favorite?unique_id=${encodeURIComponent(username)}`;
    const response = await fetch(apiUrl, { timeout: 10000 });
    const data = await response.json();

    if (!data?.data?.videos?.length) {
      return sendJson(res, 404, { error: 'No favorite videos found for this user' });
    }

    const videos = await Promise.all(
      data.data.videos.map(async (video) => {
        const shortenedPlay = await shortenUrl(video.play);
        return {
          ...video,
          shortened_play: shortenedPlay,
          formatted: {
            play_count: formatNumber(video.play_count),
            digg_count: formatNumber(video.digg_count),
            comment_count: formatNumber(video.comment_count),
            share_count: formatNumber(video.share_count),
            collect_count: formatNumber(video.collect_count || 0),
            create_time: formatTime(video.create_time),
            region: formatRegion(video.region, countries)
          },
        };
      })
    );

    const formattedData = {
      ...data,
      data: {
        ...data.data,
        videos,
      },
    };

    sendJson(res, 200, formattedData);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}
