const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.SHEET_ID || '1mau9UHauEc8T02kXYvkY34s9fMEakZEsiJj_ox8GmxA';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
const FALLBACK_CSV_PATH = path.join(__dirname, 'fallback-data.csv');

let cachedData = null;
let lastFetchedAt = null;
let dataSource = 'fallback';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(csvText) {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 4) continue;

    const rank = parseInt(cols[0].replace(/[^0-9]/g, ''), 10) || i;
    const alliance = cols[1] || 'None';
    const commander = cols[2] || `Commander #${rank}`;
    const power = parseInt(cols[3].replace(/[^0-9]/g, ''), 10) || 0;

    if (power > 0) {
      rows.push({ rank, alliance, commander, power });
    }
  }

  rows.sort((a, b) => a.rank - b.rank);
  return rows;
}

async function fetchSheetData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedData && lastFetchedAt && now - lastFetchedAt < 60_000) {
    return { rows: cachedData, lastFetchedAt: new Date(lastFetchedAt).toISOString(), source: dataSource, sheetId: SHEET_ID };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(SHEET_CSV_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'HeroPowerDashboard/1.0' }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const parsed = parseCSV(csvText);
    if (parsed.length > 0) {
      cachedData = parsed;
      lastFetchedAt = Date.now();
      dataSource = 'live_google_sheets';
      return { rows: cachedData, lastFetchedAt: new Date(lastFetchedAt).toISOString(), source: dataSource, sheetId: SHEET_ID };
    }
  } catch (err) {
    // Fallback to local snapshot if offline or sandboxed
  }

  if (!cachedData && fs.existsSync(FALLBACK_CSV_PATH)) {
    const fallbackText = fs.readFileSync(FALLBACK_CSV_PATH, 'utf-8');
    cachedData = parseCSV(fallbackText);
    lastFetchedAt = Date.now();
    dataSource = 'cached_snapshot';
  }

  return {
    rows: cachedData || [],
    lastFetchedAt: lastFetchedAt ? new Date(lastFetchedAt).toISOString() : new Date().toISOString(),
    source: dataSource,
    sheetId: SHEET_ID
  };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/data') {
    const force = url.searchParams.get('refresh') === '1';
    const payload = await fetchSheetData(force);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(payload));
    return;
  }

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(__dirname, 'public', safePath);

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(fullPath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hero Power Dashboard running on http://localhost:${PORT}`);
});
