import { readFileSync, writeFileSync, existsSync } from "fs";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log("No OPENROUTER_API_KEY set — skipping briefing generation");
    return;
  }

  if (!existsSync("data/news.json")) {
    console.log("No news.json found — skipping briefing");
    return;
  }

  const newsData = JSON.parse(readFileSync("data/news.json", "utf-8"));
  const top20 = newsData.articles.slice(0, 20);

  const headlines = top20
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title}`)
    .join("\n");

  const prompt = `You are a geopolitical analyst writing a daily intelligence briefing. Based on these top headlines, write a concise 3-paragraph morning briefing covering the most significant developments. Be factual, analytical, and direct. No fluff.\n\nHeadlines:\n${headlines}\n\nAlso provide the top 5 stories with a one-sentence significance note for each.\n\nRespond strictly with a valid JSON object in this format:\n{\n  "summary": "Three paragraph briefing...",\n  "topStories": [\n    { "headline": "...", "significance": "..." }\n  ]\n}`;

  const model = process.env.OPENROUTER_MODEL || "z-ai/glm-5.3-flash";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/psthi/sitrep",
      "X-Title": "SITREP News Briefing",
    },
    body: JSON.stringify({
      model: model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a senior geopolitical analyst. Output valid JSON only." },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`OpenRouter API error: ${res.status} ${errText}`);
    return;
  }

  const data = await res.json();
  const text = data.choices[0].message.content;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Could not parse briefing JSON from response:", text);
    return;
  }

  const briefing = JSON.parse(jsonMatch[0]);
  briefing.date = new Date().toISOString().split("T")[0];
  briefing.generatedAt = new Date().toISOString();

  writeFileSync("data/briefing.json", JSON.stringify(briefing, null, 2));
  console.log(`Successfully generated data/briefing.json using ${model}`);
}

main().catch((err) => {
  console.error("Briefing generation failed:", err.message);
});
