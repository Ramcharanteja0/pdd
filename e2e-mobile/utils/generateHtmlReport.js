const fs = require('fs');
const path = require('path');

module.exports = function(results) {
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const passRate = total === 0 ? 0 : ((passed / total) * 100).toFixed(1);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CrowdIQ Android Appium Execution Report</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #121212; color: #e0e0e0; margin: 0; padding: 20px; }
    h1 { color: #ffffff; text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 20px; background-color: #1e1e1e; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
    .stat { text-align: center; }
    .stat h2 { margin: 0; font-size: 2em; }
    .pass { color: #4caf50; }
    .fail { color: #f44336; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; background-color: #1e1e1e; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #333; }
    th { background-color: #2c2c2c; color: #fff; }
    tr:hover { background-color: #2a2a2a; }
    .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.85em; }
    .badge.PASS { background-color: rgba(76, 175, 80, 0.2); color: #4caf50; border: 1px solid #4caf50; }
    .badge.FAIL { background-color: rgba(244, 67, 54, 0.2); color: #f44336; border: 1px solid #f44336; }
  </style>
</head>
<body>
  <h1>CrowdIQ Android Appium Execution Report</h1>
  <div class="summary">
    <div class="stat"><h2>${total}</h2>Total Tests</div>
    <div class="stat pass"><h2>${passed}</h2>Passed</div>
    <div class="stat fail"><h2>${failed}</h2>Failed</div>
    <div class="stat"><h2>${passRate}%</h2>Pass Rate</div>
  </div>

  <h2>Test Cases</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Test Title</th>
        <th>Duration (ms)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${results.map(r => `
      <tr>
        <td>${r.category}</td>
        <td>${r.title}</td>
        <td>${r.duration}</td>
        <td><span class="badge ${r.status}">${r.status}</span></td>
      </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;

  const outDir = path.join(__dirname, '..', 'Test_Results', 'HTML');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  const outPath = path.join(outDir, 'execution-report.html');
  fs.writeFileSync(outPath, html);
  console.log(`HTML report saved to ${outPath}`);
};
