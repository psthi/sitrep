import fs from 'node:fs/promises';
import path from 'node:path';

const FIRMS_URL = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_24h.csv';
const OUTPUT_FILE = path.resolve('data', 'firms.json');

async function fetchFirmsData() {
  try {
    console.log('Fetching FIRMS data...');
    const response = await fetch(FIRMS_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch FIRMS data: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const lines = text.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV has no data rows');
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    
    const confidenceIndex = headers.indexOf('confidence');
    
    if (confidenceIndex === -1) {
      throw new Error('Missing confidence column in CSV');
    }
    
    const highConfidenceFires = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length !== headers.length) continue;
      
      const confidence = parseInt(values[confidenceIndex], 10);
      
      // For MODIS, confidence is 0-100. We consider >= 80 as high confidence.
      if (!isNaN(confidence) && confidence >= 80) {
        const fire = {};
        for (let j = 0; j < headers.length; j++) {
          let val = values[j].trim();
          
          if (val !== '' && !isNaN(Number(val))) {
            val = Number(val);
          }
          
          fire[headers[j]] = val;
        }
        highConfidenceFires.push(fire);
      }
    }
    
    console.log(`Found ${highConfidenceFires.length} high confidence fires.`);
    
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(highConfidenceFires, null, 2));
    console.log(`Successfully wrote FIRMS data to ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('Error fetching FIRMS data:', error.message);
    // Don't crash workflow, just preserve old data or write empty array
    try {
      await fs.access(OUTPUT_FILE);
      console.log('[WARN] Preserving existing FIRMS data.');
    } catch {
      await fs.writeFile(OUTPUT_FILE, JSON.stringify([], null, 2));
    }
  }
}

fetchFirmsData();
