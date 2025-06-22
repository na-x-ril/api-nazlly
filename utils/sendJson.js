/**
 * Send JSON response with pretty-print.
 * @param {import('next').NextApiResponse} res
 * @param {number} status
 * @param {any} data
 */
export function sendJson(res, status = 200, data = {}) {
    res.status(status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data, null, 2)); // null, 2 = pretty-print
}
  