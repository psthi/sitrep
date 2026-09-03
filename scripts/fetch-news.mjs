import { XMLParser } from "fast-xml-parser";
import { createHash } from "crypto";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { categorizeArticle, SOURCE_TYPES } from "./categorize.mjs";

const RSS_FEEDS = [
  // Specialized Defense & Military
  { url: "https://www.defenseone.com/rss/all/", source: "Defense One", priority: "high" },
  { url: "https://breakingdefense.com/feed/", source: "Breaking Defense", priority: "high" },
  { url: "https://www.defensenews.com/arc/outboundfeeds/rss/category/global/?outputType=xml", source: "Defense News", priority: "high" },
  { url: "https://www.twz.com/feed", source: "The War Zone", priority: "high" },
  { url: "https://news.usni.org/feed", source: "USNI News", priority: "high" },
  { url: "https://www.navalnews.com/feed/", source: "Naval News", priority: "medium" },
  { url: "https://ukdefencejournal.org.uk/feed/", source: "UK Defense Journal", priority: "medium" },
  { url: "https://warontherocks.com/feed/", source: "War on the Rocks", priority: "medium" },
  
  // Geopolitical & Regional Wire Feeds
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC", priority: "high" },
  { url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", source: "BBC", priority: "high" },
  { url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml", source: "BBC", priority: "high" },
  { url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", source: "BBC", priority: "medium" },
  { url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml", source: "BBC", priority: "medium" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", priority: "high" },
  { url: "https://www.timesofisrael.com/feed/", source: "Times of Israel", priority: "medium" },
  { url: "https://rss.dw.com/rdf/rss-en-all", source: "DW World", priority: "medium" },
  { url: "https://www.france24.com/en/rss", source: "France 24", priority: "medium" },
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian", priority: "medium" }
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function makeId(url) {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function stripHtml(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
}

function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

async function fetchFeed(feed) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SITREP-OSINT-Ingester/2.0",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[WARN] ${feed.source} returned HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const parsed = parser.parse(xml);

    // Handle RSS 2.0 and Atom feeds
    let items = [];
    if (parsed.rss && parsed.rss.channel && parsed.rss.channel.item) {
      items = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];
    } else if (parsed.feed && parsed.feed.entry) {
      items = Array.isArray(parsed.feed.entry)
        ? parsed.feed.entry
        : [parsed.feed.entry];
    } else if (parsed["rdf:RDF"] && parsed["rdf:RDF"].item) {
      items = Array.isArray(parsed["rdf:RDF"].item)
        ? parsed["rdf:RDF"].item
        : [parsed["rdf:RDF"].item];
    }

    return items.map((item) => {
      const title = stripHtml(item.title || "");
      const description = stripHtml(
        item.description || item.summary || item["content:encoded"] || ""
      );
      const url =
        item.link?.["@_href"] ||
        (typeof item.link === "string" ? item.link : "") ||
        item.guid?.["#text"] ||
        (typeof item.guid === "string" ? item.guid : "") ||
        "";
      const pubDate = parseDate(item.pubDate || item.published || item.updated || item["dc:date"]);

      const categories = categorizeArticle(title, description);
      const sourceType = SOURCE_TYPES[feed.source] || "OPEN SOURCE";

      return {
        id: makeId(url || title),
        title,
        snippet: description.slice(0, 240) + (description.length > 240 ? "..." : ""),
        url,
        source: feed.source,
        sourceType,
        priority: feed.priority,
        publishedAt: pubDate.toISOString(),
        categories,
      };
    }).filter((a) => a.title && a.url);
  } catch (err) {
    console.warn(`[WARN] Failed to ingest ${feed.source}: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log(`[INFO] Beginning ingestion from ${RSS_FEEDS.length} defense and intelligence feeds...`);

  const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
  let allArticles = [];

  for (const r of results) {
    if (r.status === "fulfilled") {
      allArticles.push(...r.value);
    }
  }

  console.log(`[INFO] Ingested ${allArticles.length} raw intelligence signals`);

  // Deduplicate by URL and Title similarity
  const seenUrls = new Set();
  const seenTitles = new Set();
  const deduped = [];

  // Sort newest first
  allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  for (const a of allArticles) {
    const normTitle = a.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
    if (!seenUrls.has(a.url) && !seenTitles.has(normTitle)) {
      seenUrls.add(a.url);
      seenTitles.add(normTitle);
      deduped.push(a);
    }
  }

  // Keep past 48 hours, up to 150 items
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recent = deduped
    .filter((a) => new Date(a.publishedAt).getTime() > cutoff)
    .slice(0, 150);

  console.log(`[INFO] Deduplicated to ${recent.length} verified signals`);

  if (!existsSync("data")) {
    mkdirSync("data", { recursive: true });
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    signalCount: recent.length,
    articles: recent,
  };

  writeFileSync("data/news.json", JSON.stringify(payload, null, 2));
  console.log(`[SUCCESS] Output written to data/news.json (${recent.length} articles)`);

  // Daily Archive
  const today = new Date().toISOString().split("T")[0];
  const archiveDir = "data/archive";
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }
  writeFileSync(`${archiveDir}/${today}.json`, JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error("[FATAL] News ingestion encountered an error:", err);
  process.exit(1);
});
