import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ─── Custom Metrics ──────────────────────────────────────────────────
const successRate = new Rate('success_rate');
const reqCount = new Counter('total_requests');
const healthDuration = new Trend('health_duration', true);
const crowdDuration = new Trend('crowd_duration', true);
const alertsDuration = new Trend('alerts_duration', true);
const incidentsDuration = new Trend('incidents_duration', true);
const zonesDuration = new Trend('zones_duration', true);
const loginDuration = new Trend('login_duration', true);
const registerDuration = new Trend('register_duration', true);
const createIncidentDuration = new Trend('create_incident_duration', true);

// ─── Configuration ───────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  scenarios: {
    baseline_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '1m',
      gracefulStop: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    success_rate: ['rate>0.95'],
  },
  summaryTrendStats: ['avg', 'min', 'max', 'med', 'p(90)', 'p(95)', 'p(99)'],
};

// ─── Helpers ─────────────────────────────────────────────────────────
const headers = { 'Content-Type': 'application/json' };

function randomString(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const ZONES = ['Main Stage', 'North Entrance', 'Food Court A', 'Tech Expo Hall', 'Workshop Zone', 'South Exit', 'VIP Lounge', 'Parking A', 'First Aid', 'Media Centre', 'Food Court B', 'Emergency Gate'];
const INCIDENT_TYPES = ['Overcrowding', 'Medical', 'Security', 'Equipment', 'Weather', 'General'];

// ─── Main Test Function ──────────────────────────────────────────────
export default function () {
  // 1. Health Check
  let res = http.get(`${BASE_URL}/api/health`);
  healthDuration.add(res.timings.duration);
  reqCount.add(1);
  successRate.add(check(res, {
    'health status 200': (r) => r.status === 200,
    'health has status ok': (r) => JSON.parse(r.body).status === 'ok',
  }));

  // 2. Live Crowd Data
  res = http.get(`${BASE_URL}/api/crowd/live`);
  crowdDuration.add(res.timings.duration);
  reqCount.add(1);
  successRate.add(check(res, {
    'crowd status 200': (r) => r.status === 200,
    'crowd has liveCrowd': (r) => JSON.parse(r.body).liveCrowd > 0,
    'crowd has zones': (r) => JSON.parse(r.body).zones.length > 0,
  }));

  // 3. Get Alerts
  res = http.get(`${BASE_URL}/api/alerts`);
  alertsDuration.add(res.timings.duration);
  reqCount.add(1);
  successRate.add(check(res, {
    'alerts status 200': (r) => r.status === 200,
    'alerts is array': (r) => Array.isArray(JSON.parse(r.body)),
  }));

  // 4. Get Incidents
  res = http.get(`${BASE_URL}/api/incidents`);
  incidentsDuration.add(res.timings.duration);
  reqCount.add(1);
  successRate.add(check(res, {
    'incidents status 200': (r) => r.status === 200,
    'incidents is array': (r) => Array.isArray(JSON.parse(r.body)),
  }));

  // 5. Get Zones
  res = http.get(`${BASE_URL}/api/zones`);
  zonesDuration.add(res.timings.duration);
  reqCount.add(1);
  successRate.add(check(res, {
    'zones status 200': (r) => r.status === 200,
    'zones has 12 entries': (r) => JSON.parse(r.body).length === 12,
  }));

  // 6. Login (valid credentials)
  res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'demo@crowdiq.ai',
    password: 'demo1234',
  }), { headers });
  loginDuration.add(res.timings.duration);
  reqCount.add(1);
  successRate.add(check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => JSON.parse(r.body).token !== undefined,
  }));

  // 7. Register (random user — will get 201 or 409 if duplicate)
  const rnd = randomString(8);
  res = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
    name: `LoadUser_${rnd}`,
    email: `load_${rnd}@test.com`,
    password: 'TestPass123!',
    org: 'LoadTestOrg',
    role: 'Event Organizer',
  }), { headers });
  registerDuration.add(res.timings.duration);
  reqCount.add(1);
  successRate.add(check(res, {
    'register status 201 or 409': (r) => r.status === 201 || r.status === 409,
  }));

  // 8. Create Incident
  res = http.post(`${BASE_URL}/api/incidents`, JSON.stringify({
    zone: ZONES[Math.floor(Math.random() * ZONES.length)],
    type: INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)],
    desc: `Load test incident ${rnd}`,
    reporter: 'k6-load-test',
  }), { headers });
  createIncidentDuration.add(res.timings.duration);
  reqCount.add(1);
  successRate.add(check(res, {
    'create incident status 201': (r) => r.status === 201,
    'create incident has id': (r) => JSON.parse(r.body).id !== undefined,
  }));

  sleep(0.5);
}

// ─── Summary Handler ─────────────────────────────────────────────────
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    config: { vus: 100, duration: '1m' },
    metrics: {
      total_requests: data.metrics.http_reqs?.values?.count || 0,
      rps: (data.metrics.http_reqs?.values?.rate || 0).toFixed(2),
      response_time: {
        avg: (data.metrics.http_req_duration?.values?.avg || 0).toFixed(2) + 'ms',
        min: (data.metrics.http_req_duration?.values?.min || 0).toFixed(2) + 'ms',
        max: (data.metrics.http_req_duration?.values?.max || 0).toFixed(2) + 'ms',
        median: (data.metrics.http_req_duration?.values?.med || 0).toFixed(2) + 'ms',
        p95: (data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2) + 'ms',
        p99: (data.metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2) + 'ms',
      },
      error_rate: ((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2) + '%',
      success_rate: ((data.metrics.success_rate?.values?.rate || 0) * 100).toFixed(2) + '%',
    },
    thresholds_passed: Object.entries(data.metrics)
      .filter(([_, v]) => v.thresholds)
      .every(([_, v]) => Object.values(v.thresholds).every(t => t.ok)),
  };

  return {
    'stdout': JSON.stringify(summary, null, 2) + '\n',
    'k6-summary.json': JSON.stringify(data, null, 2),
  };
}
