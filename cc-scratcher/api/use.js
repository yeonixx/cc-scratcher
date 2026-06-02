import { createClient } from '@upstash/redis';
import { handleCors } from './_cors.js';

const redis = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // Handle CORS preflight (fixes 405 on OPTIONS)
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const raw = await redis.get(`ticket:${token}`);

    if (!raw) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const ticket = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (ticket.used) {
      return res.status(409).json({ error: 'Token already used' });
    }

    ticket.used = true;
    ticket.usedAt = new Date().toISOString();

    await redis.set(`ticket:${token}`, JSON.stringify(ticket));

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Redis error:', err);
    return res.status(500).json({ error: 'Failed to mark token as used' });
  }
}
