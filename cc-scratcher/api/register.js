import { handleCors } from './cors.js';
import { redisSet } from './redis.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const incoming = req.headers['x-shopify-secret'];
  const expected = process.env.WEBHOOK_SECRET;

  console.log('incoming secret:', incoming);
  console.log('expected secret:', expected);
  console.log('body:', JSON.stringify(req.body));

  if (incoming !== expected) {
    return res.status(401).json({ error: 'Unauthorized', incoming, expected });
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
