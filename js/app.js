// ========== SITREP COMMAND CENTER FRONTEND ==========

const CATEGORIES = {
  "all": { label: "🌐 All Theaters", shortLabel: "ALL", color: "#58a6ff" },
  "unrest": { label: "🔥 Civil Unrest", shortLabel: "UNREST", color: "#f59f00" },
  "ukraine-eur": { label: "🇺🇦 Eastern Europe / Ukraine", shortLabel: "EUR / UKR", color: "#fbbf24" },
  "middle-east": { label: "🇵🇸 Middle East & Levant", shortLabel: "MIDEAST", color: "#f97316" },
  "indo-pacific": { label: "🇨🇳 Indo-Pacific & China", shortLabel: "INDO-PAC", color: "#ef4444" },
  "defense-tech": { label: "🛡️ Defense & Weapons", shortLabel: "DEFENSE", color: "#a855f7" },
  "maritime": { label: "⚓ Maritime & Chokepoints", shortLabel: "MARITIME", color: "#06b6d4" },
  "cyber-space": { label: "🛰️ Cyber & EW", shortLabel: "CYBER", color: "#3b82f6" },
  "americas": { label: "🇺🇸 Americas & Strategy", shortLabel: "AMERICAS", color: "#10b981" },
  "africa-sahel": { label: "🌍 Africa & Sahel", shortLabel: "AFRICA", color: "#84cc16" },
  "energy-trade": { label: "⚡ Energy & Trade", shortLabel: "ENERGY", color: "#eab308" }
};

const STATUS_CLASSES = {
  "CRITICAL": "status-critical",
  "HIGH": "status-high",
  "ELEVATED": "status-elevated",
  "GUARDED": "status-guarded",
  "MODERATE": "status-moderate",
  "LOW": "status-moderate"
};

let allArticles = [];
let activeCategory = "all";
let activeSourceType = "all";
let activeTimeFilter = 24; // default hours
let searchQuery = "";

// ========== INITIALIZATION ==========
document.addEventListener("DOMContentLoaded", () => {
  initClocks();
  initSearch();
  initControls();
  fetchIntelligence();

  // Auto-refresh every 5 minutes
  setInterval(fetchIntelligence, 5 * 60 * 1000);
});

// ========== CLOCKS ==========
function initClocks() {
  const utcEl = document.getElementById("utc-clock");
  const localEl = document.getElementById("local-clock");

  function tick() {
    const now = new Date();
    if (utcEl) utcEl.textContent = now.toISOString().slice(11, 19);
    if (localEl) {
      localEl.textContent = now.toLocaleTimeString([], { hour12: false });
    }
  }

  tick();
  setInterval(tick, 1000);
}

// ========== SEARCH ==========
function initSearch() {
  const input = document.getElementById("search-input");
  if (!input) return;

  input.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderFeed();
    updateArticleCount();
  });
}

// ========== CONTROLS ==========
function initControls() {
  // Source Type Pills
  document.querySelectorAll(".type-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".type-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeSourceType = btn.dataset.type;
      renderFeed();
      updateArticleCount();
    });
  });

  // Time Horizon Buttons
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
}

