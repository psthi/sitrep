    import { readFileSync, writeFileSync, existsSync } from "fs";            
                                                                             
    async function main() {                                                  
      const apiKey = process.env.OPENAI_API_KEY;                             
      if (!apiKey) {                                                         
        console.log("No OPENAI_API_KEY set — skipping briefing generation"); 
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
                                                                             
      const prompt = `You are a geopolitical analyst writing a daily         
  intelligence briefing. Based on these top headlines, write a concise 3-    
  paragraph morning briefing covering the most significant developments. Be  
  factual, analytical, and direct. No fluff.                                 
  \n\nHeadlines:\n${headlines}\n\nAlso provide the top 5 stories with a one- 
  sentence significance note for each.\n\nRespond in JSON format:\n{\n       
  "summary": "Three paragraph briefing...",\n  "topStories": [\n    {        
  "headline": "...", "significance": "..." }\n  ]\n}`;                       
                                                                             
      // For OpenAI: "https://api.openai.com/v1/chat/completions" (model:    
  "gpt-4o-mini" or "gpt-4o")                                                 
      // For Groq:   "https://api.groq.com/openai/v1/chat/completions"       
  (model: "llama-3.3-70b-versatile")                                         
      // For DeepSeek: "https://api.deepseek.com/chat/completions" (model:   
  "deepseek-chat")                                                           
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",                                                      
        headers: {                                                           
          "Content-Type": "application/json",                                
          "Authorization": `Bearer ${apiKey}`,                               
        },                                                                   
        body: JSON.stringify({                                               
          model: "gpt-4o-mini",                                              
          response_format: { type: "json_object" }, // Enforces clean JSON   
          messages: [                                                        
            { role: "system", content: "You are a helpful analyst that       
  outputs JSON." },                                                          
            { role: "user", content: prompt }                                
          ],                                                                 
        }),                                                                  
      });                                                                    
                                                                             
      if (!res.ok) {                                                         
        console.error(`LLM API error: ${res.status} ${await res.text()}`);   
        return;                                                              
      }                                                                      
                                                                             
      const data = await res.json();                                         
      const text = data.choices[0].message.content;                          
                                                                             
      const briefing = JSON.parse(text);                                     
      briefing.date = new Date().toISOString().split("T")[0];                
      briefing.generatedAt = new Date().toISOString();                       
                                                                             
      writeFileSync("data/briefing.json", JSON.stringify(briefing, null, 2));
      console.log("Wrote data/briefing.json");                               
    }                                                                        
                                                                             
    main().catch((err) => {                                                  
      console.error("Briefing generation failed:", err.message);             
    });  
