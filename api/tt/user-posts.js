import { formatNumber, formatTime, shortenUrl } from '../../utils.js';
import { sendJson } from '../../utils/sendJson.js';

export default async function handler(req, res) {
  const { username, days } = req.query;
  if (!username) return sendJson(res, 400, { error: 'Username is required' });

  try {
    // Ambil data user dari API tikwm
    const userInfoUrl = `https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`;
    const userInfoResponse = await fetch(userInfoUrl);
    const userInfoData = await userInfoResponse.json();
    const userStats = userInfoData?.data?.stats;
    if (!userStats) {
      return sendJson(res, 404, { error: 'User not found' });
    }

    const apiUrl = `https://www.tikwm.com/api/user/posts?unique_id=${encodeURIComponent(username)}`;
    const response = await fetch(apiUrl, { timeout: 10000 });
    const data = await response.json();
    let videos = data.data.videos;

    if (!videos?.length) {
      return sendJson(res, 404, { error: 'No videos found for this user' });
    }

    // 👉 Tambahkan filter `days` jika ada
    if (days) {
      const now = Math.floor(Date.now() / 1000); // detik
      const daysInSeconds = parseInt(days) * 24 * 60 * 60;
      videos = videos.filter(video => (now - video.create_time) <= daysInSeconds);
    }

    const formattedVideos = await Promise.all(
      videos.map(async (video) => {
        const shortened_play = await shortenUrl(video.play);
        return {
          ...video,
          shortened_play,
          formatted: {
            play_count: formatNumber(video.play_count || 0),
            digg_count: formatNumber(video.digg_count || 0),
            comment_count: formatNumber(video.comment_count || 0),
            share_count: formatNumber(video.share_count || 0),
            download_count: formatNumber(video.download_count || 0),
            collect_count: formatNumber(video.collect_count || 0),
            create_time: formatTime(video.create_time),
          },
        };
      })
    );

    const formattedUserStats = {
      aweme_count: formatNumber(userStats.aweme_count || 0),
      following_count: formatNumber(userStats.following_count || 0),
      follower_count: formatNumber(userStats.follower_count || 0),
      favoriting_count: formatNumber(userStats.digg_count || 0),
      total_favorited: formatNumber(userStats.heart_count || 0),
    };

    sendJson(res, 200, {
      data: {
        videos: formattedVideos,
        user_stats: formattedUserStats,
      },
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}
