import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-shopify-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.headers['x-shopify-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { token, slots, winSym, winRow, orderEmail, orderName } = req.body;
  if (!token || !slots || !winSym) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await redis.set(`ticket:${token}`, JSON.stringify({
      token,
      slots: typeof slots === 'string' ? JSON.parse(slots) : slots,
      winSym,
      winRow: parseInt(winRow) || 0,
      orderEmail,
      orderName,
      used: false,
      createdAt: new Date().toISOString(),
    }), { ex: 60 * 60 * 24 * 90 });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
