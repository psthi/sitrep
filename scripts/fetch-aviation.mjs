import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const API_URL = 'https://opensky-network.org/api/states/all';

async function fetchAviation() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch aviation data: ${res.statusText}`);
    }
    const data = await res.json();
    
    // We can just save a subset to avoid huge files if desired, but we'll save the whole for now.
    
    const dataDir = path.join(projectRoot, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    
    const outputPath = path.join(dataDir, 'aviation.json');
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    
    console.log(`Aviation data saved to data/aviation.json`);
  } catch (error) {
    console.error('Error fetching aviation data:', error);
    process.exit(1);
  }
}

fetchAviation();
