import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    const data = await redis.get(`ticket:${token}`);
    if (!data) return res.status(200).json({ valid: false, used: false });

    const ticket = typeof data === 'string' ? JSON.parse(data) : data;
    return res.status(200).json({
      valid: true,
      used: ticket.used || false,
      slots: ticket.slots,
      winSym: ticket.winSym,
      winRow: ticket.winRow,
      discountCode: ticket.discountCode || null,
      prizeMessage: ticket.prizeMessage || null,
    });
  } catch(e) {
    return res.status(500).json({ valid: false, error: e.message });
  }
}