// ========== FETCH DATA ==========
async function fetchIntelligence() {
  const cacheBuster = Date.now();

  // Fetch News Feed
  try {
    const res = await fetch(`data/news.json?t=${cacheBuster}`);
    if (res.ok) {
      const data = await res.json();
      allArticles = data.articles || [];
      updateLastUpdated(data.updatedAt);
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    console.error("Failed to fetch news.json:", err);
    document.getElementById("feed").innerHTML =
      '<div class="empty-state">SIGNAL LOSS -- RE-ESTABLISHING INGESTION STREAM...</div>';
  }

  // Fetch Unrest Feed and append to allArticles
  try {
    const res = await fetch(`data/unrest.json?t=${cacheBuster}`);
    if (res.ok) {
      const unrestData = await res.json();
      const unrestArticles = (unrestData.signals || []).map(s => ({
        title: s.summary || s.title_or_type,
        snippet: `Location: ${s.location} | Actors: ${(s.actors || []).join(", ")}`,
        source: s.source,
        sourceType: "CIVIL UNREST",
        url: s.raw_url_or_id || "#",
        publishedAt: s.event_time,
        categories: ["all", "unrest"] // added "unrest" category
      }));
      allArticles = allArticles.concat(unrestArticles);
      // Sort by date descending
      allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }
  } catch (err) {
    console.warn("No active unrest.json available:", err.message);
  }

  // Once news and unrest are loaded, render feed
  renderFilters();
  renderFeed();
  renderSidebar();
  updateArticleCount();

  // Fetch AI Briefing
  try {
    const res = await fetch(`data/briefing.json?t=${cacheBuster}`);
    if (res.ok) {
      const briefing = await res.json();
      renderBriefing(briefing);
      renderThreatMatrixBar(briefing);
    }
  } catch (err) {
    console.warn("No active briefing.json available:", err.message);
  }

  // Fetch Macroeconomic Surveillance
  try {
    const res = await fetch(`data/economic.json?t=${cacheBuster}`);
    if (res.ok) {
      const econData = await res.json();
      renderEconomicBar(econData);
    }
  } catch (err) {
    console.warn("No active economic.json available:", err.message);
  }
}

// ========== RENDER GEOECONOMIC SURVEILLANCE BAR ==========
function renderEconomicBar(econData) {
  const bar = document.getElementById("economic-bar");
  const container = document.getElementById("econ-ticker-items");
  if (!bar || !container) return;

  if (!econData || !econData.metrics || econData.metrics.length === 0) {
    bar.style.display = "none";
    return;
  }

  bar.style.display = "flex";
  container.innerHTML = econData.metrics.map(m => {
    const changeSign = m.change > 0 ? "+" : "";
    const changeText = m.change !== 0 ? `(${changeSign}${m.change})` : "";
    const prefix = (m.unit && m.unit.startsWith("$")) ? "$" : "";
    const suffix = m.unit === "%" ? "%" : "";

    return `
      <div class="econ-item" title="${escapeHtml(m.category)}: ${escapeHtml(m.assessment)} (as of ${m.date})">
        <span class="econ-name">${escapeHtml(m.name)}:</span>
        <span class="econ-val">${prefix}${m.value}${suffix}</span>
        ${changeText ? `<span class="econ-change">${changeText}</span>` : ""}
        <span class="econ-tag">${escapeHtml(m.assessment)}</span>
      </div>
    `;
  }).join("");
}

// ========== RENDER THREAT MATRIX TOP BAR ==========
function renderThreatMatrixBar(briefing) {
  const bar = document.getElementById("threat-matrix-bar");
  if (!bar) return;

  if (!briefing || !briefing.threatMatrix || briefing.threatMatrix.length === 0) {
    bar.style.display = "none";
    return;
  }

  bar.style.display = "flex";
  bar.innerHTML = briefing.threatMatrix.map(t => {
    const statusClass = STATUS_CLASSES[t.status] || "status-guarded";
    return `
      <div class="threat-pill" title="${escapeHtml(t.summary || '')}">
        <span class="threat-pill-name">${escapeHtml(t.theater)}</span>
        <span class="threat-pill-badge badge-tag ${statusClass}">${escapeHtml(t.status)}</span>
      </div>
    `;
  }).join("");
}

// ========== RENDER BRIEFING ==========
function renderBriefing(briefing) {
  const section = document.getElementById("briefing-section");
  if (!briefing || (!briefing.bluf && !briefing.summary && !briefing.operationalSummary)) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  // Date
  const dateEl = document.getElementById("briefing-date");
  if (dateEl && briefing.date) {
    dateEl.textContent = `DATE: ${briefing.date} ${briefing.generatedAt ? `(${formatTimeAgo((Date.now() - new Date(briefing.generatedAt).getTime()) / 3600000)})` : ""}`;
  }

  // BLUF
  const blufEl = document.getElementById("bluf-text");
  if (blufEl) {
    blufEl.textContent = briefing.bluf || (typeof briefing.summary === "string" ? briefing.summary.split("\n\n")[0] : "Intelligence assessment synchronized.");
  }

  // Theater Grid
  const theaterGrid = document.getElementById("theaters-grid");
  if (theaterGrid && briefing.threatMatrix) {
    theaterGrid.innerHTML = briefing.threatMatrix.map(t => {
      const statusClass = STATUS_CLASSES[t.status] || "status-guarded";
      return `
        <div class="theater-card">
          <div class="theater-card-header">
            <span class="theater-card-name">${escapeHtml(t.theater)}</span>
            <span class="theater-card-status badge-tag ${statusClass}">${escapeHtml(t.status)}</span>
          </div>
          ${t.trend ? `<div class="theater-card-trend">TREND: ${escapeHtml(t.trend)}</div>` : ""}
          <div class="theater-card-summary">${escapeHtml(t.summary)}</div>
        </div>
      `;
    }).join("");
  }

  // Civilian & Household Impact (What This Means For You)
  const householdBlock = document.getElementById("household-block");
  const householdGrid = document.getElementById("household-grid");
  if (householdBlock && householdGrid) {
    if (briefing.householdImpact) {
      householdBlock.style.display = "block";
      const h = briefing.householdImpact;
      const cards = [];

      if (h.energyAndFuel) {
        cards.push(`
          <div class="household-card">
            <div class="household-card-header">
              <span class="household-card-icon">⛽</span>
              <span>Gas Pump & Energy Bills</span>
            </div>
            <p class="household-card-desc">${escapeHtml(h.energyAndFuel)}</p>
          </div>
        `);
      }
      if (h.borrowingAndMortgages) {
        cards.push(`
          <div class="household-card">
            <div class="household-card-header">
              <span class="household-card-icon">🏠</span>
              <span>Mortgages, Loans & Debt</span>
            </div>
            <p class="household-card-desc">${escapeHtml(h.borrowingAndMortgages)}</p>
          </div>
        `);
      }
      if (h.groceriesAndSupplyChain) {
        cards.push(`
          <div class="household-card">
            <div class="household-card-header">
              <span class="household-card-icon">🛒</span>
              <span>Groceries & Supermarket Prices</span>
            </div>
            <p class="household-card-desc">${escapeHtml(h.groceriesAndSupplyChain)}</p>
          </div>
        `);
      }
      if (h.jobsAndSavings) {
        cards.push(`
          <div class="household-card">
            <div class="household-card-header">
              <span class="household-card-icon">💼</span>
              <span>Job Security & 401(k) Savings</span>
            </div>
            <p class="household-card-desc">${escapeHtml(h.jobsAndSavings)}</p>
          </div>
        `);
      }

      householdGrid.innerHTML = cards.join("");
    } else {
      householdBlock.style.display = "none";
    }
  }

  // Summary Paragraphs
  const summaryEl = document.getElementById("summary-paragraphs");
  if (summaryEl) {
    const paras = Array.isArray(briefing.operationalSummary)
      ? briefing.operationalSummary
      : (typeof briefing.summary === "string" ? briefing.summary.split("\n\n") : []);

    summaryEl.innerHTML = paras.map(p => `<p>${escapeHtml(p)}</p>`).join("");
  }

  // Key Developments
  const devGrid = document.getElementById("developments-grid");
  const devBlock = document.getElementById("developments-block");
  const stories = briefing.keyDevelopments || briefing.topStories || [];

  if (devGrid && stories.length > 0) {
    if (devBlock) devBlock.style.display = "block";
    devGrid.innerHTML = stories.map(s => `
      <div class="dev-card">
        <div class="dev-header">
          <span class="dev-theater">${escapeHtml(s.theater || "GLOBAL INTEL")}</span>
        </div>
        <div class="dev-headline">${escapeHtml(s.headline)}</div>
        <div class="dev-significance">${escapeHtml(s.significance)}</div>
        ${s.impact || s.tacticalImpact ? `<div class="dev-impact">IMPACT: ${escapeHtml(s.impact || s.tacticalImpact)}</div>` : ""}
      </div>
    `).join("");
  } else if (devBlock) {
    devBlock.style.display = "none";
  }

  // Indicators & Warnings
  const iwBlock = document.getElementById("iw-block");
  const iwList = document.getElementById("iw-list");
  const warnings = briefing.indicatorsAndWarnings || [];

  if (iwList && warnings.length > 0) {
    if (iwBlock) iwBlock.style.display = "block";
    iwList.innerHTML = warnings.map(w => `<li class="iw-item">${escapeHtml(w)}</li>`).join("");
  } else if (iwBlock) {
    iwBlock.style.display = "none";
  }

  // Toggle Collapse Logic
  const header = document.getElementById("briefing-header");
  const body = document.getElementById("briefing-body");
  const toggleBtn = document.getElementById("briefing-toggle-btn");

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

// ========== FILTERING LOGIC ==========
function getFilteredArticles() {
  const cutoff = Date.now() - (activeTimeFilter * 60 * 60 * 1000);
  
  return allArticles.filter(a => {
    // Time filter
    const pubTime = new Date(a.publishedAt).getTime();
    if (pubTime < cutoff) return false;

    // Category filter
    if (activeCategory !== "all" && !a.categories.includes(activeCategory)) {
      return false;
    }

    // Source Type filter
    if (activeSourceType !== "all") {
      const srcType = (a.sourceType || "").toUpperCase();
      if (!srcType.includes(activeSourceType.toUpperCase())) {
        return false;
      }
    }

    // Search query filter
    if (searchQuery) {
      const matchTitle = a.title.toLowerCase().includes(searchQuery);
      const matchSnippet = (a.snippet || "").toLowerCase().includes(searchQuery);
      const matchSource = a.source.toLowerCase().includes(searchQuery);
      if (!matchTitle && !matchSnippet && !matchSource) return false;
    }

    return true;
  });
}

// ========== RENDER CATEGORY PILLS ==========
function renderFilters() {
  const container = document.getElementById("category-filters");
  if (!container) return;

  const cutoff = Date.now() - (activeTimeFilter * 60 * 60 * 1000);
  const timeFiltered = allArticles.filter(a => new Date(a.publishedAt).getTime() > cutoff);

  const counts = {};
  for (const a of timeFiltered) {
    for (const cat of a.categories) {
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }

  container.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const count = key === "all" ? timeFiltered.length : (counts[key] || 0);
    if (key !== "all" && count === 0) return "";
    const isActive = activeCategory === key ? "active" : "";
    return `
      <button class="filter-pill ${isActive}" data-cat="${key}">
        ${cat.label} <span class="count">${count}</span>
      </button>
    `;
  }).join("");

  container.querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderFilters();
      renderFeed();
      renderSidebar();
      updateArticleCount();
    });
  });
}

