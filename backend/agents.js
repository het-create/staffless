const sim = require("./simulate");

// STAFFLESS runs in SIMULATE mode by default: no API key, no network call,
// no quota/billing to worry about — ideal for a hackathon demo that has to
// work every time. Set USE_GEMINI=true in .env to route calls through the
// real Gemini API instead (falls back to simulation automatically if a
// live call fails, so a flaky key never breaks the demo mid-run).
const USE_GEMINI = process.env.USE_GEMINI === "true";
let genaiClient = null;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

if (USE_GEMINI) {
  const { GoogleGenAI } = require("@google/genai");
  genaiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

/**
 * The full roster of STAFFLESS. One CEO agent, five employee agents.
 * Each entry defines the agent's persona (system prompt, used only in live
 * mode) and desk metadata used by the frontend to draw the ops floor.
 */
const AGENTS = {
  ceo: {
    id: "ceo",
    name: "Ada",
    title: "CEO Agent",
    desk: "corner-office",
    system: `You are Ada, the autonomous CEO of STAFFLESS, a marketing and content
agency with no human staff. You receive a client's campaign brief and are
responsible for the whole engagement end to end.

Your two jobs, always done in this order:
1. PLANNING — break the brief into concrete work orders for your employee
   agents (Strategist, Copywriter, SEO Lead, Social Media Manager). Give each
   one a short, specific task grounded in the brief, not a generic restatement
   of their job title.
2. COMPILING — once you receive their outputs and the QA verdict, assemble a
   single, coherent campaign package a real client could act on immediately.
   Resolve contradictions between agents yourself. Do not just concatenate
   their outputs; edit them into one voice.

Be decisive and specific. Never say you need more information — make
reasonable assumptions and state them briefly if the brief is thin.`,
  },
  strategist: {
    id: "strategist",
    name: "Nyx",
    title: "Strategy Agent",
    desk: "desk-1",
    system: `You are Nyx, the Strategy agent at STAFFLESS. Given a client brief
and a work order from the CEO, produce a tight campaign strategy: target
audience definition, core positioning/angle, 3 campaign pillars or hooks, and
the single measurable goal the campaign should chase. Keep it concrete and
specific to the brief's product — no generic marketing filler. Output in
clear short sections, no more than ~200 words.`,
  },
  copywriter: {
    id: "copywriter",
    name: "Vale",
    title: "Copywriter Agent",
    desk: "desk-2",
    system: `You are Vale, the Copywriter agent at STAFFLESS. Given a client
brief, the CEO's work order, and the strategy from Nyx (if provided), write:
- 1 campaign tagline
- 3 headline variants
- 2 short ad copy blocks (under 40 words each)
Match the tone requested in the brief. Be specific to the product, never
generic. Output in clear labeled sections.`,
  },
  seo: {
    id: "seo",
    name: "Kepler",
    title: "SEO Agent",
    desk: "desk-3",
    system: `You are Kepler, the SEO agent at STAFFLESS. Given a client brief
and work order, produce: 8-10 target keywords/phrases grouped by intent
(informational/commercial/branded), 2 meta description drafts (under 155
characters each), and 3 content/blog topic ideas that would rank and support
the campaign. Be specific to the product and audience, not generic SEO
advice. Output in clear labeled sections.`,
  },
  social: {
    id: "social",
    name: "Orbit",
    title: "Social Media Agent",
    desk: "desk-4",
    system: `You are Orbit, the Social Media Manager agent at STAFFLESS. Given
a client brief, work order, and the tagline/copy from Vale (if provided),
produce a 2-week platform posting plan for the platforms named in the brief:
for each platform, 3-4 post concepts (format + one-line hook each) and posting
cadence. Keep it practical and specific to the product. Output in clear
labeled sections, one per platform.`,
  },
  qa: {
    id: "qa",
    name: "Sable",
    title: "QA & Brand Agent",
    desk: "desk-5",
    system: `You are Sable, the QA and Brand Consistency agent at STAFFLESS.
You receive the strategy, copy, SEO, and social outputs for one client
engagement. Check them for: tone consistency with the brief, factual/product
consistency across agents, and any weak or generic lines. Return a verdict
("Approved" or "Approved with notes") plus at most 3 short, specific notes.
Do not rewrite the work yourself — just review it. Keep it under 120 words.`,
  },
};

async function callGemini(agentId, userContent) {
  const agent = AGENTS[agentId];
  const response = await genaiClient.models.generateContent({
    model: MODEL,
    contents: userContent,
    config: {
      systemInstruction: agent.system,
      maxOutputTokens: 800,
    },
  });
  return response.text.trim();
}

/**
 * Runs the full STAFFLESS pipeline for one client brief, emitting granular
 * events as each agent moves through idle -> working -> done so a frontend
 * can render a live ops floor. `emit` is called with plain JSON-serializable
 * event objects.
 */
async function orchestrate(brief, emit) {
  emit({ type: "log", agent: "ceo", message: "Reading incoming client brief..." });
  emit({ type: "status", agent: "ceo", status: "working" });
  await sim.think();

  const plan = await runStep("ceo", () => sim.planWorkOrders(brief), () =>
    callGemini(
      "ceo",
      `Client brief:\n${formatBrief(brief)}\n\nWrite a short work order (1-2 sentences each) for: Strategist, Copywriter, SEO Lead, Social Media Manager. Label each clearly, e.g. "Strategist: ...".`
    )
  );
  emit({ type: "output", agent: "ceo", label: "Work orders", content: plan });
  emit({ type: "log", agent: "ceo", message: "Work orders issued to the floor." });
  emit({ type: "status", agent: "ceo", status: "reviewing" });

  // Strategist runs first since copy and social lean on its output.
  emit({ type: "status", agent: "strategist", status: "working" });
  emit({ type: "log", agent: "strategist", message: "Drafting positioning and campaign angle..." });
  const strategy = await runStep("strategist", () => sim.strategy(brief), () =>
    callGemini("strategist", `Client brief:\n${formatBrief(brief)}\n\nWork order: ${plan}`)
  );
  emit({ type: "output", agent: "strategist", label: "Strategy", content: strategy });
  emit({ type: "status", agent: "strategist", status: "done" });

  // Copywriter and SEO run in parallel — they only depend on the brief +
  // strategy, not on each other.
  emit({ type: "status", agent: "copywriter", status: "working" });
  emit({ type: "log", agent: "copywriter", message: "Writing tagline and headline options..." });
  emit({ type: "status", agent: "seo", status: "working" });
  emit({ type: "log", agent: "seo", message: "Researching keyword clusters..." });

  const [copy, seo] = await Promise.all([
    runStep("copywriter", () => sim.copy(brief), () =>
      callGemini("copywriter", `Client brief:\n${formatBrief(brief)}\n\nStrategy from Nyx:\n${strategy}`)
    ),
    runStep("seo", () => sim.seo(brief), () =>
      callGemini("seo", `Client brief:\n${formatBrief(brief)}`)
    ),
  ]);

  emit({ type: "output", agent: "copywriter", label: "Copy", content: copy });
  emit({ type: "status", agent: "copywriter", status: "done" });
  emit({ type: "output", agent: "seo", label: "SEO", content: seo });
  emit({ type: "status", agent: "seo", status: "done" });

  emit({ type: "status", agent: "social", status: "working" });
  emit({ type: "log", agent: "social", message: "Building the two-week posting plan..." });
  const social = await runStep("social", () => sim.social(brief), () =>
    callGemini("social", `Client brief:\n${formatBrief(brief)}\n\nTagline/copy from Vale:\n${copy}`)
  );
  emit({ type: "output", agent: "social", label: "Social plan", content: social });
  emit({ type: "status", agent: "social", status: "done" });

  // QA reviews everything before the CEO compiles.
  emit({ type: "status", agent: "qa", status: "working" });
  emit({ type: "log", agent: "qa", message: "Checking brand and tone consistency across the floor..." });
  const qaVerdict = await runStep("qa", () => sim.qa(brief), () =>
    callGemini(
      "qa",
      `Client brief:\n${formatBrief(brief)}\n\nStrategy:\n${strategy}\n\nCopy:\n${copy}\n\nSEO:\n${seo}\n\nSocial:\n${social}`
    )
  );
  emit({ type: "output", agent: "qa", label: "QA verdict", content: qaVerdict });
  emit({ type: "status", agent: "qa", status: "done" });

  // CEO compiles the final package.
  emit({ type: "status", agent: "ceo", status: "working" });
  emit({ type: "log", agent: "ceo", message: "Compiling final campaign package for the client..." });
  const finalPackage = await runStep(
    "ceo",
    () => sim.finalPackage(brief, { strategy, copy, seo, social, qa: qaVerdict }),
    () =>
      callGemini(
        "ceo",
        `Client brief:\n${formatBrief(brief)}\n\nStrategy:\n${strategy}\n\nCopy:\n${copy}\n\nSEO:\n${seo}\n\nSocial plan:\n${social}\n\nQA verdict:\n${qaVerdict}\n\nCompile these into one final, client-ready campaign package. Use clear section headers.`
      )
  );
  emit({ type: "final", content: finalPackage });
  emit({ type: "status", agent: "ceo", status: "done" });
  emit({ type: "log", agent: "ceo", message: "Campaign package delivered." });
}

/**
 * Runs one pipeline step. In simulate mode, calls simulateFn directly (with
 * a short artificial "thinking" delay). In live mode, tries liveFn first and
 * silently falls back to simulateFn if the live call throws for any reason
 * (bad key, quota, network) — so a demo never dies mid-run.
 */
async function runStep(agentId, simulateFn, liveFn) {
  if (!USE_GEMINI) {
    await sim.think();
    return simulateFn();
  }
  try {
    return await liveFn();
  } catch (err) {
    console.warn(`[${agentId}] live Gemini call failed, falling back to simulation:`, err.message);
    await sim.think(300);
    return simulateFn();
  }
}

function formatBrief(brief) {
  return [
    `Product/company: ${brief.product || "N/A"}`,
    `Target audience: ${brief.audience || "N/A"}`,
    `Primary goal: ${brief.goal || "N/A"}`,
    `Platforms: ${brief.platforms || "N/A"}`,
    `Tone: ${brief.tone || "N/A"}`,
    `Budget note: ${brief.budget || "N/A"}`,
  ].join("\n");
}

module.exports = { AGENTS, orchestrate };
