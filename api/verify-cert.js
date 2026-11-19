// Vercel Serverless API: /api/verify-cert
// Retired legacy endpoint. Certificate verification requires a database record
// and is handled by the rate-limited /api/auth verify_certificate action.

export default async function handler(req, res) {
  return res.status(410).json({
    success: false,
    verified: false,
    error: 'This legacy endpoint is retired. Use the Greach Impact certificate verification page.'
  });
}