// ========== RENDER FEED ==========
function renderFeed() {
  const container = document.getElementById("feed");
  const filtered = getFilteredArticles();

  const labelEl = document.getElementById("active-filter-label");
  if (labelEl) {
    const catName = CATEGORIES[activeCategory]?.label || "ALL THEATERS";
    labelEl.textContent = `${catName.toUpperCase()} • PAST ${activeTimeFilter}H • ${activeSourceType.toUpperCase()} SOURCES`;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">NO VERIFIED SIGNALS MATCHING CURRENT FILTER PARAMETERS</div>';
    return;
  }

  container.innerHTML = filtered.map(a => {
    const now = Date.now();
    const pubTime = new Date(a.publishedAt).getTime();
    const hoursAgo = (now - pubTime) / 3600000;
    const isBreaking = hoursAgo < 1.5;

    const timeStr = formatTimeAgo(hoursAgo);

    const tags = a.categories.map(cat => {
      const catInfo = CATEGORIES[cat] || { label: cat, color: "#8b949e" };
      return `<span class="cat-tag" style="background: ${catInfo.color}15; color: ${catInfo.color}; border: 1px solid ${catInfo.color}40">${catInfo.label}</span>`;
    }).join("");

    return `
      <article class="signal-card ${isBreaking ? "breaking" : ""}">
        <div class="card-top">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span class="source-badge">${escapeHtml(a.source)}</span>
            <span class="type-badge">${escapeHtml(a.sourceType || "WIRE")}</span>
            ${isBreaking ? '<span class="breaking-tag"><span class="radar-dot" style="width:5px;height:5px;"></span> BREAKING</span>' : ""}
          </div>
          <span class="card-time">${timeStr}</span>
        </div>
        <a href="${a.url}" target="_blank" rel="noopener noreferrer" class="card-title">${escapeHtml(a.title)}</a>
        ${a.snippet ? `<p class="card-snippet">${escapeHtml(a.snippet)}</p>` : ""}
        <div class="card-tags">${tags}</div>
      </article>
    `;
  }).join("");
}

