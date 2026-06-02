import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.headers['x-shopify-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const { token, discountCode, prizeMessage } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const existing = await redis.get(`ticket:${token}`);
  if (existing) {
    const ticket = JSON.parse(existing);
    ticket.discountCode = discountCode || null;
    ticket.prizeMessage = prizeMessage || null;
    await redis.set(`ticket:${token}`, JSON.stringify(ticket));
  }

  return res.status(200).json({ success: true });
}
