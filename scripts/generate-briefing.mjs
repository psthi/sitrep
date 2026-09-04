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

  let economicSummary = "No active macroeconomic metrics available.";
  if (existsSync("data/economic.json")) {
    try {
      const econData = JSON.parse(readFileSync("data/economic.json", "utf-8"));
      economicSummary = (econData.metrics || [])
        .map(m => `${m.name}: ${m.value} ${m.unit} (${m.assessment}, Change: ${m.change > 0 ? '+' : ''}${m.change})`)
        .join("\n");
    } catch (_) {}
  }

  let unrestSummary = "No active civil unrest metrics available.";
  if (existsSync("data/unrest.json")) {
    try {
      const unrestData = JSON.parse(readFileSync("data/unrest.json", "utf-8"));
      unrestSummary = (unrestData.signals || []).slice(0, 15)
        .map(s => `[${s.source}] ${s.title_or_type} at ${s.location}: ${s.summary.slice(0, 80)}...`)
        .join("\n");
    } catch (_) {}
  }

  const prompt = `You are a Senior Geopolitical, Defense, and Macroeconomic Intelligence Analyst producing an unclassified Situation Report (SITREP).
Your audience includes defense/policy analysts who demand operational rigor and strategic precision, as well as informed everyday citizens who need clear, plain-English explanations of how global events directly impact their household, wallet, and daily life.

Review these latest ingested signals from the past 24-48 hours:
${headlinesList}

Review current macroeconomic and financial stability indicators:
${economicSummary}

Review recent civil unrest and demonstration indicators:
${unrestSummary}

Synthesize these defense signals, economic indicators, and civil unrest metrics into a unified intelligence briefing adhering strictly to the JSON schema below.

JSON SCHEMA REQUIREMENT:
{
  "bluf": "2-3 sentence Bottom Line Up Front. State the single most significant strategic reality and immediate risk trajectory clearly and authoritatively.",
  "householdImpact": {
    "energyAndFuel": "1-2 plain-English sentences explaining what current oil/gas prices and geopolitical tensions mean for filling up a car at the gas pump and home electric/heating utility bills.",
    "borrowingAndMortgages": "1-2 plain-English sentences explaining how current bond yields and borrowing conditions affect mortgage rates, auto loans, and credit card interest.",
    "groceriesAndSupplyChain": "1-2 plain-English sentences explaining how maritime chokepoints, trade friction, or energy costs are impacting food prices, grocery bills, and everyday consumer goods.",
    "jobsAndSavings": "1-2 plain-English sentences explaining what market volatility and corporate credit conditions mean for job security, hiring, and 401(k)/retirement savings."
  },
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
      "theater": "Domestic Civil Unrest & Demonstrations",
      "status": "CRITICAL" | "HIGH" | "ELEVATED" | "GUARDED" | "MODERATE",
      "trend": "ESCALATING" | "VOLATILE" | "STABLE" | "DE-ESCALATING",
      "summary": "1-sentence summary of recent protests, riots, or social mobilization trends."
    },
    {
      "theater": "Global Energy & Trade Chokepoints",
      "status": "CRITICAL" | "HIGH" | "ELEVATED" | "GUARDED" | "MODERATE",
      "trend": "ESCALATING" | "VOLATILE" | "STABLE" | "DE-ESCALATING",
      "summary": "1-sentence summary of energy prices (oil/gas), maritime transit, sanctions impact, or critical commodity security."
    }
  ],
  "operationalSummary": [
    "Paragraph 1: Kinetic & Frontline Operations — specific strikes, ground maneuvering, air/drone activity, naval engagements, and weapons employment.",
    "Paragraph 2: Strategic Alliances & Diplomatic Posturing — defense pacts, munitions pipelines, sanctions enforcement, deterrence signals, and political pressures.",
    "Paragraph 3: Geoeconomic, Market & Social Stability — integration of current oil/commodity prices, credit spreads, currency pressures, supply chain vulnerabilities, and domestic civil unrest."
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

Ensure all fields including householdImpact are fully populated. Output valid JSON only with NO markdown code fences or conversational text.`;

  const model = process.env.OPENROUTER_MODEL || "z-ai/glm-5.3-flash";
  console.log(`[INFO] Querying OpenRouter (${model}) for unified SITREP synthesis with Household Impact...`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 40000);

  let res;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      signal: controller.signal,
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
            content: "You are an elite geopolitical, military, and macroeconomic intelligence watch officer. You output strictly valid, well-formed JSON conforming to the requested schema. No commentary, no preamble."
          },
          { role: "user", content: prompt }
        ],
      }),
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    console.error("[ERROR] OpenRouter request failed or timed out:", fetchErr.message);
    return;
  }
  clearTimeout(timeout);

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
    console.log(`[SUCCESS] Intelligence SITREP with Household Impact written to data/briefing.json using ${model}`);
  } catch (parseErr) {
    console.error("[ERROR] JSON parse error:", parseErr.message);
  }
}

main().catch((err) => {
  console.error("[FATAL] Briefing generation failed:", err.message);
});
