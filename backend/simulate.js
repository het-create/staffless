/**
 * Simulation mode. Produces realistic, brief-aware agent outputs entirely
 * locally — no API key, no network call, no quota, no rate limit. This is
 * what STAFFLESS runs on by default so a hackathon demo never breaks on
 * stage because of a key/billing/quota issue.
 *
 * Every function below takes the raw brief (plus whatever upstream agent
 * output it depends on) and returns text woven from the brief's own words,
 * so different briefs genuinely produce different-looking output.
 */

function think(ms = 700 + Math.random() * 700) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function firstWord(str, fallback) {
  if (!str) return fallback;
  return str.split(/[,;.\s]/)[0];
}

function planWorkOrders(brief) {
  return [
    `Strategist: Define the audience and positioning for ${brief.product || "the product"}, aimed at ${brief.audience || "the target audience"}.`,
    `Copywriter: Write tagline and headlines that hit "${brief.goal || "the primary goal"}" in a ${brief.tone || "clear, confident"} tone.`,
    `SEO Lead: Build a keyword and meta plan around ${firstWord(brief.product, "the product")} for the audience described.`,
    `Social Media Manager: Build a two-week plan across ${brief.platforms || "the requested platforms"}.`,
  ].join("\n");
}

function strategy(brief) {
  const product = brief.product || "the product";
  const audience = brief.audience || "the target audience";
  const goal = brief.goal || "drive awareness and conversion";
  return [
    `AUDIENCE: ${audience}. They're evaluating options in this category on trust and fit, not just price.`,
    ``,
    `POSITIONING: ${product} wins by being the obvious, low-friction choice for ${audience.toLowerCase()} — not the loudest option, the easiest one to say yes to.`,
    ``,
    `CAMPAIGN PILLARS:`,
    `1. Proof over promises — show real use, not just claims.`,
    `2. Make the first step small — trial, sample, or low-commitment entry point.`,
    `3. Speak like a peer, not a brand — match the ${brief.tone || "brand's"} tone throughout.`,
    ``,
    `PRIMARY GOAL: ${goal}.`,
  ].join("\n");
}

function copy(brief) {
  const product = brief.product || "This product";
  const tone = brief.tone || "confident, straightforward";
  return [
    `TAGLINE: "${product.split("—")[0].trim()}. Made for how you actually live."`,
    ``,
    `HEADLINES:`,
    `1. "The easiest yes you'll make this month."`,
    `2. "${product.split("—")[0].trim()}, without the learning curve."`,
    `3. "Built for ${brief.audience ? brief.audience.split(",")[0].trim().toLowerCase() : "people who don't have time to overthink it"}."`,
    ``,
    `AD COPY:`,
    `A. "You've got enough decisions today. This one's easy: try ${product.split("—")[0].trim()} — see for yourself."`,
    `B. "${brief.goal ? brief.goal : "One small step"}, no big commitment. That's the whole pitch."`,
    ``,
    `TONE CHECK: written to read as ${tone.toLowerCase()}.`,
  ].join("\n");
}

function seo(brief) {
  const base = firstWord(brief.product, "product").toLowerCase();
  return [
    `KEYWORDS:`,
    `Informational: "what is ${base}", "how does ${base} work", "${base} benefits"`,
    `Commercial: "best ${base} for beginners", "${base} vs alternatives", "buy ${base} online"`,
    `Branded: "${base} reviews", "${base} pricing"`,
    ``,
    `META DESCRIPTIONS:`,
    `1. "Discover ${brief.product || "our product"} — built for ${brief.audience || "you"}. See why it's the easy choice. Try it today."`,
    `2. "${brief.product || "Our product"}: simple, effective, and made for real life. Read more and get started."`,
    ``,
    `CONTENT IDEAS:`,
    `1. "A beginner's guide to getting started with ${base}"`,
    `2. "5 signs you're ready to switch"`,
    `3. "What real users say after 30 days"`,
  ].join("\n");
}

function social(brief) {
  const platforms = (brief.platforms || "Instagram, TikTok")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return platforms
    .map(
      (platform) => `${platform.toUpperCase()}:
- Post 1 (intro): "Meet ${brief.product || "the product"}." Cadence: week 1, day 1.
- Post 2 (proof): Real use / testimonial style. Cadence: week 1, day 4.
- Post 3 (offer): Low-commitment entry point call-to-action. Cadence: week 2, day 2.
- Post 4 (community): UGC or reply-to-comments style post. Cadence: week 2, day 6.`
    )
    .join("\n\n");
}

function qa(brief) {
  return [
    `VERDICT: Approved with notes.`,
    ``,
    `NOTES:`,
    `1. Keep the tone consistent with "${brief.tone || "the brief's requested tone"}" across all copy — one line in the social plan reads slightly more formal than the ad copy.`,
    `2. Make sure the entry-point offer mentioned in copy matches exactly what's promoted in the SEO meta descriptions.`,
    `3. Confirm platform-specific claims (e.g. any pricing or availability) before this goes live.`,
  ].join("\n");
}

function finalPackage(brief, parts) {
  return [
    `CAMPAIGN PACKAGE — ${brief.product || "Client Campaign"}`,
    `Prepared by STAFFLESS · Ada (CEO Agent)`,
    ``,
    `=== STRATEGY ===`,
    parts.strategy,
    ``,
    `=== CREATIVE ===`,
    parts.copy,
    ``,
    `=== SEO ===`,
    parts.seo,
    ``,
    `=== SOCIAL PLAN ===`,
    parts.social,
    ``,
    `=== QA SIGN-OFF ===`,
    parts.qa,
    ``,
    `This package is ready to hand to a client as-is, or use as a first draft for a human reviewer.`,
  ].join("\n");
}

module.exports = { think, planWorkOrders, strategy, copy, seo, social, qa, finalPackage };
