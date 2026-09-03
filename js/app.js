const CATEGORIES = {
  "all":           { label: "ALL",                color: "#64748b" },
  "us-politics":   { label: "\u{1f1fa}\u{1f1f8} US POLITICS",    color: "#3b82f6" },
  "ukraine":       { label: "\u{1f1fa}\u{1f1e6} UKRAINE",        color: "#fbbf24" },
  "middle-east":   { label: "\u{1f1f5}\u{1f1f8} MIDDLE EAST",    color: "#f97316" },
  "china":         { label: "\u{1f1e8}\u{1f1f3} CHINA",          color: "#ef4444" },
  "russia":        { label: "\u{1f1f7}\u{1f1fa} RUSSIA",         color: "#a855f7" },
  "europe":        { label: "\u{1f1ea}\u{1f1fa} EUROPE",         color: "#6366f1" },
  "asia":          { label: "\u{1f30f} ASIA-PAC",      color: "#ec4899" },
  "africa":        { label: "\u{1f30d} AFRICA",        color: "#84cc16" },
  "trade-economy": { label: "\u{1f4b0} TRADE",         color: "#10b981" },
  "conflicts":     { label: "\u{2694}\u{fe0f} CONFLICTS",      color: "#f59e0b" },
  "world":         { label: "\u{1f310} WORLD",         color: "#64748b" },
};

const SOURCE_CLASSES = {
  "BBC": "source-bbc",
  "Reuters": "source-reuters",
  "NYT": "source-nyt",
  "Al Jazeera": "source-al-jazeera",
  "Politico": "source-politico",
  "Defense News": "source-defense-news",
};

let allArticles = [];
let activeCategory = "all";
let activeTimeFilter = 24;

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  fetchNews();
  startClock();
  // Auto-refresh every 5 minutes
  setInterval(fetchNews, 5 * 60 * 1000);
});

// ========== FETCH ==========
async function fetchNews() {
  try {
    const res = await fetch("data/news.json?" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allArticles = data.articles || [];
    updateLastUpdated(data.lastUpdated);
    renderFilters();
    renderFeed();
    renderSidebar();
    updateArticleCount();
  } catch (err) {
    console.error("Failed to fetch news:", err);
    document.getElementById("feed").innerHTML =
      '<div class="empty-state">SIGNAL LOST -- RECONNECTING...</div>';
  }

  // Try to fetch briefing
  try {
    const res = await fetch("data/briefing.json?" + Date.now());
    if (res.ok) {
      const briefing = await res.json();
      renderBriefing(briefing);
    }
  } catch (_) {}
}

// ========== RENDER FILTERS ==========
function renderFilters() {
  const container = document.getElementById("category-filters");
  const counts = getCategoryCounts();

  container.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const count = key === "all" ? allArticles.length : (counts[key] || 0);
    if (key !== "all" && count === 0) return "";
    const isActive = activeCategory === key ? "active" : "";
    return `<button class="filter-pill ${isActive}" data-cat="${key}" style="${isActive ? `border-color: ${cat.color}` : ""}">
      ${cat.label} <span class="count">${count}</span>
    </button>`;
  }).join("");

  container.querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderFilters();
      renderFeed();
      updateArticleCount();
    });
  });
}

function getCategoryCounts() {
  const filtered = getTimeFilteredArticles();
  const counts = {};
  for (const a of filtered) {
    for (const cat of a.categories) {
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }
  return counts;
}

// ========== TIME FILTERS ==========
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".time-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTimeFilter = parseInt(btn.dataset.hours);
      renderFilters();
      renderFeed();
      renderSidebar();
      updateArticleCount();
    });
  });
});

function getTimeFilteredArticles() {
  const cutoff = Date.now() - (activeTimeFilter * 60 * 60 * 1000);
  return allArticles.filter(a => new Date(a.publishedAt).getTime() > cutoff);
}

// ========== RENDER FEED ==========
function renderFeed() {
  const container = document.getElementById("feed");
  let articles = getTimeFilteredArticles();

  if (activeCategory !== "all") {
    articles = articles.filter(a => a.categories.includes(activeCategory));
  }

  if (articles.length === 0) {
    container.innerHTML = '<div class="empty-state">NO INTEL MATCHING CURRENT FILTERS</div>';
    return;
  }

  container.innerHTML = articles.map(article => {
    const now = Date.now();
    const pubTime = new Date(article.publishedAt).getTime();
    const hoursAgo = (now - pubTime) / 3600000;
    const isBreaking = hoursAgo < 1;

    const timeStr = formatTimeAgo(hoursAgo);
    const sourceClass = SOURCE_CLASSES[article.source] || "source-default";

    const tags = article.categories.map(cat => {
      const catInfo = CATEGORIES[cat] || CATEGORIES["world"];
      return `<span class="cat-tag" style="background: ${catInfo.color}15; color: ${catInfo.color}; border: 1px solid ${catInfo.color}30">${catInfo.label}</span>`;
    }).join("");

    return `<article class="news-card ${isBreaking ? "breaking" : ""}">
      <div class="card-meta">
        <span class="source-badge ${sourceClass}">${article.source}</span>
        <span class="time-ago">${timeStr}</span>
        ${isBreaking ? '<span class="breaking-badge"><span class="breaking-dot"></span> BREAKING</span>' : ""}
      </div>
      <div class="card-content">
        <a href="${article.url}" target="_blank" rel="noopener" class="card-title">${escapeHtml(article.title)}</a>
        ${article.snippet ? `<p class="card-snippet">${escapeHtml(article.snippet)}</p>` : ""}
        <div class="card-tags">${tags}</div>
      </div>
    </article>`;
  }).join("");
}

