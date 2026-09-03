export const CATEGORIES = {
  "ukraine-eur": {
    label: "Eastern Europe / Ukraine",
    shortLabel: "EUR / UKR",
    color: "#fbbf24",
    keywords: [
      "ukraine", "kyiv", "kiev", "zelenskyy", "zelensky", "crimea", "donbas", "kharkiv",
      "odesa", "ukrainian", "russia", "putin", "moscow", "kremlin", "russian", "kursk",
      "zaporizhzhia", "black sea", "belarus", "baltic", "poland", "nato eastern flank"
    ]
  },
  "middle-east": {
    label: "Middle East & Levant",
    shortLabel: "MIDEAST",
    color: "#f97316",
    keywords: [
      "gaza", "israel", "hamas", "hezbollah", "iran", "syria", "yemen", "houthi",
      "netanyahu", "palestinian", "west bank", "tehran", "idf", "lebanon", "beirut",
      "iraq", "baghdad", "damascus", "persian gulf", "strait of hormuz", "red sea",
      "bab el-mandeb", "saudi", "qatar", "uae", "mossad", "irgc"
    ]
  },
  "indo-pacific": {
    label: "Indo-Pacific & China",
    shortLabel: "INDO-PAC",
    color: "#ef4444",
    keywords: [
      "china", "beijing", "xi jinping", "taiwan", "taipei", "south china sea", "pla",
      "plan", "chinese", "hong kong", "philippines", "manila", "north korea", "pyongyang",
      "kim jong", "south korea", "seoul", "japan", "tokyo", "aukus", "quad", "indo-pacific"
    ]
  },
  "defense-tech": {
    label: "Defense & Weapons",
    shortLabel: "DEFENSE",
    color: "#a855f7",
    keywords: [
      "pentagon", "nato", "air defense", "patriot", "himars", "hypersonic", "missile",
      "drone", "uav", "f-35", "aircraft carrier", "warship", "submarine", "artillery",
      "ammunition", "lockheed", "raytheon", "general dynamics", "darpa", "procurement",
      "weapons", "nuclear", "warhead", "intercontinental", "usni", "armed forces"
    ]
  },
  "maritime": {
    label: "Maritime & Chokepoints",
    shortLabel: "MARITIME",
    color: "#06b6d4",
    keywords: [
      "naval", "navy", "warship", "destroyer", "frigate", "carrier strike group",
      "chokepoint", "red sea", "suez", "bab el-mandeb", "strait of hormuz", "taiwan strait",
      "south china sea", "baltic sea", "black sea", "tanker", "cargo ship", "usni"
    ]
  },
  "cyber-space": {
    label: "Cyber & Electronic Warfare",
    shortLabel: "CYBER / EW",
    color: "#3b82f6",
    keywords: [
      "cyber", "cyberattack", "malware", "ransomware", "espionage", "satellite",
      "gps jamming", "electronic warfare", "cisa", "nsa", "critical infrastructure",
      "space force", "anti-satellite", "asat", "intelligence agency", "sigint"
    ]
  },
  "americas": {
    label: "Americas & Strategy",
    shortLabel: "AMERICAS",
    color: "#10b981",
    keywords: [
      "white house", "congress", "senate", "state department", "executive order",
      "sanctions", "cia", "fbi", "homeland security", "norad", "southcom", "northcom",
      "latin america", "venezuela", "cuba", "mexico", "border security"
    ]
  },
  "africa-sahel": {
    label: "Africa & Sahel",
    shortLabel: "AFRICA",
    color: "#84cc16",
    keywords: [
      "sudan", "khartoum", "sahel", "mali", "niger", "burkina faso", "somalia",
      "al-shabaab", "congo", "drc", "ethiopia", "wagner", "africa corps", "chad"
    ]
  },
  "energy-trade": {
    label: "Strategic Energy & Trade",
    shortLabel: "ENERGY / TRADE",
    color: "#eab308",
    keywords: [
      "crude oil", "brent", "lng", "natural gas", "pipeline", "opec", "sanctions",
      "embargo", "rare earth", "semiconductors", "lithium", "uranium", "supply chain"
    ]
  }
};

export const SOURCE_TYPES = {
  "Defense One": "DEFENSE / TECH",
  "Breaking Defense": "DEFENSE / TECH",
  "Defense News": "DEFENSE / PROCUREMENT",
  "The War Zone": "DEFENSE / AVIATION",
  "USNI News": "NAVAL / MARITIME",
  "Naval News": "NAVAL / MARITIME",
  "UK Defense Journal": "DEFENSE / ALLIES",
  "War on the Rocks": "STRATEGIC ANALYSIS",
  "Times of Israel": "REGIONAL WIRE",
  "BBC": "GLOBAL WIRE",
  "Al Jazeera": "GLOBAL WIRE",
  "DW World": "GLOBAL WIRE",
  "France 24": "GLOBAL WIRE",
  "Reuters": "GLOBAL WIRE",
  "The Guardian": "GLOBAL WIRE"
};

export function categorizeArticle(title, description = "") {
  const text = `${title} ${description}`.toLowerCase();
  const matched = [];

  for (const [key, cat] of Object.entries(CATEGORIES)) {
    for (const keyword of cat.keywords) {
      if (text.includes(keyword)) {
        matched.push(key);
        break;
      }
    }
  }

  return matched.length > 0 ? matched : ["global-security"];
}
