import ExcelJS from 'exceljs';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function createExcelReport({
  title = 'TravelSync Test Report',
  creator = 'TravelSync Automated Testing Suite',
  summaryCategories = {},
  testResults = [],
  outputPath = 'artifacts/report.xlsx',
  themeColor = 'FF4F46E5' // Indigo
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = creator;
  workbook.created = new Date();

  // ─── Sheet 1: Executive Summary ─────────────────────────────
  const summarySheet = workbook.addWorksheet('Executive Summary');
  summarySheet.columns = [
    { header: 'Category / Component', key: 'category', width: 38 },
    { header: 'Total Tests', key: 'total', width: 15 },
    { header: 'Passed', key: 'passed', width: 14 },
    { header: 'Failed', key: 'failed', width: 14 },
    { header: 'Skipped', key: 'skipped', width: 14 },
    { header: 'Pass Rate', key: 'passRate', width: 16 }
  ];

  // Header styling
  summarySheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  let grandSkipped = 0;

  // Process categories
  const categories = {};
  testResults.forEach(r => {
    const cat = r.category || 'General';
    if (!categories[cat]) categories[cat] = { total: 0, passed: 0, failed: 0, skipped: 0 };
    categories[cat].total++;
    if (r.status === 'Passed') categories[cat].passed++;
    else if (r.status === 'Failed') categories[cat].failed++;
    else categories[cat].skipped++;

    grandTotal++;
    if (r.status === 'Passed') grandPassed++;
    else if (r.status === 'Failed') grandFailed++;
    else grandSkipped++;
  });

  Object.entries(categories).forEach(([cat, stats]) => {
    const rate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) + '%' : '100.0%';
    const row = summarySheet.addRow({
      category: cat,
      total: stats.total,
      passed: stats.passed,
      failed: stats.failed,
      skipped: stats.skipped,
      passRate: rate
    });
    row.getCell('passRate').font = { bold: true, color: { argb: 'FF059669' } };
  });

  // Grand Total Row
  const totalRate = grandTotal > 0 ? ((grandPassed / grandTotal) * 100).toFixed(1) + '%' : '100.0%';
  const totalRow = summarySheet.addRow({
    category: '📊 GRAND TOTAL (TravelSync)',
    total: grandTotal,
    passed: grandPassed,
    failed: grandFailed,
    skipped: grandSkipped,
    passRate: totalRate
  });
  totalRow.eachCell(cell => {
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  });

  // ─── Sheet 2: Detailed Test Cases ───────────────────────────
  const detailsSheet = workbook.addWorksheet('Test Case Details');
  detailsSheet.columns = [
    { header: '#', key: 'index', width: 6 },
    { header: 'Test ID', key: 'id', width: 14 },
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Test Case Name', key: 'name', width: 45 },
    { header: 'Description', key: 'desc', width: 50 },
    { header: 'Execution Steps', key: 'steps', width: 55 },
    { header: 'Expected Result', key: 'expected', width: 45 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Duration (ms)', key: 'time', width: 15 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Severity', key: 'severity', width: 12 }
  ];

  detailsSheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  testResults.forEach((r, i) => {
    const row = detailsSheet.addRow({
      index: i + 1,
      id: r.id,
      category: r.category,
      name: r.name,
      desc: r.desc,
      steps: r.steps,
      expected: r.expected,
      status: r.status,
      time: r.time,
      priority: r.priority || 'High',
      severity: r.severity || 'Major'
    });

    const statusCell = row.getCell('status');
    statusCell.font = { bold: true, color: { argb: 'FF059669' } };
  });

  // Ensure target folder exists
  const absOutputPath = join(process.cwd(), outputPath);
  const dir = dirname(absOutputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  await workbook.xlsx.writeFile(absOutputPath);
  console.log(`📊 TravelSync Excel Report written: ${absOutputPath}`);
  return absOutputPath;
}
