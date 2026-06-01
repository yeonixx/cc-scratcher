import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://crookedchristian.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ valid: false, error: 'No token' });

  try {
    const raw = await redis.get(`ticket:${token}`);
    if (!raw) return res.status(200).json({ valid: false, used: false });

    const ticket = typeof raw === 'string' ? JSON.parse(raw) : raw;

    return res.status(200).json({
      valid: true,
      used: ticket.used,
      slots: ticket.slots,
      winSym: ticket.winSym,
      winRow: ticket.winRow,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
}
