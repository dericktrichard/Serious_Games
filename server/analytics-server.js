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
