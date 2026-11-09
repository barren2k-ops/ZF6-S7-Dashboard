const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.SHEET_ID || '1mau9UHauEc8T02kXYvkY34s9fMEakZEsiJj_ox8GmxA';

const SHEETS_CONFIG = [
  { name: '67', gid: '0', label: 'Server #67' },
  { name: '147', gid: '1783643295', label: 'Server #147' },
  { name: '90', gid: '196689253', label: 'Server #90' },
  { name: '47', gid: '417842398', label: 'Server #47' },
  { name: '93', gid: '101118497', label: 'Server #93' },
  { name: '85', gid: '388516268', label: 'Server #85' },
  { name: '162', gid: '201471556', label: 'Server #162' },
  { name: '5', gid: '55505', label: 'Server #5' }
];

const DATA_DIR = path.join(__dirname, 'data');

let cachedPayload = null;
let lastFetchedAt = null;
let dataSource = 'cached_snapshot';

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

function parseCSV(csvText, sheetName) {
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

    const sheetRank = parseInt(cols[0].replace(/[^0-9]/g, ''), 10) || i;
    const alliance = cols[1] || 'None';
    const commander = cols[2] || `Commander #${sheetRank}`;
    const power = parseInt(cols[3].replace(/[^0-9]/g, ''), 10) || 0;

    if (power > 0) {
      rows.push({
        rank: sheetRank,
        sheetRank,
        sheet: sheetName,
        alliance,
        commander,
        power
      });
    }
  }

  rows.sort((a, b) => a.sheetRank - b.sheetRank);
  return rows;
}

async function fetchSingleSheet(sheetCfg) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${sheetCfg.gid}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'HeroPowerDashboard/2.0' }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const csvText = await res.text();
      const parsed = parseCSV(csvText, sheetCfg.name);
      if (parsed.length > 0) {
        return { rows: parsed, live: true };
      }
    }
  } catch (err) {
    // Fallback to local snapshot file
  }

  const fallbackPath = path.join(DATA_DIR, `sheet_${sheetCfg.name}.csv`);
  if (fs.existsSync(fallbackPath)) {
    const text = fs.readFileSync(fallbackPath, 'utf-8');
    return { rows: parseCSV(text, sheetCfg.name), live: false };
  }

  return { rows: [], live: false };
}

async function fetchAllSheetsData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedPayload && lastFetchedAt && now - lastFetchedAt < 90_000) {
    return cachedPayload;
  }

  const results = await Promise.all(SHEETS_CONFIG.map(cfg => fetchSingleSheet(cfg)));
  const sheets = {};
  let anyLive = false;

  SHEETS_CONFIG.forEach((cfg, idx) => {
    sheets[cfg.name] = results[idx].rows;
    if (results[idx].live) anyLive = true;
  });

  lastFetchedAt = Date.now();
  dataSource = anyLive ? 'live_google_sheets' : 'cached_snapshot';

  cachedPayload = {
    sheetsMeta: SHEETS_CONFIG,
    sheets,
    lastFetchedAt: new Date(lastFetchedAt).toISOString(),
    source: dataSource,
    sheetId: SHEET_ID
  };

  return cachedPayload;
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
    const payload = await fetchAllSheetsData(force);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(payload));
    return;
  }

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', sheets: SHEETS_CONFIG.length }));
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
  console.log(`Hero Power 8-Sheet Dashboard running on http://localhost:${PORT}`);
});
