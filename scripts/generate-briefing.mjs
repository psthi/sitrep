import { readFileSync, writeFileSync, existsSync } from "fs";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log("[WARN] No OPENROUTER_API_KEY set — skipping AI briefing generation");
    return;
  }

  if (!existsSync("data/news.json")) {
    console.log("[WARN] No data/news.json found — skipping briefing generation");
    return;
  }

  const newsData = JSON.parse(readFileSync("data/news.json", "utf-8"));
  const top40 = newsData.articles.slice(0, 40);

  const headlinesList = top40
    .map((a, i) => `${i + 1}. [${a.source} | ${a.sourceType || "WIRE"}] ${a.title} - ${a.snippet || ""}`)
    .join("\n");

  const prompt = `You are a Senior Geopolitical and Military Intelligence Analyst producing an unclassified Situation Report (SITREP).
Your audience includes defense/policy analysts who demand operational rigor and strategic precision, as well as informed citizens who need clear, accessible explanations without bureaucratic fluff.

Review these latest ingested signals from the past 24-48 hours:
${headlinesList}

Synthesize these signals into an analytical intelligence briefing adhering strictly to the JSON schema below.

JSON SCHEMA REQUIREMENT:
{
  "bluf": "2-3 sentence Bottom Line Up Front. State the single most significant strategic reality and immediate risk trajectory clearly and authoritatively.",
  "threatMatrix": [
    {
      "theater": "Eastern Europe / Ukraine",
      "status": "CRITICAL" | "HIGH" | "ELEVATED" | "GUARDED" | "MODERATE",
      "trend": "ESCALATING" | "VOLATILE" | "STABLE" | "DE-ESCALATING",
      "summary": "1-sentence operational summary of frontline dynamics or escalatory posture."
    },
    {
      "theater": "Middle East & Red Sea",
      "status": "CRITICAL" | "HIGH" | "ELEVATED" | "GUARDED" | "MODERATE",
      "trend": "ESCALATING" | "VOLATILE" | "STABLE" | "DE-ESCALATING",
      "summary": "1-sentence summary of regional friction, strikes, or maritime chokepoints."
    },
    {
      "theater": "Indo-Pacific & Taiwan",
      "status": "CRITICAL" | "HIGH" | "ELEVATED" | "GUARDED" | "MODERATE",
      "trend": "ESCALATING" | "VOLATILE" | "STABLE" | "DE-ESCALATING",
      "summary": "1-sentence summary of deterrence posture, exercises, or naval movements."
    },
    {
      "theater": "Defense & Cyber Domains",
      "status": "CRITICAL" | "HIGH" | "ELEVATED" | "GUARDED" | "MODERATE",
      "trend": "ESCALATING" | "VOLATILE" | "STABLE" | "DE-ESCALATING",
      "summary": "1-sentence summary of cyber/electronic warfare, space, or major arms transfers."
    },
    {
      "theater": "Global Energy & Trade Chokepoints",
      "status": "CRITICAL" | "HIGH" | "ELEVATED" | "GUARDED" | "MODERATE",
      "trend": "ESCALATING" | "VOLATILE" | "STABLE" | "DE-ESCALATING",
      "summary": "1-sentence summary of maritime transit, sanctions impact, or critical commodity security."
    }
  ],
  "operationalSummary": [
    "Paragraph 1: Kinetic & Frontline Operations — specific strikes, ground maneuvering, air/drone activity, naval engagements, and weapons employment.",
    "Paragraph 2: Strategic Alliances & Diplomatic Posturing — defense pacts, munitions pipelines, sanctions enforcement, deterrence signals, and political pressures.",
    "Paragraph 3: Macro & Cascading Impacts — implications for regional civilians, supply chain vulnerability, energy chokepoints, and cross-border escalation risks."
  ],
  "keyDevelopments": [
    {
      "headline": "Full event description with (Source)",
      "theater": "Theater / Domain name",
      "significance": "Why this matters in operational or strategic terms.",
      "impact": "What this means for regional stability, civilians, or military calculus."
    }
  ],
  "indicatorsAndWarnings": [
    "Specific warning / trigger event to monitor over the next 24-72 hours (e.g. troop build-ups, planned diplomatic ultimatums, scheduled weapons tests, or retaliatory strike windows)."
  ]
}

Ensure all fields are fully populated based on the ingested signals. Output valid JSON only with NO markdown code fences or conversational text.`;

  const model = process.env.OPENROUTER_MODEL || "z-ai/glm-5.3-flash";
  console.log(`[INFO] Querying OpenRouter (${model}) for military-grade SITREP synthesis...`);

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/psthi/sitrep",
      "X-Title": "SITREP Intelligence Synthesis",
    },
    body: JSON.stringify({
      model: model,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are an elite geopolitical and military intelligence watch officer. You output strictly valid, well-formed JSON conforming to the requested schema. No commentary, no preamble."
        },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[ERROR] OpenRouter API error: ${res.status} ${errText}`);
    return;
  }

  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) {
    console.error("[ERROR] Empty response from OpenRouter");
    return;
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[ERROR] Failed to extract JSON from model response:", rawText);
    return;
  }

  try {
    const briefing = JSON.parse(jsonMatch[0]);
    briefing.date = new Date().toISOString().split("T")[0];
    briefing.generatedAt = new Date().toISOString();
    briefing.modelUsed = model;

    writeFileSync("data/briefing.json", JSON.stringify(briefing, null, 2));
    console.log(`[SUCCESS] Intelligence SITREP written to data/briefing.json using ${model}`);
  } catch (parseErr) {
    console.error("[ERROR] JSON parse error:", parseErr.message);
  }
}

main().catch((err) => {
  console.error("[FATAL] Briefing generation failed:", err.message);
});
