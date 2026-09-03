import { readFileSync, existsSync } from "fs";

async function sendTelegramBriefing() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log("[INFO] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping Telegram dispatch.");
    return;
  }

  if (!existsSync("data/briefing.json")) {
    console.log("[WARN] No data/briefing.json found — skipping Telegram dispatch.");
    return;
  }

  let briefing;
  try {
    briefing = JSON.parse(readFileSync("data/briefing.json", "utf-8"));
  } catch (err) {
    console.error("[ERROR] Failed to parse data/briefing.json:", err.message);
    return;
  }

  // Build Theater Threat Matrix lines
  const threatLines = (briefing.threatMatrix || [])
    .map(t => `• <b>${t.theater}</b>: <code>[${t.status}]</code> ${t.trend ? `<i>(${t.trend})</i>` : ''}`)
    .join("\n");

  // Build Key Developments
  const devLines = (briefing.keyDevelopments || briefing.topStories || []).slice(0, 4)
    .map(d => `▫️ <b>${d.headline}</b>\n   ↳ <i>${d.significance}</i>`)
    .join("\n\n");

  // Build Indicators & Warnings
  const iwLines = (briefing.indicatorsAndWarnings || []).slice(0, 3)
    .map(w => `⚠️ <i>${w}</i>`)
    .join("\n");

  // Format the Telegram message
  const message = `
🎯 <b>SITREP // OPERATIONAL INTELLIGENCE BRIEFING</b>
📅 <i>${briefing.date || new Date().toISOString().split("T")[0]}</i> • <code>UNCLASSIFIED // OSINT</code>

⚡ <b><u>BOTTOM LINE UP FRONT (BLUF)</u>:</b>
${briefing.bluf || briefing.summary || "No active summary available."}

📊 <b><u>REGIONAL THREAT MATRIX</u>:</b>
${threatLines || "• No active threat indicators"}

📍 <b><u>KEY DEVELOPMENTS</u>:</b>
${devLines || "• No active developments listed"}

${iwLines ? `🚨 <b><u>INDICATORS & WARNINGS (24–72H)</u>:</b>\n${iwLines}\n` : ''}
🔗 <a href="https://psthi.github.io/sitrep/">View Live Command Dashboard</a>
`.trim();

  // Send via Telegram Bot API
  console.log(`[INFO] Sending SITREP dispatch to Telegram chat ${chatId}...`);
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[ERROR] Telegram API failed (${res.status}): ${err}`);
  } else {
    console.log("[SUCCESS] SITREP dispatched to Telegram successfully!");
  }
}

sendTelegramBriefing().catch(err => {
  console.error("[FATAL] Telegram dispatch error:", err.message);
});
