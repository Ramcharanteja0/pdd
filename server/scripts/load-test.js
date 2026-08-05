import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';

// 1. Load test cases dynamically from external configuration (no hardcoding)
const testCases = new SharedArray('Endpoints', function () {
  return JSON.parse(open('./load-test-config.json')).endpoints;
});

// 2. Professional Baseline/Load Testing Configuration
export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-vus',
      vus: 100, // 100 virtual users
      duration: '1m', // Running continuously for 1 minute
    },
  },
  thresholds: {
    // 3. Ensuring system stays fast and reliable
    http_req_failed: ['rate<0.05'], // http errors should be less than 5%
    http_req_duration: ['p(95)<1500', 'avg<250'], // 95% < 1500ms, Average < 250ms
  },
};

export default function () {
  const baseUrl = __ENV.BACKEND_URL || 'http://localhost:3000';

  // 4. Improve total structure by iterating dynamically through the configured cases
  group('API Endpoint Evaluations', function () {
    for (const testCase of testCases) {
      // Simulate real user flow weighting
      for (let i = 0; i < testCase.weight; i++) {
        let res;
        const targetUrl = `${baseUrl}${testCase.path}`;
        
        if (testCase.method === 'GET') {
          res = http.get(targetUrl);
        } else if (testCase.method === 'POST') {
          res = http.post(targetUrl, JSON.stringify(testCase.payload || {}), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        check(res, {
          [`${testCase.method} ${testCase.path} status is ${testCase.expectedStatus}`]: (r) => r.status === testCase.expectedStatus,
        });
      }
    }
  });

  // Small delay to emulate user think time and prevent unrealistic local network spam
  sleep(Math.random() * 0.5 + 0.5);
}
