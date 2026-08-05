/**
 * kalmanFilter.js — Simple 2D Kalman Filter for GPS Smoothing
 *
 * Raw GPS coordinates jump ±5m between pings. This filter produces
 * smoothed position estimates that are significantly more accurate
 * for density counting and zone assignment.
 *
 * No external dependencies — pure math.
 */

export class KalmanFilter {
  /**
   * @param {number} processNoise - How much we expect position to change between pings (default 0.01)
   * @param {number} measurementNoise - How noisy GPS measurements are (default 3.0 meters)
   */
  constructor(processNoise = 0.01, measurementNoise = 3.0) {
    this.processNoise = processNoise;
    this.measurementNoise = measurementNoise;
    this.initialized = false;

    // State: [lat, lng, vLat, vLng]
    this.lat = 0;
    this.lng = 0;
    this.vLat = 0; // velocity in lat direction
    this.vLng = 0; // velocity in lng direction

    // Covariance matrix (simplified: track variance for each dimension independently)
    this.pLat = 1;   // position variance lat
    this.pLng = 1;   // position variance lng
    this.pvLat = 0;  // position-velocity covariance lat
    this.pvLng = 0;  // position-velocity covariance lng
    this.vvLat = 1;  // velocity variance lat
    this.vvLng = 1;  // velocity variance lng

    this.lastTimestamp = null;
  }

  /**
   * Apply Kalman filter to a GPS measurement
   * @param {number} measuredLat - Raw GPS latitude
   * @param {number} measuredLng - Raw GPS longitude
   * @param {number} accuracy - GPS accuracy in meters (used to scale measurement noise)
   * @returns {{ lat: number, lng: number }} Smoothed position
   */
  filter(measuredLat, measuredLng, accuracy = 5) {
    // Adjust measurement noise based on reported GPS accuracy
    const R = Math.max(this.measurementNoise, accuracy * 0.5);

    if (!this.initialized) {
      // First measurement: initialize state directly
      this.lat = measuredLat;
      this.lng = measuredLng;
      this.vLat = 0;
      this.vLng = 0;
      this.pLat = R * R;
      this.pLng = R * R;
      this.pvLat = 0;
      this.pvLng = 0;
      this.vvLat = 1;
      this.vvLng = 1;
      this.lastTimestamp = Date.now();
      this.initialized = true;
      return { lat: measuredLat, lng: measuredLng };
    }

    const now = Date.now();
    const dt = Math.min((now - this.lastTimestamp) / 1000, 60); // cap at 60s
    this.lastTimestamp = now;

    if (dt <= 0) {
      return { lat: this.lat, lng: this.lng };
    }

    // ── PREDICT step ──
    // State prediction: position += velocity * dt
    this.lat += this.vLat * dt;
    this.lng += this.vLng * dt;

    // Covariance prediction (simplified)
    const Q = this.processNoise * dt;
    this.pLat += 2 * dt * this.pvLat + dt * dt * this.vvLat + Q;
    this.pLng += 2 * dt * this.pvLng + dt * dt * this.vvLng + Q;
    this.pvLat += dt * this.vvLat;
    this.pvLng += dt * this.vvLng;
    this.vvLat += Q * 0.1;
    this.vvLng += Q * 0.1;

    // ── UPDATE step ──
    // Innovation (measurement residual)
    const yLat = measuredLat - this.lat;
    const yLng = measuredLng - this.lng;

    // Innovation covariance
    const sLat = this.pLat + R * R;
    const sLng = this.pLng + R * R;

    // Kalman gain
    const kLat = this.pLat / sLat;
    const kLng = this.pLng / sLng;
    const kvLat = this.pvLat / sLat;
    const kvLng = this.pvLng / sLng;

    // State update
    this.lat += kLat * yLat;
    this.lng += kLng * yLng;
    this.vLat += kvLat * yLat;
    this.vLng += kvLng * yLng;

    // Covariance update
    this.pLat *= (1 - kLat);
    this.pLng *= (1 - kLng);
    this.pvLat *= (1 - kLat);
    this.pvLng *= (1 - kLng);
    this.vvLat -= kvLat * this.pvLat;
    this.vvLng -= kvLng * this.pvLng;

    return { lat: this.lat, lng: this.lng };
  }

  /**
   * Reset filter state
   */
  reset() {
    this.initialized = false;
    this.lastTimestamp = null;
  }
}

// ── Singleton for quick usage ──
let _instance = null;

/**
 * Smooth a single GPS measurement using a shared Kalman filter instance
 * @param {number} rawLat - Raw GPS latitude
 * @param {number} rawLng - Raw GPS longitude
 * @param {number} accuracy - GPS accuracy in meters
 * @returns {{ lat: number, lng: number }} Smoothed position
 */
export function smoothGPS(rawLat, rawLng, accuracy = 5) {
  if (!_instance) _instance = new KalmanFilter();
  return _instance.filter(rawLat, rawLng, accuracy);
}

/**
 * Reset the singleton Kalman filter (e.g., on check-out)
 */
export function resetGPSFilter() {
  if (_instance) _instance.reset();
  _instance = null;
}
