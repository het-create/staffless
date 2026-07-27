require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");
const path = require("path");
const { AGENTS, orchestrate } = require("./agents");
const { buildDocx } = require("./export");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend", "public")));

// In-memory store of active runs: runId -> { clients: Set<res>, buffer: [] }
// `buffer` lets a client that connects slightly late replay everything
// that already happened in this run.
const runs = new Map();

function emitToRun(runId, event) {
  const run = runs.get(runId);
  if (!run) return;
  run.buffer.push(event);
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of run.clients) {
    res.write(payload);
  }
}

app.get("/api/agents", (req, res) => {
  res.json(Object.values(AGENTS));
});

app.post("/api/export/docx", async (req, res) => {
  const { product, content } = req.body || {};
  if (!content) {
    res.status(400).json({ error: "Missing content to export." });
    return;
  }
  try {
    const buffer = await buildDocx(product, content);
    const safeName = (product || "staffless-campaign").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}.docx"`,
    });
    res.send(buffer);
  } catch (err) {
    console.error("Docx export failed:", err);
    res.status(500).json({ error: "Could not generate the Word document." });
  }
});

app.post("/api/run", async (req, res) => {
  const brief = req.body || {};
  const runId = randomUUID();
  runs.set(runId, { clients: new Set(), buffer: [] });
  res.json({ runId });

  try {
    await orchestrate(brief, (event) => emitToRun(runId, event));
    emitToRun(runId, { type: "run_complete" });
  } catch (err) {
    console.error("Orchestration failed:", err);
    emitToRun(runId, {
      type: "error",
      message:
        err && err.message
          ? err.message
          : "The agency hit an unexpected error mid-run.",
    });
  }
});

app.get("/api/stream/:runId", (req, res) => {
  const { runId } = req.params;
  const run = runs.get(runId);
  if (!run) {
    res.status(404).end();
    return;
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  // Replay anything that already happened before this client connected.
  for (const event of run.buffer) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  run.clients.add(res);
  req.on("close", () => {
    run.clients.delete(res);
  });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`STAFFLESS backend running on http://localhost:${PORT}`);
  if (process.env.USE_GEMINI === "true") {
    console.log("Mode: LIVE (calling the real Gemini API, with automatic fallback to simulation).");
    if (!process.env.GEMINI_API_KEY) {
      console.warn("WARNING: USE_GEMINI is true but GEMINI_API_KEY is not set. Every call will fall back to simulation.");
    }
  } else {
    console.log("Mode: SIMULATE (no API key needed — set USE_GEMINI=true in .env to use the real Gemini API).");
  }
});
