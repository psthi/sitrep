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

  let firmsSummary = "No thermal anomalies detected.";
  if (existsSync("data/firms.json")) {
    try {
      const firmsData = JSON.parse(readFileSync("data/firms.json", "utf-8"));
      firmsSummary = `Detected ${firmsData.length} high-confidence thermal/fire anomalies worldwide in the last 24h via NASA FIRMS.`;
    } catch (_) {}
  }

  let maritimeSummary = "No maritime choke point data available.";
  if (existsSync("data/maritime.json")) {
    try {
      const maritimeData = JSON.parse(readFileSync("data/maritime.json", "utf-8"));
      maritimeSummary = (maritimeData.chokepoints || [])
        .map(c => `[Maritime] ${c.name}: ${c.status} (${c.vessel_count} vessels) - ${c.note}`)
        .join("\n");
    } catch (_) {}
  }

  let aviationSummary = "No aviation tracking data available.";
  if (existsSync("data/aviation.json")) {
    try {
      const aviationData = JSON.parse(readFileSync("data/aviation.json", "utf-8"));
      aviationSummary = `Tracking ${aviationData.total_tracked || 0} flights globally via OpenSky (Military/Specialized: ${aviationData.special_interest || 0}).`;
    } catch (_) {}
  }

  const prompt = `You are a Senior Editor for a popular global news newsletter (similar to Morning Brew or Axios).
Your audience includes informed everyday citizens who need clear, plain-English explanations of how global events directly impact their household, wallet, and daily life. You must avoid military jargon, acronyms, and overly dense geopolitical speak.

Review these latest ingested signals from the past 24-48 hours:
${headlinesList}

Review current macroeconomic and financial stability indicators:
${economicSummary}

Review recent civil unrest and demonstration indicators:
${unrestSummary}

Review NASA FIRMS thermal/fire anomaly detections:
${firmsSummary}

Review Maritime/AIS chokepoint tracking:
${maritimeSummary}

Review Aviation/OpenSky global tracking:
${aviationSummary}

Synthesize these defense signals, economic indicators, and civil unrest metrics into a unified, easy-to-read daily newsletter adhering strictly to the JSON schema below.

JSON SCHEMA REQUIREMENT:
{
  "theBigPicture": "2-3 sentence summary of the most important global events over the last 24 hours, written in plain English, explaining why it matters today.",
  "householdImpact": {
    "energyAndFuel": "1-2 plain-English sentences explaining what current oil/gas prices and tensions mean for gas pump prices and home energy bills.",
    "borrowingAndMortgages": "1-2 plain-English sentences explaining how current economic conditions affect mortgage rates, auto loans, and credit cards.",
    "groceriesAndSupplyChain": "1-2 plain-English sentences explaining how shipping issues or inflation are impacting food prices and grocery bills.",
    "jobsAndSavings": "1-2 plain-English sentences explaining what the market means for job security and 401(k)/retirement savings."
  },
  "globalFlashpoints": [
    {
      "region": "Eastern Europe / Ukraine",
      "status": "Elevated" | "Volatile" | "Stable",
      "summary": "1-sentence plain-English summary of what's happening."
    },
    {
      "region": "Middle East & Red Sea",
      "status": "Elevated" | "Volatile" | "Stable",
      "summary": "1-sentence plain-English summary of what's happening."
    },
    {
      "region": "Indo-Pacific & Taiwan",
      "status": "Elevated" | "Volatile" | "Stable",
      "summary": "1-sentence plain-English summary of what's happening."
    },
    {
      "region": "Domestic Civil Unrest",
      "status": "Elevated" | "Volatile" | "Stable",
      "summary": "1-sentence plain-English summary of notable protests or disruptions."
    }
  ],
  "topStories": [
    {
      "headline": "Clear, engaging headline for a major event",
      "whyItMatters": "A brief 1-2 sentence explanation of the impact without jargon."
    }
  ],
  "whatWeAreWatching": [
    "Specific upcoming event or trend to keep an eye on over the next few days, in plain English."
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
            content: "You are a Senior Editor for a daily global news newsletter. You output strictly valid, well-formed JSON conforming to the requested schema. No commentary, no preamble."
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
