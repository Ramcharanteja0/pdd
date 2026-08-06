import ExcelJS from 'exceljs';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function createExcelReport(testResults, outputPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CrowdIQ Selenium Tests';
  workbook.created = new Date();

  // ─── Sheet 1: Test Summary ─────────────────────────────────
  const summarySheet = workbook.addWorksheet('Test Summary');
  summarySheet.columns = [
    { header: 'Category', key: 'category', width: 35 },
    { header: 'Total Tests', key: 'total', width: 14 },
    { header: 'Passed', key: 'passed', width: 12 },
    { header: 'Failed', key: 'failed', width: 12 },
    { header: 'Skipped', key: 'skipped', width: 12 },
    { header: 'Pass Rate', key: 'passRate', width: 14 },
  ];

  // Style header row
  summarySheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center' };
  });

  // Group by category
  const categories = {};
  testResults.forEach(r => {
    if (!categories[r.category]) categories[r.category] = { total: 0, passed: 0, failed: 0, skipped: 0 };
    categories[r.category].total++;
    if (r.status === 'Passed') categories[r.category].passed++;
    else if (r.status === 'Failed') categories[r.category].failed++;
    else categories[r.category].skipped++;
  });

  Object.entries(categories).forEach(([cat, stats]) => {
    const rate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) + '%' : '0%';
    summarySheet.addRow({ category: cat, total: stats.total, passed: stats.passed, failed: stats.failed, skipped: stats.skipped, passRate: rate });
  });

  // Add totals row
  const totals = testResults.reduce((acc, r) => {
    acc.total++;
    if (r.status === 'Passed') acc.passed++;
    else if (r.status === 'Failed') acc.failed++;
    else acc.skipped++;
    return acc;
  }, { total: 0, passed: 0, failed: 0, skipped: 0 });
  const totalRate = totals.total > 0 ? ((totals.passed / totals.total) * 100).toFixed(1) + '%' : '0%';
  const totalRow = summarySheet.addRow({ category: '📊 GRAND TOTAL', total: totals.total, passed: totals.passed, failed: totals.failed, skipped: totals.skipped, passRate: totalRate });
  totalRow.eachCell(cell => { cell.font = { bold: true }; });

  // ─── Sheet 2: Test Details ─────────────────────────────────
  const detailsSheet = workbook.addWorksheet('Test Details');
  detailsSheet.columns = [
    { header: '#', key: 'index', width: 6 },
    { header: 'Test ID', key: 'id', width: 12 },
    { header: 'Category', key: 'category', width: 32 },
    { header: 'Test Name', key: 'name', width: 45 },
    { header: 'Description', key: 'desc', width: 50 },
    { header: 'Steps', key: 'steps', width: 55 },
    { header: 'Expected Result', key: 'expected', width: 50 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Execution Time (ms)', key: 'time', width: 18 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Severity', key: 'severity', width: 12 },
  ];

  // Style header row
  detailsSheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center' };
  });

  testResults.forEach((r, i) => {
    const row = detailsSheet.addRow({
      index: i + 1, id: r.id, category: r.category, name: r.name,
      desc: r.desc, steps: r.steps, expected: r.expected,
      status: r.status, time: r.time, priority: r.priority, severity: r.severity,
    });
    // Color status cell
    const statusCell = row.getCell('status');
    if (r.status === 'Passed') statusCell.font = { color: { argb: 'FF008000' }, bold: true };
    else if (r.status === 'Failed') statusCell.font = { color: { argb: 'FFFF0000' }, bold: true };
    else statusCell.font = { color: { argb: 'FFFF8C00' }, bold: true };
  });

  // Write file
  const dir = join(__dirname, '..', dirname(outputPath));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const fullPath = join(__dirname, '..', outputPath);
  await workbook.xlsx.writeFile(fullPath);
  console.log(`📊 Excel report: ${fullPath}`);
}
