const fs = require('fs');
const path = require('path');

// Defensive utility for k6 summary JSON
function getMetricValue(metricObj, key) {
  if (!metricObj) return 'N/A';
  if (metricObj.values && metricObj.values[key] !== undefined) {
    return metricObj.values[key];
  }
  if (metricObj[key] !== undefined) {
    return metricObj[key];
  }
  return 'N/A';
}

function formatRate(val) {
  if (val === 'N/A') return 'N/A';
  return (val * 100).toFixed(2) + '%';
}

function formatDuration(val) {
  if (val === 'N/A') return 'N/A';
  return val.toFixed(2) + 'ms';
}

function parseSummary() {
  const summaryPath = path.join(__dirname, '..', 'summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.error('summary.json not found!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const metrics = data.metrics || {};

  const reqs = metrics.http_reqs;
  const duration = metrics.http_req_duration;
  const fails = metrics.http_req_failed;
  const checks = metrics.checks;

  const totalReqs = getMetricValue(reqs, 'count');
  const rps = getMetricValue(reqs, 'rate');
  
  const avgTime = formatDuration(getMetricValue(duration, 'avg'));
  const minTime = formatDuration(getMetricValue(duration, 'min'));
  const maxTime = formatDuration(getMetricValue(duration, 'max'));
  const p95Time = formatDuration(getMetricValue(duration, 'p(95)'));

  const failRate = formatRate(getMetricValue(fails, 'rate'));
  const checkRate = formatRate(getMetricValue(checks, 'rate'));

  const markdown = `
# 🚀 API Load Testing Summary (k6)

### Throughput
- **Virtual Users:** 100
- **Duration:** 1 minute
- **Requests per second (RPS):** ${typeof rps === 'number' ? rps.toFixed(2) : rps} req/s
- **Total Requests Sent:** ${totalReqs}

### Latency (Response Time)
- **Average:** ${avgTime}
- **Minimum:** ${minTime}
- **Maximum:** ${maxTime}
- **95th Percentile:** ${p95Time}

### Reliability
- **Request Failure Rate:** ${failRate}
- **Assertions Passed:** ${checkRate}
`;

  fs.writeFileSync(path.join(__dirname, '..', 'load-test-summary.md'), markdown);
  console.log('Load test summary parsed successfully.');
}

parseSummary();