// ========== SIDEBAR ==========
function renderSidebar() {
  const articles = getTimeFilteredArticles();

  // Region counts
  const regionList = document.getElementById("region-list");
  if (regionList) {
    const counts = {};
    for (const a of articles) {
      for (const cat of a.categories) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }

    const regions = Object.entries(CATEGORIES)
      .filter(([k]) => k !== "all" && k !== "world")
      .map(([key, cat]) => ({ key, ...cat, count: counts[key] || 0 }))
      .sort((a, b) => b.count - a.count);

    regionList.innerHTML = regions.map(r => `
      <li class="region-item" data-cat="${r.key}">
        <span class="region-name">${r.label}</span>
        <span class="region-count">${r.count}</span>
      </li>
    `).join("");

    regionList.querySelectorAll(".region-item").forEach(item => {
      item.addEventListener("click", () => {
        activeCategory = item.dataset.cat;
        renderFilters();
        renderFeed();
        updateArticleCount();
      });
    });
  }

  // Source counts
  const sourceList = document.getElementById("source-list");
  if (sourceList) {
    const srcCounts = {};
    for (const a of articles) {
      srcCounts[a.source] = (srcCounts[a.source] || 0) + 1;
    }

    const sources = Object.entries(srcCounts).sort((a, b) => b[1] - a[1]);
    sourceList.innerHTML = sources.map(([name, count]) => `
      <li class="source-item">
        <span>${name}</span>
        <span class="src-count">${count}</span>
      </li>
    `).join("");
  }
}

// ========== BRIEFING ==========
function renderBriefing(briefing) {
  const section = document.getElementById("briefing-section");
  if (!briefing || !briefing.summary) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  const body = document.getElementById("briefing-body");
  const toggleBtn = document.getElementById("briefing-toggle-btn") || document.querySelector(".briefing-toggle");
  const header = document.getElementById("briefing-header") || document.getElementById("briefing-toggle");

  const paragraphs = briefing.summary.split("\n\n").filter(Boolean);
  let html = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("");

  if (briefing.topStories && briefing.topStories.length > 0) {
    html += '<div class="briefing-stories"><h3>Key Developments</h3>';
    html += briefing.topStories.map(s =>
      `<div class="briefing-story"><strong>${escapeHtml(s.headline)}</strong> &mdash; <span>${escapeHtml(s.significance)}</span></div>`
    ).join("");
    html += '</div>';
  }

  body.innerHTML = html;
  body.classList.add("open");

  if (toggleBtn) {
    toggleBtn.textContent = "[ COLLAPSE ]";
  }

  if (header && !header.dataset.hasListener) {
    header.dataset.hasListener = "true";
    header.addEventListener("click", () => {
      body.classList.toggle("open");
      if (toggleBtn) {
        toggleBtn.textContent = body.classList.contains("open") ? "[ COLLAPSE ]" : "[ EXPAND ]";
      }
    });
  }
}

// ========== CLOCK ==========
function startClock() {
  const el = document.getElementById("clock");
  if (!el) return;

  function tick() {
    const now = new Date();
    el.textContent = now.toISOString().slice(11, 19);
  }
  tick();
  setInterval(tick, 1000);
}

// ========== HELPERS ==========
function updateLastUpdated(isoStr) {
  const el = document.getElementById("last-updated");
  if (!el || !isoStr) return;

  const mins = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
  if (mins < 1) el.textContent = "UPDATED: JUST NOW";
  else if (mins < 60) el.textContent = `UPDATED: ${mins}m AGO`;
  else el.textContent = `UPDATED: ${Math.floor(mins / 60)}h AGO`;
}

function updateArticleCount() {
  const el = document.getElementById("article-count");
  if (!el) return;
  let articles = getTimeFilteredArticles();
  if (activeCategory !== "all") {
    articles = articles.filter(a => a.categories.includes(activeCategory));
  }
  el.innerHTML = `<strong>${articles.length}</strong> ARTICLES`;
}

function formatTimeAgo(hours) {
  if (hours < 0.0167) return "JUST NOW";
  if (hours < 1) return `${Math.floor(hours * 60)}m`;
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
