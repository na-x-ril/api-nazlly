import { getDesktopUrl, formatNumber, formatTime } from '../../utils.js';
import { sendJson } from '../../utils/sendJson.js';
import * as fuzzball from 'fuzzball';

export default async function handler(req, res) {
  const { url, text, days, unique_id, fuzzy } = req.query;
  if (!url) return sendJson(res, 400, { error: 'Video URL is required' });

  try {
    const finalUrl = await getDesktopUrl(url);

    const videoResponse = await fetch(
      `https://www.tikwm.com/api/?url=${encodeURIComponent(finalUrl)}&hd=1`
    );
    const videoData = await videoResponse.json();

    if (!videoData.data) {
      return sendJson(res, 404, { error: 'Video not found' });
    }

    const authorId = videoData.data.author?.id || null;
    const authorUniqueId = videoData.data.author?.unique_id || null;

    const apiUrl = `https://www.tikwm.com/api/comment/list?url=${encodeURIComponent(finalUrl)}`;
    const response = await fetch(apiUrl, { timeout: 10000 });
    const data = await response.json();
    let comments = data.data.comments;

    if (!comments?.length) {
      return sendJson(res, 404, { error: 'No comments found for this video' });
    }

    // Text + fuzzy filter
    if (text) {
      comments = comments.filter(comment => {
        const content = comment.text.toLowerCase();
        const target = text.toLowerCase();
        if (fuzzy === 'true') {
          const score = fuzzball.partial_ratio(content, target);
          return score >= 70;
        } else {
          return content.includes(target);
        }
      });
    }

    // Days filter
    if (days) {
      const daysAgo = Date.now() - parseInt(days) * 24 * 60 * 60 * 1000;
      comments = comments.filter(c => c.create_time * 1000 >= daysAgo);
    }

    // unique_id filter
    if (unique_id) {
      comments = comments.filter(c => 
        c.user?.unique_id?.toLowerCase() === unique_id.toLowerCase()
      );
    }

    // Format
    const formattedComments = comments.map(comment => ({
      ...comment,
      formatted: {
        create_time: formatTime(comment.create_time),
        digg_count: formatNumber(comment.digg_count || 0),
      },
    }));

    sendJson(res, 200, {
      data: {
        comments: formattedComments,
        video_author_id: authorId,
        video_author_unique_id: authorUniqueId,
      },
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}
