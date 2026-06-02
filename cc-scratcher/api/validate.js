import { createClient } from '@upstash/redis';
import { handleCors } from './_cors.js';

const redis = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // Handle CORS preflight (fixes 405 on OPTIONS)
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use WHATWG URL API instead of deprecated url.parse()
  const baseUrl = `https://${req.headers.host}`;
  const { searchParams } = new URL(req.url, baseUrl);
  const token = searchParams.get('token');

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const raw = await redis.get(`ticket:${token}`);

    if (!raw) {
      return res.status(404).json({ valid: false, error: 'Token not found' });
    }

    const ticket = typeof raw === 'string' ? JSON.parse(raw) : raw;

    return res.status(200).json({
      valid: true,
      used: ticket.used || false,
      slots: ticket.slots,
      winSym: ticket.winSym,
      winRow: ticket.winRow,
      orderEmail: ticket.orderEmail,
      orderName: ticket.orderName,
    });
  } catch (err) {
    console.error('Redis error:', err);
    return res.status(500).json({ error: 'Failed to validate token' });
  }
}
