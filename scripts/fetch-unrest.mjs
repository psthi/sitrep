import { writeFileSync, existsSync, mkdirSync } from "fs";

const ACLED_API_KEY = process.env.ACLED_API_KEY || "";
const ACLED_EMAIL = process.env.ACLED_EMAIL || "";

async function fetchAcled() {
  if (!ACLED_API_KEY || !ACLED_EMAIL) {
    console.warn("[WARN] ACLED credentials missing. Skipping ACLED collection.");
    return [];
  }

  const daysBack = 3;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startDateStr = startDate.toISOString().split("T")[0];

  const url = new URL("https://acleddata.com/api/acled/read");
  url.searchParams.append("key", ACLED_API_KEY);
  url.searchParams.append("email", ACLED_EMAIL);
  url.searchParams.append("country", "United States");
  url.searchParams.append("event_date", startDateStr);
  url.searchParams.append("event_date_where", ">=");
  url.searchParams.append("limit", "50");
  url.searchParams.append("event_type", "Protests,Riots,Strategic developments");

  try {
    const res = await fetch(url.toString(), { timeout: 15000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    return (data.data || []).map(item => {
      const actors = [item.actor1, item.actor2].filter(Boolean);
      return {
        source: "ACLED",
        event_time: item.event_date ? new Date(item.event_date).toISOString() : new Date().toISOString(),
        title_or_type: `${item.event_type} (${item.sub_event_type || 'N/A'})`,
        location: `${item.location || ''}, ${item.admin1 || ''}, ${item.country || ''}`,
        latitude: item.latitude ? parseFloat(item.latitude) : null,
        longitude: item.longitude ? parseFloat(item.longitude) : null,
        actors,
        fatalities_or_volume: parseInt(item.fatalities || 0, 10),
        raw_url_or_id: String(item.data_id || ''),
        summary: item.notes || ""
      };
    });
  } catch (err) {
    console.error("[ERROR] Failed to query ACLED:", err.message);
    return [];
  }
}

async function fetchGdelt() {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.append("query", '(protest OR "civil unrest" OR riot OR curfew) sourcecountry:US');
  url.searchParams.append("mode", "artlist");
  url.searchParams.append("maxrecords", "50");
  url.searchParams.append("timespan", "24h");
  url.searchParams.append("format", "json");
  url.searchParams.append("sort", "date_desc");

  try {
    const res = await fetch(url.toString(), {
      timeout: 15000,
      headers: {
        "User-Agent": "OSINTRapidMonitor/1.0 (Research Pipeline)"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    return (data.articles || []).map(article => {
      // GDELT seendate format: YYYYMMDDTHHMMSSZ
      let event_time = new Date();
      if (article.seendate) {
        const t = article.seendate;
        const iso = `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}T${t.slice(9,11)}:${t.slice(11,13)}:${t.slice(13,15)}Z`;
        event_time = new Date(iso);
        if (isNaN(event_time.getTime())) event_time = new Date();
      }

      return {
        source: "GDELT_DOC",
        event_time: event_time.toISOString(),
        title_or_type: "Media Escalation / Coverage Event",
        location: `${article.sourcecountry || 'US'} (Media Source)`,
        latitude: null,
        longitude: null,
        actors: [article.domain || "Unknown Source"],
        fatalities_or_volume: 0,
        raw_url_or_id: article.url || "",
        summary: article.title || ""
      };
    });
  } catch (err) {
    console.error("[ERROR] Failed to query GDELT:", err.message);
    return [];
  }
}

async function main() {
  console.log("[INFO] Beginning unrest ingestion from ACLED and GDELT...");
  
  const [acledData, gdeltData] = await Promise.all([
    fetchAcled(),
    fetchGdelt()
  ]);

  const allSignals = [...acledData, ...gdeltData];
  allSignals.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());

  console.log(`\n--- INGESTION SUMMARY ---`);
  console.log(`Total aggregated signals: ${allSignals.length}\n`);

  if (!existsSync("data")) {
    mkdirSync("data", { recursive: true });
  }

  // Fallback to previous data if APIs failed (e.g. Rate Limit 429)
  if (allSignals.length === 0 && existsSync("data/unrest.json")) {
    console.log("[WARN] APIs returned 0 signals. Retaining previous unrest data.");
    return; // Don't overwrite with empty
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    signalCount: allSignals.length,
    signals: allSignals
  };

  writeFileSync("data/unrest.json", JSON.stringify(payload, null, 2));
  console.log(`[SUCCESS] Output written to data/unrest.json (${allSignals.length} signals)`);
}

main().catch(err => {
  console.error("[FATAL] Unrest ingestion encountered an error:", err);
  process.exit(1);
});
