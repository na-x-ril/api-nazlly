import { request } from 'undici';

export async function getSponsorSegments(videoId) {
  const response = await request(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}`);
  
  if (response.statusCode !== 200) return [];

  const contentType = response.headers['content-type'] || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) return [];

  const data = await response.body.json();
  return Array.isArray(data) ? data : [];
}
