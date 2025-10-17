const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname))); // serve index.html
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Simple in-memory rate limiter (per IP)
const rateMap = new Map();
const RATE_WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

function checkRate(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count += 1;
  }
  rateMap.set(ip, entry);
  return entry.count <= MAX_PER_WINDOW;
}

app.get('/search', async (req, res) => {
  try {
    const ip =
      req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!checkRate(ip))
      return res.status(429).json({ error: 'Too many requests. Slow down.' });

    const q = (req.query.q || '').toString().trim();
    if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

    const safeInput = (req.query.safe || 'moderate').toString().toLowerCase();
    const safeMap = { strict: 'strict', moderate: 'moderate', off: 'off' };
    const safe = safeMap[safeInput] || 'moderate';

    // Use the adlt parameter instead of safeSearch — this actually works
    const encoded = encodeURIComponent(q);
    const url = `https://www.bing.com/images/search?q=${encoded}&adlt=${safe}`;

    console.log(`[SEARCH] q="${q}" safe="${safe}" from=${ip}`);

    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = await resp.text();
    const $ = cheerio.load(html);

    const results = [];

    $('a.iusc').each((i, el) => {
      const m = $(el).attr('m');
      if (!m) return;
      try {
        const meta = JSON.parse(m);
        results.push({
          src: meta.murl || null,
          thumb: meta.turl || meta.murl || null,
          page: meta.purl || null,
          title: meta.pt || meta.s || null,
        });
      } catch (e) {
        // ignore bad JSON
      }
    });

    // fallback: parse img tags if no JSON found
    if (results.length === 0) {
      $('img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !src.startsWith('data:'))
          results.push({ src, thumb: src, page: null, title: null });
      });
    }

    // dedupe + limit
    const seen = new Set();
    const out = [];
    for (const r of results) {
      if (!r.src) continue;
      if (seen.has(r.src)) continue;
      seen.add(r.src);
      out.push(r);
      if (out.length >= 60) break;
    }

    console.log(`[RESULTS] q="${q}" got=${out.length}`);
    res.json({ query: q, safe, count: out.length, results: out });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

app.listen(PORT, () => {
  console.log(`Black Hole server running on http://localhost:${PORT}`);
});
