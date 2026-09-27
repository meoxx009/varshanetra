/**
 * Reproducible DEM Preprocessing Script for Pune District Command Sector
 * VarshaNetra Emergency Response System (VARSHANETRA-10)
 *
 * Elevation Source: NASA SRTM (Shuttle Radar Topography Mission) & Copernicus GLO-30/90 DEM
 * Access Workflow: Preprocessed batch queries normalized to 0.02° spatial grid (~2.2 km resolution)
 * License / Attribution: Public Domain / Open Access ODbL & CC BY 4.0
 */

const fs = require('fs');
const path = require('path');

// Ensure destination directories exist
const dataDir = path.join(process.cwd(), 'src/data/terrain');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Pune District Pilot Bounding Box
// 18.30°N to 18.74°N, 73.66°E to 74.06°E (Covers Pune City, Haveli, Pimpri-Chinchwad, Khadakwasla, Mulshi foothills)
const BBOX = {
  minLat: 18.30,
  maxLat: 18.74,
  minLon: 73.66,
  maxLon: 74.06,
};

const RESOLUTION_DEG = 0.02; // ~2.2 km

async function preprocessPuneTerrain() {
  console.log('=== PREPROCESSING PUNE DISTRICT PILOT TERRAIN (SRTM / COPERNICUS DEM) ===');
  console.log(`Bounding Box: Lat [${BBOX.minLat}, ${BBOX.maxLat}], Lon [${BBOX.minLon}, ${BBOX.maxLon}]`);

  const gridLats = [];
  const gridLons = [];

  for (let lat = BBOX.minLat; lat <= BBOX.maxLat + 0.001; lat = Number((lat + RESOLUTION_DEG).toFixed(3))) {
    gridLats.push(lat);
  }
  for (let lon = BBOX.minLon; lon <= BBOX.maxLon + 0.001; lon = Number((lon + RESOLUTION_DEG).toFixed(3))) {
    gridLons.push(lon);
  }

  const numRows = gridLats.length;
  const numCols = gridLons.length;
  const totalPoints = numRows * numCols;
  console.log(`Grid dimensions: ${numRows} rows x ${numCols} cols = ${totalPoints} sample points.`);

  const queryPoints = [];
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      queryPoints.push({ lat: gridLats[r], lon: gridLons[c], r, c });
    }
  }

  console.log('Fetching elevation data from verified SRTM/Copernicus elevation API in batches...');
  const BATCH_SIZE = 100;
  const elevationMap = new Map();

  for (let i = 0; i < queryPoints.length; i += BATCH_SIZE) {
    const chunk = queryPoints.slice(i, i + BATCH_SIZE);
    const latsStr = chunk.map((p) => p.lat).join(',');
    const lonsStr = chunk.map((p) => p.lon).join(',');

    const url = `https://api.open-meteo.com/v1/elevation?latitude=${latsStr}&longitude=${lonsStr}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Elevation API returned HTTP ${res.status}`);
    }
    const json = await res.json();
    if (!json.elevation || !Array.isArray(json.elevation)) {
      throw new Error('Invalid elevation payload');
    }

    chunk.forEach((p, idx) => {
      const elev = json.elevation[idx];
      elevationMap.set(`${p.r},${p.c}`, elev);
    });

    console.log(`  Fetched batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(queryPoints.length / BATCH_SIZE)} (${chunk.length} points)`);
  }

  const elevationMatrix = [];
  for (let r = 0; r < numRows; r++) {
    elevationMatrix[r] = [];
    for (let c = 0; c < numCols; c++) {
      elevationMatrix[r][c] = elevationMap.get(`${r},${c}`) || 550;
    }
  }

  const processedPoints = [];
  let minElev = Infinity;
  let maxElev = -Infinity;
  let sumElev = 0;

  for (let r = 0; r < numRows; r++) {
    const lat = gridLats[r];
    const dyMeters = RESOLUTION_DEG * 111139;
    const dxMeters = RESOLUTION_DEG * 111320 * Math.cos((lat * Math.PI) / 180);

    for (let c = 0; c < numCols; c++) {
      const lon = gridLons[c];
      const z = elevationMatrix[r][c];

      minElev = Math.min(minElev, z);
      maxElev = Math.max(maxElev, z);
      sumElev += z;

      const zWest = c > 0 ? elevationMatrix[r][c - 1] : z;
      const zEast = c < numCols - 1 ? elevationMatrix[r][c + 1] : z;
      const zSouth = r > 0 ? elevationMatrix[r - 1][c] : z;
      const zNorth = r < numRows - 1 ? elevationMatrix[r + 1][c] : z;

      const spanX = (c > 0 && c < numCols - 1) ? 2 * dxMeters : dxMeters;
      const spanY = (r > 0 && r < numRows - 1) ? 2 * dyMeters : dyMeters;

      const dz_dx = (zEast - zWest) / spanX;
      const dz_dy = (zNorth - zSouth) / spanY;

      const slopeRatio = Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy);
      const slopePercent = Number((slopeRatio * 100).toFixed(2));
      const slopeDegrees = Number(((Math.atan(slopeRatio) * 180) / Math.PI).toFixed(2));

      let classification = 'FLAT_PLAIN';
      if (slopePercent < 1.0) {
        classification = 'BASIN_DEPRESSION';
      } else if (slopePercent <= 2.5) {
        classification = 'FLAT_PLAIN';
      } else if (slopePercent <= 6.0) {
        classification = 'GENTLE_SLOPE';
      } else if (slopePercent <= 15.0) {
        classification = 'MODERATE_SLOPE';
      } else {
        classification = 'STEEP_RIDGE';
      }

      processedPoints.push({
        lat,
        lon,
        elevation: z,
        slopePercent,
        slopeDegrees,
        classification,
      });
    }
  }

  const outputDataset = {
    region: 'Pune District Command Sector',
    bbox: BBOX,
    gridResolutionDeg: RESOLUTION_DEG,
    generatedAt: new Date().toISOString(),
    source: 'NASA SRTM 90m & Copernicus GLO-30 Seamless DEM via Open-Meteo API (Public Domain / CC BY 4.0)',
    elevationStats: {
      minMeters: minElev,
      maxMeters: maxElev,
      meanMeters: Number((sumElev / totalPoints).toFixed(1)),
    },
    points: processedPoints,
  };

  const outputPath = path.join(dataDir, 'pune_pilot_dem.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputDataset, null, 2), 'utf8');
  console.log(`✓ Successfully created ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
  console.log(`  Min Elevation: ${minElev} m, Max: ${maxElev} m, Mean: ${(sumElev / totalPoints).toFixed(1)} m`);
}

preprocessPuneTerrain().catch((err) => {
  console.error('Preprocessing failed:', err);
  process.exit(1);
});
