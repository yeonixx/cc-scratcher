import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function generateTicket() {
  const winPool = [
    { sym: 'joker',    w: 600 },
    { sym: 'chips',    w: 300 },
    { sym: 'seven',    w: 90  },
    { sym: 'goldbars', w: 10  },
  ];
  const total = winPool.reduce((s, i) => s + i.w, 0);
  let r = Math.random() * total;
  let winSym = winPool[winPool.length - 1].sym;
  for (const item of winPool) { r -= item.w; if (r <= 0) { winSym = item.sym; break; } }

  const winRow = Math.random() < 0.5 ? 0 : 1;
  const otherRow = 1 - winRow;
  const slots = new Array(6);
  slots[winRow*3] = slots[winRow*3+1] = slots[winRow*3+2] = winSym;

  const lossSyms = ['bomb', 'dynamite'];
  const otherWins = ['chips','joker','seven','goldbars'].filter(s => s !== winSym);
  const fillerPool = [...lossSyms, ...lossSyms, ...otherWins];

  let safe = false;
  while (!safe) {
    const counts = {};
    for (let i = 0; i < 3; i++) {
      let pick, attempts = 0;
      do {
        pick = fillerPool[Math.floor(Math.random() * fillerPool.length)];
        attempts++;
      } while ((counts[pick] || 0) >= 2 && attempts < 30);
      slots[otherRow*3+i] = pick;
      counts[pick] = (counts[pick] || 0) + 1;
    }
    const allSame = slots[otherRow*3] === slots[otherRow*3+1] && slots[otherRow*3+1] === slots[otherRow*3+2];
    const hasLoss = slots.slice(otherRow*3, otherRow*3+3).some(s => lossSyms.includes(s));
    const hasWinSym = slots.slice(otherRow*3, otherRow*3+3).includes(winSym);
    if (!allSame && hasLoss && !hasWinSym) safe = true;
  }

  for (let row = 0; row < 2; row++) {
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = slots[row*3 + i];
      slots[row*3 + i] = slots[row*3 + j];
      slots[row*3 + j] = tmp;
    }
  }

  return { winSym, winRow: winRow.toString(), slots: JSON.stringify(slots) };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.headers['x-shopify-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const { token, orderEmail, orderName } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const ticket = generateTicket();

  await redis.set(`ticket:${token}`, JSON.stringify({
    ...ticket,
    orderEmail,
    orderName,
    used: false,
    createdAt: new Date().toISOString(),
  }));

  return res.status(200).json({ success: true });
}
