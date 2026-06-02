import { handleCors } from './_cors.js';
import { redisGet, redisSet } from './_redis.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    const raw = await redisGet(`ticket:${token}`);
    if (!raw) return res.status(404).json({ error: 'Token not found' });

    const ticket = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (ticket.used) return res.status(409).json({ error: 'Token already used' });

    ticket.used = true;
    ticket.usedAt = new Date().toISOString();
    await redisSet(`ticket:${token}`, JSON.stringify(ticket));

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
