# SITREP // Strategic Defense & Geopolitical Intelligence Command Center

[![Fetch News](https://github.com/psthi/sitrep/actions/workflows/fetch-news.yml/badge.svg)](https://github.com/psthi/sitrep/actions/workflows/fetch-news.yml)
[![Live Dashboard](https://img.shields.io/badge/Live-Command_Dashboard-00d26a?style=flat&logo=github)](https://psthi.github.io/sitrep/)
[![Classification](https://img.shields.io/badge/Classification-UNCLASSIFIED_%2F%2F_OSINT-58a6ff?style=flat)](#)
[![Cycle](https://img.shields.io/badge/Cycle-30_Minutes-orange?style=flat)](#)

An autonomous, defense-grade **Situation Report (SITREP)** dashboard and multi-channel intelligence broadcast system. Operates 100% serverless via **GitHub Actions** and **GitHub Pages**, continuously synthesizing tactical open-source defense signals, macroeconomic stress indicators, and automated AI analysis for defense analysts and informed citizens.

---

## 🎯 Architecture & Capabilities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. MULTI-SOURCE INGESTION (Every 30 Minutes via GitHub Actions)             │
│    • 18 Defense, Naval, Aerospace & OSINT Feeds                             │
│    • Real-time FRED Macroeconomic & Financial Stability Metrics             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. UNIFIED INTELLIGENCE SYNTHESIS (OpenRouter AI Engine)                    │
│    • BLUF (Bottom Line Up Front)                                            │
│    • 5-Theater Regional Threat Matrix & DEFCON-Style Gauges                 │
│    • Tactical & Strategic Operational Analysis                              │
│    • Indicators & Warnings (I&W for Next 24–72 Hours)                       │
│    • Geoeconomic & Energy Commodity Correlation                             │
└──────────────────┬───────────────────────────────────┬──────────────────────┘
                   │                                   │
                   ▼                                   ▼
┌──────────────────────────────────────┐ ┌────────────────────────────────────┐
│ 3. LIVE WAR-ROOM DASHBOARD           │ │ 4. MULTI-RECIPIENT TELEGRAM ALERTS │
│    • GitHub Pages Web Command Center │ │    • Formatted HTML Intelligence   │
│    • Zulu UTC + Local Combat Clocks  │ │      Dispatches to Multiple Chat   │
│    • Real-Time Search & Filters      │ │      IDs / Channels                │
└──────────────────────────────────────┘ └────────────────────────────────────┘
```

---

## 📡 Intelligence & Defense Data Sources

SITREP ingests, deduplicates, and classifies signals from 18 specialized defense, naval, and global intelligence wires:

### Specialized Defense & Aerospace
- **Defense One**: Technology, Pentagon strategy, and defense procurement.
- **The War Zone (TWZ)**: Aviation, electronic warfare, and tactical hardware.
- **Breaking Defense**: Policy, weapon systems, and military modernization.
- **Defense News**: Global military developments and defense budgets.
- **UK Defense Journal**: NATO alliance defense and European operations.
- **War on the Rocks**: Strategic analysis, grand strategy, and military history.

### Naval & Maritime Chokepoints
- **USNI News (U.S. Naval Institute)**: Global carrier strike group movements and naval operations.
- **Naval News**: Subsurface, surface warfare, and maritime security.

### Global & Regional Wire Coverage
- **Reuters World** & **BBC World** (Global, Middle East, Europe, Asia, Africa)
- **Al Jazeera English** & **Times of Israel**
- **France 24**, **Deutsche Welle (DW)**, and **The Guardian World**

## 🛒 Civilian & Household Impact Layer (Pocketbook Reality)

SITREP bridges the gap between high-level geopolitical intelligence and everyday civilian life. On every run, the AI engine translates complex global events and macroeconomic metrics into 4 actionable takeaways:

- ⛽ **Fuel & Utility Bills**: Translates oil price swings ($/bbl) and energy diplomacy into pump prices and home utility costs.
- 🏠 **Mortgages & Debt**: Explains how Treasury yield spreads and Fed conditions affect mortgage rates, auto loans, and credit cards.
- 🛒 **Groceries & Supply Chains**: Analyzes how maritime chokepoints and trade friction drive supermarket inflation and food supply stability.
- 💼 **Jobs & Retirement Savings**: Assesses how corporate credit conditions and equity volatility (VIX) impact hiring and 401(k) balances.

---

## 📊 Geoeconomic & Financial Stability Surveillance

Integrated directly with the **Federal Reserve Economic Data (FRED)** API to track quantitative systemic stress indicators:

| Indicator | Metric | Strategic Significance |
| :--- | :--- | :--- |
| **`T10Y2Y`** | 10Y–2Y Treasury Yield Spread | Sovereign debt curve dynamics & recession risk |
| **`BAMLH0A0HYM2`** | US High-Yield OAS Spread | Corporate credit distress & market liquidity |
| **`NFCI`** | National Financial Conditions Index | Chicago Fed financial liquidity & systemic stress |
| **`STLFSI4`** | St. Louis Fed Financial Stress Index | Macro volatility & banking market pressure |
| **`VIXCLS`** | CBOE Volatility Index (VIX) | Global equity risk appetite & market fear |
| **`DCOILBRENTEU`** | Brent Crude Oil (`$/bbl`) | Energy chokepoint & geopolitical war premium |
| **`DHHNGSP`** | Henry Hub Natural Gas (`$/MMBtu`) | Strategic European & global heating/power security |
| **`DTWEXBGS`** | Broad US Dollar Index (DXY) | Currency flight-to-safety & dollar liquidity |

---

## 🚀 Quick Setup Guide

### 1. Fork or Clone the Repository
Push this repository to your GitHub account: `https://github.com/psthi/sitrep`.

### 2. Configure GitHub Pages
1. Go to **Settings** → **Pages**.
2. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` • **Folder**: `/(root)`
3. Click **Save**.

### 3. Configure Workflow Permissions
1. Go to **Settings** → **Actions** → **General**.
2. Scroll to **Workflow permissions** and select **Read and write permissions**.
3. Click **Save**.

### 4. Set Repository Secrets (Optional but Recommended)
Go to **Settings** → **Secrets and variables** → **Actions** and add:

| Secret Name | Description | Example |
| :--- | :--- | :--- |
| `OPENROUTER_API_KEY` | OpenRouter API key for intelligence synthesis | `sk-or-v1-...` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token from `@BotFather` | `123456789:ABC...` |
| `TELEGRAM_CHAT_ID` | Single or comma-separated Telegram Chat / Channel IDs | `12345678, -10098765432, @my_channel` |
| `FRED_API_KEY` | (Optional) Custom FRED API Key | `a6ca8edc5...` |

*(Note: If you want to change the OpenRouter model, set `OPENROUTER_MODEL` in `.github/workflows/fetch-news.yml` or add it as a secret, e.g. `z-ai/glm-5.3-flash`, `deepseek/deepseek-chat`, or `anthropic/claude-3.5-sonnet`)*.

### 5. Trigger First Run
1. Navigate to the **Actions** tab.
2. Select **Fetch News** from the sidebar.
3. Click **Run workflow** → **Run workflow**.

---

## ⏰ Cron Schedule

The pipeline runs automatically via GitHub Actions:
```yaml
schedule:
  - cron: '*/30 * * * *' # Executes every 30 minutes, 24/7
```

---

## 💰 Operating Costs (Zero-Cost Infrastructure)

- **GitHub Actions**: 100% Free (Unlimited minutes on public repositories).
- **GitHub Pages Hosting**: 100% Free.
- **RSS & FRED Data Feeds**: 100% Free.
- **OpenRouter AI Synthesis**: ~$0.15–$0.30 per month using flash/mini models.

---

## 💻 Local Development

```bash
# Clone repository
git clone https://github.com/psthi/sitrep.git
cd sitrep

# Install dependencies
npm install

# Test Ingestion Pipeline locally
node scripts/fetch-news.mjs
node scripts/fetch-economic.mjs

# Open Dashboard in Browser
xdg-open index.html # or open in your default browser
```

---

## 📜 License
Released under the [MIT License](LICENSE). Open-source intelligence for public and analytical use.
