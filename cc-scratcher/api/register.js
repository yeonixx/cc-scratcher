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

  // Verify webhook secret
  const secret = req.headers['x-shopify-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { token, slots, winSym, winRow, orderEmail, orderName } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    await redis.set(`ticket:${token}`, JSON.stringify({
      token,
      slots,
      winSym,
      winRow,
      orderEmail,
      orderName,
      used: false,
      createdAt: new Date().toISOString(),
    }));

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Redis error:', err);
    return res.status(500).json({ error: 'Failed to register ticket' });
  }
}
