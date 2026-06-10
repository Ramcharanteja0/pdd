/**
 * anonymize.js — Device ID Anonymization
 *
 * SHA-256 hashes device IDs before storing in Supabase.
 * Zero PII in the database — GDPR/PDPA compliant from day one.
 *
 * Uses Web Crypto API (browser-native) — no external dependencies.
 */

const DEVICE_ID_KEY = 'crowdiq_device_id';

/**
 * SHA-256 hash a device ID string
 * @param {string} deviceId - Raw device UUID
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
export async function hashDeviceId(deviceId) {
  const encoder = new TextEncoder();
  const data = encoder.encode(deviceId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create a persistent device ID (stored in localStorage)
 * @returns {string} Device UUID
 */
export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get anonymous token: creates device ID + hashes it
 * @returns {Promise<string>} SHA-256 anon_token (64-char hex)
 */
export async function getAnonymousToken() {
  const deviceId = getOrCreateDeviceId();
  return await hashDeviceId(deviceId);
}
