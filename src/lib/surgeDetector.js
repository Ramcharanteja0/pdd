/**
 * surgeDetector.js — Automated Crowd Safety Alert Engine
 *
 * Monitors H3 hex density grid for dangerous conditions:
 *   1. DENSITY alert: ≥ 4.0 persons/m² (international danger threshold)
 *   2. CRUSH RISK alert: ≥ 2.5 persons/m² AND avg speed < 0.3 m/s
 *
 * Publishes surge alerts to Supabase 'alerts' table automatically.
 */
import { supabase } from '../lib/supabase';

/** International crowd safety thresholds */
export const SURGE_THRESHOLDS = {
  DENSITY_DANGER: 4.0,     // persons/m² — above this is dangerous
  DENSITY_HIGH: 2.5,       // persons/m² — restricted movement
  MIN_SPEED_CRUSH: 0.3,    // m/s — below this in dense area = crush forming
};

/**
 * Check hex density map and flow vectors for surge conditions
 *
 * @param {Map<string, {count: number, density_per_sqm: number, center: [number,number]}>} hexDensityMap
 * @param {Array<{h3Cell: string, avgSpeed: number, avgDirection: number}>} flowVectors
 * @returns {Array<{type: string, h3Cell: string, density: number, speed?: number, message: string}>}
 */
export function checkSurgeConditions(hexDensityMap, flowVectors = []) {
  const alerts = [];

  if (!hexDensityMap || hexDensityMap.size === 0) return alerts;

  // Index flow vectors by cell
  const flowMap = new Map();
  for (const vec of flowVectors) {
    flowMap.set(vec.h3Cell, vec);
  }

  for (const [h3Cell, data] of hexDensityMap) {
    const density = data.density_per_sqm;

    // Check 1: Absolute density danger
    if (density >= SURGE_THRESHOLDS.DENSITY_DANGER) {
      alerts.push({
        type: 'DENSITY',
        h3Cell,
        density,
        message: `⚠️ DANGER: ${density.toFixed(1)} persons/m² detected (limit: ${SURGE_THRESHOLDS.DENSITY_DANGER}). ${data.count} people in ~174m² hex cell.`,
      });
    }

    // Check 2: Crush risk (dense + slow movement)
    const flow = flowMap.get(h3Cell);
    if (flow && density >= SURGE_THRESHOLDS.DENSITY_HIGH && flow.avgSpeed < SURGE_THRESHOLDS.MIN_SPEED_CRUSH) {
      alerts.push({
        type: 'CRUSH_RISK',
        h3Cell,
        density,
        speed: flow.avgSpeed,
        message: `🚨 CRUSH RISK: Crowd nearly stopped (${flow.avgSpeed.toFixed(2)} m/s) at ${density.toFixed(1)} /m². Immediate action required.`,
      });
    }
  }

  return alerts;
}

/**
 * Publish surge alerts to Supabase alerts table
 *
 * @param {Array<{type: string, h3Cell: string, density: number, message: string}>} alerts
 */
export async function publishSurgeAlerts(alerts) {
  if (!alerts || alerts.length === 0) return;

  const rows = alerts.map(alert => ({
    title: alert.type === 'CRUSH_RISK'
      ? `🚨 Crush Risk — Cell ${alert.h3Cell.slice(-6)}`
      : `⚠️ High Density — Cell ${alert.h3Cell.slice(-6)}`,
    zone: `H3:${alert.h3Cell.slice(-6)}`,
    type: 'danger',
    description: alert.message,
    resolved: false,
  }));

  try {
    const { error } = await supabase.from('alerts').insert(rows);
    if (error) {
      console.warn('Failed to publish surge alerts:', error.message);
    }
  } catch (err) {
    console.warn('Surge alert publish error:', err);
  }
}
