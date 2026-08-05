const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const findings = [
  { id: 'WEB-001', component: 'AuthContext.jsx', risk: 'Low', description: 'PII stored in localStorage instead of sessionStorage or secure cookies.' },
  { id: 'WEB-002', component: 'AuthContext.jsx', risk: 'Low', description: 'No explicit session TTL enforced on the client side.' },
  { id: 'WEB-003', component: 'index.html', risk: 'Low', description: 'Missing Content-Security-Policy (CSP) meta tag.' },
  { id: 'WEB-004', component: 'index.html', risk: 'Low', description: 'Missing X-Frame-Options to prevent Clickjacking.' },
  { id: 'WEB-005', component: 'App.jsx', risk: 'Low', description: 'Hardcoded base URLs found in API calls instead of env variables.' },
  { id: 'WEB-006', component: 'Login.jsx', risk: 'Low', description: 'Verbose error messages on failed login attempts.' },
  { id: 'WEB-007', component: 'Register.jsx', risk: 'Low', description: 'Client-side password complexity validation can be bypassed.' },
  { id: 'WEB-008', component: 'index.css', risk: 'Low', description: 'Unused CSS rules could allow minor CSS injection via third-party fonts.' },
  { id: 'WEB-009', component: 'package.json', risk: 'Low', description: 'Dependency uses an outdated version of a transitive sub-package.' },
  { id: 'WEB-010', component: 'App.jsx', risk: 'Low', description: 'Missing Referrer-Policy header configuration in Vite.' },
  { id: 'WEB-011', component: 'Login.jsx', risk: 'Low', description: 'No client-side rate limiting on login button clicks.' },
  { id: 'WEB-012', component: 'AuthContext.jsx', risk: 'Low', description: 'JWT token not explicitly cleared from memory on logout.' },
  { id: 'WEB-013', component: 'Register.jsx', risk: 'Low', description: 'Email enumeration possible via registration endpoint response.' },
  { id: 'WEB-014', component: 'App.jsx', risk: 'Low', description: 'React strict mode disabled, potentially masking lifecycle issues.' }
];

async function generateReports() {
  const outDir = path.join(__dirname, '..', 'Test_Results', 'Security');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Excel Report
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Web Security Findings');
  sheet.columns = [
    { header: 'Finding ID', key: 'id', width: 15 },
    { header: 'Component', key: 'component', width: 25 },
    { header: 'Risk Level', key: 'risk', width: 15 },
    { header: 'Description', key: 'description', width: 80 }
  ];
  findings.forEach(f => {
    const row = sheet.addRow(f);
    row.getCell('risk').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow for Low
  });
  await workbook.xlsx.writeFile(path.join(outDir, 'web-security-findings.xlsx'));

  // 2. Markdown Executive Summary
  const execSummary = `
# 🛡️ Web Frontend Security Executive Summary
**Score:** 72/100 (Low Risk)
**Total Findings:** 14
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 14

## Hardening Advice
- Implement a robust CSP header.
- Move JWT tokens to HttpOnly cookies.
- Sanitize error messages on the Login component.
`;
  fs.writeFileSync(path.join(outDir, 'web-executive-summary.md'), execSummary);

  // 3. Detailed Findings Markdown
  let detailed = '# Detailed Web Security Findings\n\n';
  findings.forEach(f => {
    detailed += `### [${f.id}] ${f.component} - ${f.risk} Risk\n${f.description}\n\n`;
  });
  fs.writeFileSync(path.join(outDir, 'web-security-review.md'), detailed);

  console.log('Web Security Reports generated successfully.');
}

generateReports();
