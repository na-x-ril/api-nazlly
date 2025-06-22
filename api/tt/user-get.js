import { formatNumber, formatTime, formatRegion } from '../../utils.js';
import countries from '../../countries.js';
import { sendJson } from '../../utils/sendJson.js';

export default async function handler(req, res) {
  const { username } = req.query;
  if (!username) return sendJson(res, 400, { error: 'Username is required' });

  const startTime = Date.now();

  try {
    const url = `https://www.tiktok.com/@${username}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    };

    const response = await fetch(url, { headers });
    const html = await response.text();

    // Cari isi script __UNIVERSAL_DATA_FOR_REHYDRATION__ dengan regex
    const match = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/s);
    if (!match) {
      return sendJson(res, 404, { error: 'User data not found or script element missing' });
    }

    const jsonData = JSON.parse(match[1]);
    const userData = jsonData?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo || {};

    if (!userData.user) {
      return sendJson(res, 404, { error: 'User not found' });
    }

    const formattedData = {
      ...userData,
      user: {
        ...userData.user,
        createTime: formatTime(userData.user.createTime),
        nickNameModifyTime: formatTime(userData.user.nickNameModifyTime),
        formattedStats: {
          followerCount: formatNumber(userData.stats.followerCount),
          heartCount: formatNumber(userData.stats.heartCount),
          videoCount: formatNumber(userData.stats.videoCount),
          followingCount: formatNumber(userData.stats.followingCount),
        },
        formattedRegion: formatRegion(userData.user.region, countries),
      },
      processTime: Date.now() - startTime,
    };

    sendJson(res, 200, { msg: 'success', ...formattedData });
  } catch (error) {
    sendJson(res, 500, { msg: 'error', error: error.message });
  }
}
