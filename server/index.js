const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const PORT = process.env.PORT || 3030;
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'events.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch { return []; }
}
function save(arr) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

const app = express();
app.use(cors());
app.use(express.json());

// Simple request logger to help Render/diagnostics
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// Root page — helpful when opening the service in a browser
app.get('/', (req, res) => {
  res.type('html').send(`
    <html><head><title>SGDF Analytics</title></head><body style="font-family:system-ui,Segoe UI,Helvetica,Arial;max-width:720px;margin:40px">
      <h2>SGDF Analytics server</h2>
      <p>Endpoints:</p>
      <ul>
        <li><a href="/health">/health</a> — health check (JSON)</li>
        <li><a href="/events">/events</a> — list stored events (JSON)</li>
      </ul>
      <p>Use <code>POST /events</code> to send evaluations.</p>
    </body></html>
  `);
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Get events
app.get('/events', (req, res) => {
  const events = load();
  res.json(events);
});

// Post event
app.post('/events', (req, res) => {
  const body = req.body || {};
  const events = load();
  const entry = Object.assign({}, body);
  if (!entry.id) entry.id = Date.now();
  if (!entry.ts) entry.ts = new Date().toISOString();
  events.push(entry);
  save(events);
  res.status(201).json(entry);
});

// Delete single
app.delete('/events/:id', (req, res) => {
  const id = Number(req.params.id);
  const events = load().filter(e => e.id !== id);
  save(events);
  res.json({ ok: true });
});

// Clear all
app.delete('/events', (req, res) => {
  save([]);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Analytics server listening on port ${PORT}`));