// ========== RENDER SIDEBAR ==========
function renderSidebar() {
  const cutoff = Date.now() - (activeTimeFilter * 60 * 60 * 1000);
  const timeFiltered = allArticles.filter(a => new Date(a.publishedAt).getTime() > cutoff);

  // Theaters
  const theaterList = document.getElementById("theater-stat-list");
  const theaterTotal = document.getElementById("theater-total-count");
  if (theaterList) {
    const counts = {};
    for (const a of timeFiltered) {
      for (const cat of a.categories) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }

    const sortedTheaters = Object.entries(CATEGORIES)
      .filter(([k]) => k !== "all")
      .map(([k, cat]) => ({ key: k, label: cat.label, count: counts[k] || 0 }))
      .sort((a, b) => b.count - a.count);

    if (theaterTotal) theaterTotal.textContent = `${sortedTheaters.filter(t => t.count > 0).length} ACTIVE`;

    theaterList.innerHTML = sortedTheaters.map(t => `
      <li class="stat-item ${activeCategory === t.key ? "active" : ""}" data-cat="${t.key}">
        <span>${t.label}</span>
        <span class="stat-count">${t.count}</span>
      </li>
    `).join("");

    theaterList.querySelectorAll(".stat-item").forEach(item => {
      item.addEventListener("click", () => {
        activeCategory = item.dataset.cat === activeCategory ? "all" : item.dataset.cat;
        renderFilters();
        renderFeed();
        renderSidebar();
        updateArticleCount();
      });
    });
  }

  // Sources
  const sourceList = document.getElementById("source-stat-list");
  const sourceTotal = document.getElementById("source-total-count");
  if (sourceList) {
    const srcCounts = {};
    for (const a of timeFiltered) {
      srcCounts[a.source] = (srcCounts[a.source] || 0) + 1;
    }

    const sortedSources = Object.entries(srcCounts).sort((a, b) => b[1] - a[1]);
    if (sourceTotal) sourceTotal.textContent = `${sortedSources.length} OUTLETS`;

    sourceList.innerHTML = sortedSources.map(([src, count]) => `
      <li class="stat-item">
        <span>${escapeHtml(src)}</span>
        <span class="stat-count">${count}</span>
      </li>
    `).join("");
  }
}

// ========== HELPERS ==========
function updateLastUpdated(isoStr) {
  const el = document.getElementById("last-updated");
  if (!el || !isoStr) return;

  const mins = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
  if (mins < 1) el.textContent = "SYNCHRONIZED: JUST NOW";
  else if (mins < 60) el.textContent = `SYNC: ${mins}M AGO`;
  else el.textContent = `SYNC: ${Math.floor(mins / 60)}H AGO`;
}

function updateArticleCount() {
  const el = document.getElementById("article-count");
  if (!el) return;
  const filtered = getFilteredArticles();
  el.textContent = `${filtered.length} SIGNALS`;
}

function formatTimeAgo(hours) {
  if (hours < 0.0167) return "JUST NOW";
  if (hours < 1) return `${Math.floor(hours * 60)}M AGO`;
  if (hours < 24) return `${Math.floor(hours)}H AGO`;
  return `${Math.floor(hours / 24)}D AGO`;
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
