const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

async function redisCmd(...args) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export async function redisGet(key) {
  return redisCmd('GET', key);
}

export async function redisSet(key, value) {
  return redisCmd('SET', key, value);
}
