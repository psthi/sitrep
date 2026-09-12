import { readFileSync, existsSync } from "fs";

async function getOrCreateTerm(wpUrl, authHeader, taxonomy, termName) {
  const endpoint = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/${taxonomy}`;
  
  try {
    // Search for existing term
    const searchRes = await fetch(`${endpoint}?search=${encodeURIComponent(termName)}`, {
      headers: { "Authorization": authHeader }
    });
    
    if (searchRes.ok) {
      const terms = await searchRes.json();
      const exactMatch = terms.find(t => t.name.toLowerCase() === termName.toLowerCase());
      if (exactMatch) return exactMatch.id;
    }
    
    // Create new term if it doesn't exist
    const createRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": authHeader },
      body: JSON.stringify({ name: termName })
    });
    
    if (createRes.ok) {
      const newTerm = await createRes.json();
      return newTerm.id;
    } else {
      console.warn(`[WARN] Failed to create ${taxonomy} '${termName}': ${createRes.status}`);
    }
  } catch (err) {
    console.warn(`[WARN] Error fetching/creating ${taxonomy} '${termName}':`, err.message);
  }
  return null;
}

async function sendWordPressBriefing() {
  const wpUrl = process.env.WP_URL;
  const wpUser = process.env.WP_USERNAME;
  const wpPass = process.env.WP_APP_PASSWORD;

  if (!wpUrl || !wpUser || !wpPass) {
    console.log("[INFO] WP_URL, WP_USERNAME, or WP_APP_PASSWORD not set — skipping WordPress dispatch.");
    return;
  }

  if (!existsSync("data/briefing.json")) {
    console.log("[WARN] No data/briefing.json found — skipping WordPress dispatch.");
    return;
  }

  let briefing;
  try {
    briefing = JSON.parse(readFileSync("data/briefing.json", "utf-8"));
  } catch (err) {
    console.error("[ERROR] Failed to parse data/briefing.json:", err.message);
    return;
  }

  const authHeader = "Basic " + Buffer.from(`${wpUser}:${wpPass}`).toString("base64");

  // Build Theater Threat Matrix lines
  const threatLines = (briefing.threatMatrix || [])
    .map(t => `<li><strong>${t.theater}</strong>: <code>[${t.status}]</code> ${t.trend ? `<em>(${t.trend})</em>` : ''}</li>`)
    .join("\n");

  let householdBlock = "";
  if (briefing.householdImpact) {
    const h = briefing.householdImpact;
    const items = [];
    if (h.energyAndFuel) items.push(`<li><strong>Fuel & Utilities:</strong> ${h.energyAndFuel}</li>`);
    if (h.borrowingAndMortgages) items.push(`<li><strong>Mortgages & Debt:</strong> ${h.borrowingAndMortgages}</li>`);
    if (h.groceriesAndSupplyChain) items.push(`<li><strong>Groceries & Food:</strong> ${h.groceriesAndSupplyChain}</li>`);
    if (h.jobsAndSavings) items.push(`<li><strong>Jobs & Savings:</strong> ${h.jobsAndSavings}</li>`);

    if (items.length > 0) {
      householdBlock = `<h2>Civilian & Household Impact</h2>\n<ul>\n${items.join("\n")}\n</ul>\n`;
    }
  }

  let econBlock = "";
  if (existsSync("data/economic.json")) {
    try {
      const econData = JSON.parse(readFileSync("data/economic.json", "utf-8"));
      const metrics = econData.metrics || [];
      const brent = metrics.find(m => m.id === "DCOILBRENTEU");
      const vix = metrics.find(m => m.id === "VIXCLS");
      const yield10y2y = metrics.find(m => m.id === "T10Y2Y");
      const dxy = metrics.find(m => m.id === "DTWEXBGS");
      const hySpread = metrics.find(m => m.id === "BAMLH0A0HYM2");

      const parts = [];
      if (brent) parts.push(`<li><strong>Brent:</strong> $${brent.value}/bbl</li>`);
      if (vix) parts.push(`<li><strong>VIX:</strong> ${vix.value}</li>`);
      if (yield10y2y) parts.push(`<li><strong>10Y2Y:</strong> ${yield10y2y.value > 0 ? '+' : ''}${yield10y2y.value}%</li>`);
      if (hySpread) parts.push(`<li><strong>HY OAS:</strong> ${hySpread.value}%</li>`);
      if (dxy) parts.push(`<li><strong>DXY:</strong> ${dxy.value}</li>`);

      if (parts.length > 0) {
        econBlock = `<h2>Geoeconomic Surveillance</h2>\n<ul>\n${parts.join("\n")}\n</ul>\n`;
      }
    } catch (_) {}
  }

  const devLines = (briefing.keyDevelopments || briefing.topStories || []).slice(0, 4)
    .map(d => `<li><strong>${d.headline}</strong><br/><em>${d.significance}</em></li>`)
    .join("\n");

  const iwLines = (briefing.indicatorsAndWarnings || []).slice(0, 3)
    .map(w => `<li><em>${w}</em></li>`)
    .join("\n");

  const fullHtmlContent = `
<p><strong>Date:</strong> ${briefing.date || new Date().toISOString().split("T")[0]} | <strong>Classification:</strong> <code>UNCLASSIFIED // OSINT</code></p>

<h2>Bottom Line Up Front (BLUF)</h2>
<p>${briefing.bluf || briefing.summary || "No active summary available."}</p>

<h2>Regional Threat Matrix</h2>
<ul>
${threatLines || "<li>No active threat indicators</li>"}
</ul>

${householdBlock}
${econBlock}

<h2>Key Developments</h2>
<ul>
${devLines || "<li>No active developments listed</li>"}
</ul>

${iwLines ? `<h2>Indicators & Warnings (24-72H)</h2>\n<ul>\n${iwLines}\n</ul>\n` : ''}
<hr/>
<p><a href="https://psthi.github.io/sitrep/">View Live Command Dashboard</a></p>
`.trim();

  // 1. Get Category ID
  const categoryId = await getOrCreateTerm(wpUrl, authHeader, "categories", "Daily Intelligence");
  
  // 2. Get Tag IDs (Static base tags + Dynamic regions from Threat Matrix)
  const tagNames = new Set(["SITREP", "OSINT", "Geopolitics"]);
  if (briefing.threatMatrix) {
    briefing.threatMatrix.forEach(t => {
      if (t.theater) {
        // e.g., "Middle East & Red Sea" -> split into simpler tags if needed, or keep as one. We will keep as is.
        tagNames.add(t.theater.replace(/&amp;/g, '&').replace(/&/g, 'and'));
      }
    });
  }
  
  const tagIds = [];
  for (const tagName of tagNames) {
    const tId = await getOrCreateTerm(wpUrl, authHeader, "tags", tagName);
    if (tId) tagIds.push(tId);
  }

  // 3. RankMath SEO Metadata
  const seoDescription = (briefing.bluf || briefing.summary || "").substring(0, 160).trim();
  const seoKeywords = Array.from(tagNames).slice(0, 5).join(", ");

  const postData = {
    title: `SITREP // Operational Intelligence Briefing - ${briefing.date || new Date().toISOString().split("T")[0]}`,
    content: fullHtmlContent,
    status: "publish",
    categories: categoryId ? [categoryId] : [],
    tags: tagIds,
    meta: {
      rank_math_focus_keyword: seoKeywords,
      rank_math_description: seoDescription
    }
  };

  const endpoint = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
  
  try {
    console.log(`[INFO] Sending SITREP to WordPress at ${endpoint}...`);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader
      },
      body: JSON.stringify(postData)
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[SUCCESS] SITREP published to WordPress successfully! Post ID: ${data.id}`);
    } else {
      const err = await res.text();
      console.error(`[ERROR] WordPress API failed (${res.status}): ${err}`);
    }
  } catch (err) {
    console.error(`[ERROR] Failed sending to WordPress:`, err.message);
  }
}

sendWordPressBriefing().catch(err => {
  console.error("[FATAL] WordPress dispatch error:", err.message);
});
