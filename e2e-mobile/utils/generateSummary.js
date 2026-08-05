const fs = require('fs');
const path = require('path');

module.exports = function(results) {
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const passRate = total === 0 ? 0 : ((passed / total) * 100).toFixed(1);

  const markdown = `
# 📱 Mobile E2E Testing Summary (Android)
**Total Tests executed:** ${total}
**Passed:** ${passed}
**Failed:** ${failed}
**Pass Rate:** ${passRate}%

Reports are attached to the GitHub Pages deployment under \`/reports/latest/execution-report.html\`
`;

  const outPath = path.join(__dirname, '..', 'Test_Results', 'summary.md');
  fs.writeFileSync(outPath, markdown);
  console.log(`Summary markdown saved to ${outPath}`);
};
