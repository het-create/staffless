# STAFFLESS
### the agency with nobody in it

Submission for **India's First Public Agentic AI Hackathon** — Theme: *Human-Less Company*.

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

Every step above emits a live event — status changes, log lines, and
finished outputs — over Server-Sent Events, which the dashboard renders as
desks lighting up on an ops floor plus a running terminal feed.

## Architecture

```
staffless/
├── backend/
│   ├── server.js       # Express server, SSE endpoint, run orchestration trigger
│   ├── agents.js        # Agent personas + the pipeline itself (simulate or live)
│   ├── simulate.js      # Local, brief-aware agent output generator (no API key needed)
│   ├── package.json
│   └── .env.example
└── frontend/
    └── public/
        ├── index.html    # Brief intake form + ops floor + feed + deliverable panel
        ├── style.css      # Design system (ink/signal/status-light palette)
        └── app.js         # SSE client, desk rendering, event handling
```

STAFFLESS runs in **simulation mode by default**: `simulate.js` generates
brief-aware agent output locally, with no API key, no network call, and no
quota to run out of — ideal for a hackathon demo that has to work every time
on stage. Set `USE_GEMINI=true` in `.env` to route calls through the real
Gemini API instead (via Google's official `@google/genai` SDK); if a live
call ever fails, STAFFLESS automatically falls back to the simulator
mid-run so a flaky key or rate limit never breaks the demo.

## Running it locally

```bash
cd backend
npm install
cp .env.example .env
npm start
```

That's it — no key required. Open `http://localhost:8787` and submit a
brief; the backend also serves the frontend directly, so there's nothing
else to run.

### Optional: use the real Gemini API

1. Get a free key from [Google AI Studio](https://aistudio.google.com/apikey).
2. In `.env`, set:
   ```
   USE_GEMINI=true
   GEMINI_API_KEY=your-key-here
   ```
3. Restart with `npm start`.

## Notes for judges

- No agent framework is used on purpose — every call (in live mode) is a
  direct, readable `generateContent` call in `agents.js`, so a judge can
  trace exactly what each agent is prompted with and why.
- The pipeline is intentionally sequential-where-it-matters (Strategy before
  Copy/Social) and parallel where it doesn't (Copy + SEO), to show real
  task decomposition rather than one long chained prompt.
- Every agent step is wrapped so a live-mode failure (bad key, quota, rate
  limit) falls back to the local simulator instead of crashing the run — see
  `runStep()` in `agents.js`.
- `agents.js` is the single place to add a new employee agent: add a persona
  to `AGENTS`, add a call in `orchestrate()`, and add a desk in the frontend —
  the SSE event shape doesn't need to change.
