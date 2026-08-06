import { readFileSync, writeFileSync } from 'fs';

const inputFile = process.argv[2] || 'k6-summary.json';

try {
  const raw = readFileSync(inputFile, 'utf8');
  const data = JSON.parse(raw);

  const m = data.metrics || {};
  const dur = m.http_req_duration?.values || {};
  const reqs = m.http_reqs?.values || {};
  const failed = m.http_req_failed?.values || {};

  const summary = `
╔══════════════════════════════════════════════════════════════╗
║               CrowdIQ — k6 Load Test Summary                ║
╠══════════════════════════════════════════════════════════════╣
║  Configuration                                              ║
║  ├─ Virtual Users:     100                                  ║
║  ├─ Duration:          1 minute                             ║
║  └─ Endpoints Tested:  8                                    ║
╠══════════════════════════════════════════════════════════════╣
║  Results                                                    ║
║  ├─ Total Requests:    ${String(reqs.count || 0).padEnd(36)}║
║  ├─ Requests/sec:      ${String((reqs.rate || 0).toFixed(2)).padEnd(36)}║
║  ├─ Error Rate:        ${String(((failed.rate || 0) * 100).toFixed(2) + '%').padEnd(36)}║
║  ╠── Response Times                                         ║
║  │   ├─ Average:       ${String((dur.avg || 0).toFixed(2) + 'ms').padEnd(36)}║
║  │   ├─ Minimum:       ${String((dur.min || 0).toFixed(2) + 'ms').padEnd(36)}║
║  │   ├─ Maximum:       ${String((dur.max || 0).toFixed(2) + 'ms').padEnd(36)}║
║  │   ├─ Median:        ${String((dur.med || 0).toFixed(2) + 'ms').padEnd(36)}║
║  │   ├─ p(95):         ${String((dur['p(95)'] || 0).toFixed(2) + 'ms').padEnd(36)}║
║  │   └─ p(99):         ${String((dur['p(99)'] || 0).toFixed(2) + 'ms').padEnd(36)}║
╠══════════════════════════════════════════════════════════════╣
║  Thresholds                                                 ║
║  ├─ p(95) < 500ms:     ${String(dur['p(95)'] < 500 ? '✅ PASS' : '❌ FAIL').padEnd(36)}║
║  ├─ p(99) < 1500ms:    ${String(dur['p(99)'] < 1500 ? '✅ PASS' : '❌ FAIL').padEnd(36)}║
║  └─ Error Rate < 1%:   ${String((failed.rate || 0) < 0.01 ? '✅ PASS' : '❌ FAIL').padEnd(36)}║
╚══════════════════════════════════════════════════════════════╝
`;

  console.log(summary);
  writeFileSync('k6-parsed-summary.txt', summary, 'utf8');
  console.log('Summary saved to k6-parsed-summary.txt');
} catch (err) {
  console.error('Failed to parse k6 summary:', err.message);
  process.exit(1);
}
