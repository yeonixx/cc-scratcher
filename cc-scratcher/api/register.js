import { handleCors } from './cors.js';
import { redisSet } from './redis.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.headers['x-shopify-secret'] !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { token, slots, winSym, winRow, orderEmail, orderName, discountCode, prizeMessage } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    await redisSet(`ticket:${token}`, JSON.stringify({
      token, slots, winSym, winRow, orderEmail, orderName,
      discountCode: discountCode || null,
      prizeMessage: prizeMessage || null,
      used: false,
      createdAt: new Date().toISOString(),
    }));
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
