#!/usr/bin/env node
// Submit all URLs from the production sitemap to IndexNow.
// Run after deploys: `node scripts/indexnow-ping.mjs`

const HOST = 'calculatudinero.net';
const KEY = '4cd7bac4361e7326c29644fbc078b660';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_URL = `https://${HOST}/sitemap-0.xml`;
const ENDPOINTS = [
  'https://api.indexnow.org/IndexNow',
  'https://www.bing.com/indexnow',
];
const BATCH_SIZE = 10000;

async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error(`Sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function submitBatch(endpoint, urls) {
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 200) };
}

const urls = await fetchSitemapUrls();
console.log(`Loaded ${urls.length} URLs from ${SITEMAP_URL}`);

for (const endpoint of ENDPOINTS) {
  console.log(`\n→ ${endpoint}`);
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const result = await submitBatch(endpoint, batch);
    const ok = result.status >= 200 && result.status < 300;
    console.log(
      `  batch ${i / BATCH_SIZE + 1} (${batch.length} urls) → HTTP ${result.status} ${ok ? 'OK' : ''}`,
    );
    if (!ok) console.log(`  body: ${result.body}`);
  }
}

console.log('\nDone.');
