/**
 * h3Utils.js — H3 Hexagonal Spatial Indexing for Crowd Density
 *
 * Uses Uber's H3 library to divide the venue into ~174m² hexagonal cells.
 * Produces persons/m² — the international crowd safety standard.
 *
 * Key thresholds (international standards):
 *   < 1.0 /m² = SAFE (comfortable movement)
 *   1.0-2.5 /m² = MODERATE (restricted movement)
 *   2.5-4.0 /m² = HIGH (very limited movement)
 *   ≥ 4.0 /m² = CRITICAL (dangerous, crush risk)
 */
import { latLngToCell, cellToBoundary, cellToLatLng } from 'h3-js';

/** Area of an H3 resolution-9 cell in square meters */
export const H3_CELL_AREA_SQM = 174.1;

/**
 * Convert lat/lng to H3 cell index
 * @param {number} lat
 * @param {number} lng
 * @param {number} resolution - H3 resolution (default 9, ~174m² cells)
 * @returns {string} H3 cell index
 */
export function latLngToH3(lat, lng, resolution = 9) {
  return latLngToCell(lat, lng, resolution);
}

/**
 * Get the boundary polygon of an H3 cell
 * @param {string} h3Index
 * @returns {Array<[number, number]>} Array of [lat, lng] pairs
 */
export function getH3CellBoundary(h3Index) {
  return cellToBoundary(h3Index);
}

/**
 * Compute H3 hex density grid from GPS positions
 *
 * @param {Array<{lat: number, lng: number, anon_token?: string}>} attendeeLocations
 * @param {number} resolution - H3 resolution (default 9)
 * @returns {Map<string, {count: number, density_per_sqm: number, center: [number,number], boundary: Array<[number,number]>}>}
 */
export function computeHexDensity(attendeeLocations, resolution = 9) {
  const hexMap = new Map();

  for (const loc of attendeeLocations) {
    if (!loc.lat || !loc.lng) continue;

    const h3Index = latLngToCell(loc.lat, loc.lng, resolution);

    if (!hexMap.has(h3Index)) {
      const center = cellToLatLng(h3Index);
      const boundary = cellToBoundary(h3Index);
      hexMap.set(h3Index, {
        count: 0,
        density_per_sqm: 0,
        center,
        boundary,
        tokens: new Set(),
      });
    }

    const cell = hexMap.get(h3Index);
    // Count unique tokens to avoid double-counting
    const token = loc.anon_token || `${loc.lat.toFixed(6)}_${loc.lng.toFixed(6)}`;
    if (!cell.tokens.has(token)) {
      cell.tokens.add(token);
      cell.count++;
      cell.density_per_sqm = cell.count / H3_CELL_AREA_SQM;
    }
  }

  // Clean up token sets (not needed in output)
  for (const [, cell] of hexMap) {
    delete cell.tokens;
  }

  return hexMap;
}

/**
 * Get color for a density value (persons per m²)
 * Based on international crowd safety standards
 */
export function getDensityColor(densityPerSqm) {
  if (densityPerSqm >= 4.0) return '#EF4444'; // Critical (red)
  if (densityPerSqm >= 2.5) return '#F97316'; // High (orange)
  if (densityPerSqm >= 1.0) return '#F59E0B'; // Moderate (yellow)
  return '#10B981'; // Safe (green)
}

/**
 * Get human-readable density level
 */
export function getDensityLevel(densityPerSqm) {
  if (densityPerSqm >= 4.0) return 'CRITICAL';
  if (densityPerSqm >= 2.5) return 'HIGH';
  if (densityPerSqm >= 1.0) return 'MODERATE';
  return 'SAFE';
}

/**
 * Haversine distance between two points in meters
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute bearing (direction) from point A to point B in degrees
 */
function bearing(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

/**
 * Compute flow vectors — crowd movement direction per hex cell
 *
 * @param {Array<{anon_token: string, lat: number, lng: number}>} currentPositions
 * @param {Array<{anon_token: string, lat: number, lng: number}>} previousPositions
 * @param {number} timeDeltaSec - Time between snapshots (default 30)
 * @returns {Array<{h3Cell: string, center: [number,number], avgDirection: number, avgSpeed: number, deviceCount: number}>}
 */
export function computeFlowVectors(currentPositions, previousPositions, timeDeltaSec = 30) {
  // Index previous positions by token
  const prevMap = new Map();
  for (const p of previousPositions) {
    if (p.anon_token) prevMap.set(p.anon_token, p);
  }

  // Compute individual movement vectors
  const cellVectors = new Map();

  for (const curr of currentPositions) {
    if (!curr.anon_token) continue;
    const prev = prevMap.get(curr.anon_token);
    if (!prev) continue;

    const dist = haversine(prev.lat, prev.lng, curr.lat, curr.lng);
    const speed = dist / timeDeltaSec; // m/s
    const dir = bearing(prev.lat, prev.lng, curr.lat, curr.lng);

    if (dist < 0.5) continue; // Skip if essentially stationary (< 0.5m)

    const h3Cell = latLngToCell(curr.lat, curr.lng, 9);

    if (!cellVectors.has(h3Cell)) {
      cellVectors.set(h3Cell, {
        h3Cell,
        center: cellToLatLng(h3Cell),
        sinSum: 0,
        cosSum: 0,
        speedSum: 0,
        deviceCount: 0,
      });
    }

    const cell = cellVectors.get(h3Cell);
    // Circular mean for direction averaging
    cell.sinSum += Math.sin(dir * Math.PI / 180);
    cell.cosSum += Math.cos(dir * Math.PI / 180);
    cell.speedSum += speed;
    cell.deviceCount++;
  }

  // Compute averages
  return Array.from(cellVectors.values()).map(cell => ({
    h3Cell: cell.h3Cell,
    center: cell.center,
    avgDirection: ((Math.atan2(cell.sinSum / cell.deviceCount, cell.cosSum / cell.deviceCount) * 180 / Math.PI) + 360) % 360,
    avgSpeed: cell.speedSum / cell.deviceCount,
    deviceCount: cell.deviceCount,
  }));
}
