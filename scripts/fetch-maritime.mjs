import fs from 'fs/promises';
import path from 'path';

// Most real global AIS data APIs are paid (e.g. MarineTraffic, VesselFinder, Spire).
// Aisstream does have a free tier but requires websocket/registration.
// We will mock robustly, generating realistic data around key chokepoints
// such as the Suez Canal, Panama Canal, Strait of Hormuz, Malacca Strait, Bab-el-Mandeb.

const CHOKEPOINTS = [
  { name: 'Suez Canal', lat: 30.5852, lon: 32.2654, radius: 1.0 },
  { name: 'Panama Canal', lat: 9.1438, lon: -79.7281, radius: 0.5 },
  { name: 'Strait of Hormuz', lat: 26.5667, lon: 56.2500, radius: 1.5 },
  { name: 'Strait of Malacca', lat: 2.3800, lon: 101.5900, radius: 2.0 },
  { name: 'Bab-el-Mandeb', lat: 12.5833, lon: 43.3333, radius: 1.2 },
  { name: 'Bosphorus', lat: 41.2210, lon: 29.1220, radius: 0.3 }
];

const SHIP_TYPES = ['Cargo', 'Tanker', 'Passenger', 'Military', 'Container'];

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function generateMockAISData() {
  const vessels = [];
  const numVessels = Math.floor(randomInRange(50, 150));

  for (let i = 0; i < numVessels; i++) {
    const chokepoint = CHOKEPOINTS[Math.floor(Math.random() * CHOKEPOINTS.length)];
    const latOffset = randomInRange(-chokepoint.radius, chokepoint.radius);
    const lonOffset = randomInRange(-chokepoint.radius, chokepoint.radius);
    
    vessels.push({
      mmsi: Math.floor(randomInRange(100000000, 999999999)),
      name: `Vessel-${Math.floor(Math.random() * 10000)}`,
      type: SHIP_TYPES[Math.floor(Math.random() * SHIP_TYPES.length)],
      location: {
        lat: chokepoint.lat + latOffset,
        lon: chokepoint.lon + lonOffset
      },
      speed: randomInRange(0, 25).toFixed(1),
      course: Math.floor(randomInRange(0, 360)),
      heading: Math.floor(randomInRange(0, 360)),
      timestamp: new Date().toISOString(),
      region: chokepoint.name,
      status: Math.random() > 0.9 ? 'Moored' : 'Under way using engine'
    });
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      source: "Mock AIS Data (API fallback)",
      vesselCount: vessels.length
    },
    vessels
  };
}

async function run() {
  console.log('Fetching/Mocking Global AIS Maritime tracking data...');
  try {
    const data = generateMockAISData();
    const dataDir = path.join(process.cwd(), 'data');
    
    // Ensure data dir exists
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    const filePath = path.join(dataDir, 'maritime.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Successfully saved ${data.vessels.length} vessel records to ${filePath}`);
  } catch (error) {
    console.error('Failed to generate/fetch maritime data:', error.message);
  }
}

run();
