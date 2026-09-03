import { writeFileSync, existsSync, mkdirSync } from "fs";

const FRED_API_KEY = process.env.FRED_API_KEY || "a6ca8edc56674edec2f6b6df2cdffbd8";

const SERIES_CONFIG = [
  // Financial Stress & Credit
  { id: "T10Y2Y", name: "10Y-2Y Treasury Spread", category: "Yield Curve", unit: "%" },
  { id: "BAMLH0A0HYM2", name: "US High-Yield OAS Spread", category: "Credit Stress", unit: "%" },
  { id: "NFCI", name: "National Financial Conditions Index", category: "Liquidity", unit: "index" },
  { id: "STLFSI4", name: "Financial Stress Index (STLFSI)", category: "Systemic Stress", unit: "index" },
  { id: "VIXCLS", name: "CBOE Volatility Index (VIX)", category: "Market Volatility", unit: "pts" },
  
  // Strategic Commodities & Energy
  { id: "DCOILBRENTEU", name: "Brent Crude Oil", category: "Energy", unit: "$/bbl" },
  { id: "DCOILWTICO", name: "WTI Crude Oil", category: "Energy", unit: "$/bbl" },
  { id: "DHHNGSP", name: "Henry Hub Natural Gas", category: "Energy", unit: "$/MMBtu" },
  
  // Foreign Exchange & Global Currencies
  { id: "DTWEXBGS", name: "US Dollar Index (Broad DXY)", category: "Currencies", unit: "index" },
  { id: "DEXUSEU", name: "EUR / USD Exchange Rate", category: "Currencies", unit: "rate" },
  { id: "DEXJPUS", name: "USD / JPY Exchange Rate", category: "Currencies", unit: "rate" },
  { id: "DEXCHUS", name: "USD / CNY Exchange Rate", category: "Currencies", unit: "rate" }
];

async function fetchSeries(series) {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=10`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[WARN] FRED series ${series.id} returned HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    const obs = (json.observations || []).filter(o => o.value !== "." && o.value !== undefined);
    if (obs.length === 0) return null;

    const latestVal = parseFloat(obs[0].value);
    const prevVal = obs.length > 1 ? parseFloat(obs[1].value) : latestVal;
    const change = latestVal - prevVal;
    const pctChange = prevVal !== 0 ? (change / prevVal) * 100 : 0;

    // Qualitative Regime Assessment
    let assessment = "NORMAL";
    if (series.id === "T10Y2Y") {
      assessment = latestVal < 0 ? "INVERTED (RECESSION RISK)" : "NORMALIZING";
    } else if (series.id === "BAMLH0A0HYM2") {
      assessment = latestVal > 4.5 ? "STRESSED / ELEVATED" : (latestVal < 3.0 ? "COMPLACENT / TIGHT" : "MODERATE");
    } else if (series.id === "NFCI" || series.id === "STLFSI4") {
      assessment = latestVal > 0 ? "TIGHTENING / ELEVATED" : "ACCOMMODATIVE";
    } else if (series.id === "VIXCLS") {
      assessment = latestVal > 25 ? "ELEVATED FEAR" : (latestVal > 18 ? "HEIGHTENED" : "SUBDUED / CALM");
    } else if (series.id.startsWith("DCOIL")) {
      assessment = latestVal > 90 ? "ELEVATED (WAR PREMIUM)" : "STABLE";
    }

    return {
      id: series.id,
      name: series.name,
      category: series.category,
      unit: series.unit,
      value: Math.round(latestVal * 100) / 100,
      previousValue: Math.round(prevVal * 100) / 100,
      change: Math.round(change * 100) / 100,
      pctChange: Math.round(pctChange * 10) / 10,
      date: obs[0].date,
      assessment
    };
  } catch (err) {
    console.warn(`[WARN] Failed to fetch series ${series.id}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log(`[INFO] Fetching macroeconomic & financial stability surveillance metrics...`);

  const results = await Promise.allSettled(SERIES_CONFIG.map(fetchSeries));
  const metrics = [];

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      metrics.push(r.value);
    }
  }

  console.log(`[INFO] Successfully ingested ${metrics.length} financial & commodities metrics`);

  if (!existsSync("data")) {
    mkdirSync("data", { recursive: true });
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    metricsCount: metrics.length,
    metrics
  };

  writeFileSync("data/economic.json", JSON.stringify(payload, null, 2));
  console.log(`[SUCCESS] Wrote data/economic.json (${metrics.length} metrics)`);
}

main().catch(err => {
  console.error("[FATAL] Economic surveillance fetch failed:", err);
  process.exit(1);
});
