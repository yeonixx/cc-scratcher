import { handleCors } from './cors.js';
import { redisGet } from './redis.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
  const token = searchParams.get('token');

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const raw = await redisGet(`ticket:${token}`);
    if (!raw) return res.status(404).json({ valid: false, error: 'Token not found' });

    const ticket = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return res.status(200).json({
      valid: true,
      used: ticket.used || false,
      slots: ticket.slots,
      winSym: ticket.winSym,
      winRow: ticket.winRow,
      orderEmail: ticket.orderEmail,
      orderName: ticket.orderName,
      discountCode: ticket.discountCode || null,
      prizeMessage: ticket.prizeMessage || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
