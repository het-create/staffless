# STAFFLESS
### the agency with nobody in it

Originally built for **India's First Public Agentic AI Hackathon** — Theme:
*Human-Less Company*. Now set up so it can also be run as a real tool for a
digital marketing agency (license it out, or run it as a service).

STAFFLESS is a fully autonomous marketing & content agency. There is no human
staff: a **CEO agent** reads the client's brief, breaks it into work orders,
and delegates to five **employee agents**, each a specialist with its own
persona. A **QA agent** reviews the work before the CEO compiles everything
into one client-ready campaign package. The whole run is streamed live to a
dashboard so you can watch the "office" work in real time.

## The org chart

| Agent | Role | Job |
|---|---|---|
| **Ada** | CEO Agent | Reads the brief, writes work orders, resolves conflicts, compiles the final package |
| **Nyx** | Strategy Agent | Audience, positioning, campaign pillars |
| **Vale** | Copywriter Agent | Tagline, headlines, ad copy |
| **Kepler** | SEO Agent | Keyword clusters, meta descriptions, content ideas |
| **Orbit** | Social Media Agent | Two-week platform posting plan |
| **Sable** | QA & Brand Agent | Reviews every output for tone and consistency before it ships |

## How a run works

1. You submit a brief (product, audience, goal, platforms, tone, budget) from the dashboard.
2. **Ada (CEO)** turns it into per-agent work orders.
3. **Nyx (Strategy)** runs first and produces positioning + pillars.
4. **Vale (Copy)** and **Kepler (SEO)** run in parallel off the brief + strategy.
5. **Orbit (Social)** builds the posting plan using Vale's copy.
6. **Sable (QA)** reviews everything and returns a verdict + notes.
7. **Ada (CEO)** compiles the final campaign package.
8. Download the result as a **Word document** (ready to edit) or **PDF** (for quick sharing).

## Architecture

```
staffless/
├── backend/
│   ├── server.js       # Express server, SSE endpoint, export endpoint
│   ├── agents.js        # Agent personas + the pipeline (simulate or live)
│   ├── simulate.js      # Local, brief-aware agent output generator (no API key needed)
│   ├── export.js        # Turns the final package into a downloadable .docx
│   ├── start.bat        # One-click launcher for Windows (non-technical use)
│   ├── start.sh         # One-click launcher for Mac/Linux
│   ├── package.json
│   └── .env.example
├── frontend/
│   └── public/
│       ├── index.html    # Brief intake form + ops floor + feed + deliverable panel
│       ├── style.css      # Design system + print-friendly PDF styling
│       └── app.js         # SSE client, desk rendering, export buttons
├── render.yaml           # Deploy config for Render.com (so it can run online, not just on a laptop)
└── LICENSE-AGREEMENT-TEMPLATE.md   # Starting point if licensing this to an agency
```

STAFFLESS runs in **simulation mode by default**: `simulate.js` generates
brief-aware agent output locally, with no API key, no network call, and no
quota to run out of. Set `USE_GEMINI=true` in `.env` to route calls through
the real Gemini API instead (via Google's official `@google/genai` SDK); if a
live call ever fails, STAFFLESS automatically falls back to the simulator
mid-run.

**For real client work, use live mode** — simulation is great for demos, but
a paying client needs genuinely fresh output every time, not templates.

## Running it — non-technical setup (recommended for agency staff)

**Windows:** double-click `backend/start.bat`
**Mac/Linux:** double-click `backend/start.sh` (or run `./start.sh` in Terminal)

This automatically installs what's needed, creates the config file, starts
the server, and opens the dashboard in your browser. No terminal commands
required after the first double-click.

## Running it — manual/developer setup

```bash
cd backend
npm install
cp .env.example .env
npm start
```

### Optional: use the real Gemini API (recommended for real client work)

1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
2. In `.env`, set:
   ```
   USE_GEMINI=true
   GEMINI_API_KEY=your-key-here
   ```
3. Restart with `npm start`.

## Deploying it online (so clients can use it without your laptop running)

A `render.yaml` is included for one-click deployment to
[Render.com](https://render.com) (has a free tier):
1. Push this repo to GitHub.
2. On Render, choose "New Blueprint" and point it at your repo — it reads `render.yaml` automatically.
3. Add your `GEMINI_API_KEY` in Render's dashboard when prompted (marked `sync: false` so it isn't stored in the repo).

This turns STAFFLESS from "only runs on my laptop" into an always-on tool
clients or your own team can reach from anywhere.

## Selling this (Model B: license it / Model C: run it as a service)

See `LICENSE-AGREEMENT-TEMPLATE.md` for a starting-point agreement if
licensing the code to an agency. It is **not legal advice** — have it
reviewed before using it with a real paying client.

## Notes for judges / technical reviewers

- No agent framework is used on purpose — every call (in live mode) is a
  direct, readable `generateContent` call in `agents.js`, so you can trace
  exactly what each agent is prompted with and why.
- The pipeline is intentionally sequential-where-it-matters (Strategy before
  Copy/Social) and parallel where it doesn't (Copy + SEO).
- Every agent step falls back to the local simulator if a live call fails —
  see `runStep()` in `agents.js`.
- `agents.js` is the single place to add a new employee agent.
