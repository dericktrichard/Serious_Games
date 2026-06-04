SGDF Analytics Server

This is a minimal Express server intended to store and serve evaluation events.
It's ready to deploy to Render as a Web Service.

Quick start (locally):

```bash
cd server
npm install
npm start
```

Render notes:
- Create a new Web Service (static site won't work; choose Web Service).
- Point the repo to this project and set the root directory to `server`.
- Build/Start command: `npm start`
- Render sets the port via `PORT` env var; the server honors `process.env.PORT`.

API:
- GET `/events` — returns JSON array of events
- POST `/events` — accept event JSON (id/ts auto-set if missing)
- DELETE `/events/:id` — remove a single event
- DELETE `/events` — clear all events

Security: this is intentionally minimal. For public deployments consider adding an API key or auth.
