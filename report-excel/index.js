#!/usr/bin/env node
/**
 * Convert a Playwright JSON report into a styled Excel workbook.
 *
 * Usage: node index.js [input.json] [output.xlsx]
 *   defaults: ../test-results.json -> ./playwright-report.xlsx
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const inputPath = path.resolve(process.argv[2] || path.join(__dirname, '..', 'test-results.json'));
const outputPath = path.resolve(process.argv[3] || path.join(__dirname, 'playwright-report.xlsx'));

const COLORS = {
  primary: 'FF2E3A59',
  primaryLight: 'FFE8ECF4',
  white: 'FFFFFFFF',
  border: 'FFD0D5DD',
  zebra: 'FFF7F9FC',
  passed: { fg: 'FF1E7B34', bg: 'FFD4EDDA' },
  failed: { fg: 'FFA71D2A', bg: 'FFF8D7DA' },
  flaky: { fg: 'FF8A6D00', bg: 'FFFFF3CD' },
  skipped: { fg: 'FF5A6270', bg: 'FFE2E3E5' },
};

const STATUS_STYLE = {
  passed: COLORS.passed,
  failed: COLORS.failed,
  timedOut: COLORS.failed,
  interrupted: COLORS.failed,
  flaky: COLORS.flaky,
  skipped: COLORS.skipped,
};

const thinBorder = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

function formatDuration(ms) {
  if (ms == null) return '-';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)} s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

// Strip ANSI color codes that Playwright embeds in error messages.
const stripAnsi = (str = '') => str.replace(/\u001b\[[0-9;]*m/g, '');

/** Recursively flatten suites -> specs -> tests into one row per test. */
function collectTests(suites, parentTitles = []) {
  const rows = [];
  for (const suite of suites || []) {
    const titles = suite.title ? [...parentTitles, suite.title] : parentTitles;
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const results = test.results || [];
        const last = results[results.length - 1] || {};
        let status = last.status || 'skipped';
        if (test.status === 'flaky') status = 'flaky';
        if (test.status === 'skipped') status = 'skipped';

        const errors = results
          .flatMap((r) => r.errors || [])
          .map((e) => stripAnsi(e.message || e.value || ''))
          .filter(Boolean);

        rows.push({
          file: spec.file || suite.file,
          suite: titles.slice(1).join(' › ') || '-',
          title: spec.title,
          project: test.projectName || '-',
          status,
          duration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
          retries: Math.max(0, results.length - 1),
          startTime: last.startTime ? new Date(last.startTime) : null,
          location: `${spec.file}:${spec.line}:${spec.column}`,
          tags: (spec.tags || []).join(', '),
          error: errors.join('\n\n'),
        });
      }
    }
    rows.push(...collectTests(suite.suites, titles));
  }
  return rows;
}

function styleHeaderRow(row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 11 };
    cell.fill = fill(COLORS.primary);
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder;
  });
}

function styleStatusCell(cell, status) {
  const style = STATUS_STYLE[status] || COLORS.skipped;
  cell.value = status.toUpperCase();
  cell.font = { bold: true, color: { argb: style.fg } };
  cell.fill = fill(style.bg);
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
}

function addTitle(sheet, text, subtitle, lastCol) {
  sheet.mergeCells(`A1:${lastCol}1`);
  const title = sheet.getCell('A1');
  title.value = text;
  title.font = { bold: true, size: 18, color: { argb: COLORS.white } };
  title.fill = fill(COLORS.primary);
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(1).height = 36;

  sheet.mergeCells(`A2:${lastCol}2`);
  const sub = sheet.getCell('A2');
  sub.value = subtitle;
  sub.font = { italic: true, color: { argb: 'FF5A6270' } };
  sub.fill = fill(COLORS.primaryLight);
  sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 20;
}

function buildSummarySheet(wb, report, tests) {
  const sheet = wb.addWorksheet('Summary', {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: COLORS.primary } },
  });
  sheet.columns = [{ width: 4 }, { width: 28 }, { width: 22 }, { width: 14 }, { width: 4 }, { width: 28 }, { width: 40 }];

  const { stats = {}, config = {} } = report;
  const startTime = stats.startTime ? new Date(stats.startTime) : null;
  addTitle(
    sheet,
    'Playwright Test Report',
    `Generated ${new Date().toLocaleString()}  •  Run started ${startTime ? startTime.toLocaleString() : '-'}`,
    'G'
  );

  const counts = {
    passed: stats.expected || 0,
    failed: stats.unexpected || 0,
    flaky: stats.flaky || 0,
    skipped: stats.skipped || 0,
  };
  const total = counts.passed + counts.failed + counts.flaky + counts.skipped;
  const passRate = total ? counts.passed / total : 0;
  const overall = counts.failed > 0 ? 'failed' : counts.flaky > 0 ? 'flaky' : 'passed';

  // Overall banner
  sheet.mergeCells('B4:D5');
  const banner = sheet.getCell('B4');
  const bannerStyle = STATUS_STYLE[overall];
  banner.value = overall === 'passed' ? '✔  ALL TESTS PASSED' : overall === 'flaky' ? '⚠  PASSED WITH FLAKY TESTS' : '✘  TEST RUN FAILED';
  banner.font = { bold: true, size: 16, color: { argb: bannerStyle.fg } };
  banner.fill = fill(bannerStyle.bg);
  banner.alignment = { vertical: 'middle', horizontal: 'center' };
  banner.border = thinBorder;

  // Results table
  const headerRow = sheet.getRow(7);
  headerRow.getCell(2).value = 'Result';
  headerRow.getCell(3).value = 'Count';
  headerRow.getCell(4).value = '%';
  [2, 3, 4].forEach((c) => {
    const cell = headerRow.getCell(c);
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.fill = fill(COLORS.primary);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });
  headerRow.height = 22;

  const lines = [
    ['passed', 'Passed', counts.passed],
    ['failed', 'Failed', counts.failed],
    ['flaky', 'Flaky', counts.flaky],
    ['skipped', 'Skipped', counts.skipped],
  ];
  lines.forEach(([key, label, value], i) => {
    const row = sheet.getRow(8 + i);
    const style = STATUS_STYLE[key];
    row.getCell(2).value = label;
    row.getCell(2).font = { bold: true, color: { argb: style.fg } };
    row.getCell(2).fill = fill(style.bg);
    row.getCell(3).value = value;
    row.getCell(4).value = total ? value / total : 0;
    row.getCell(4).numFmt = '0.0%';
    [2, 3, 4].forEach((c) => {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle', indent: c === 2 ? 1 : 0 };
    });
    row.height = 20;
  });

  const totalRow = sheet.getRow(12);
  totalRow.getCell(2).value = 'Total';
  totalRow.getCell(3).value = total;
  totalRow.getCell(4).value = total ? 1 : 0;
  totalRow.getCell(4).numFmt = '0.0%';
  [2, 3, 4].forEach((c) => {
    const cell = totalRow.getCell(c);
    cell.font = { bold: true };
    cell.fill = fill(COLORS.primaryLight);
    cell.border = { ...thinBorder, top: { style: 'medium', color: { argb: COLORS.primary } } };
    cell.alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle', indent: c === 2 ? 1 : 0 };
  });

  // Pass rate with a simple text progress bar
  sheet.getCell('B14').value = 'Pass Rate';
  sheet.getCell('B14').font = { bold: true, size: 12 };
  sheet.getCell('C14').value = passRate;
  sheet.getCell('C14').numFmt = '0.0%';
  sheet.getCell('C14').font = { bold: true, size: 14, color: { argb: passRate === 1 ? COLORS.passed.fg : COLORS.failed.fg } };
  sheet.mergeCells('B15:D15');
  const bar = sheet.getCell('B15');
  const filled = Math.round(passRate * 30);
  bar.value = '█'.repeat(filled) + '░'.repeat(30 - filled);
  bar.font = { color: { argb: passRate === 1 ? COLORS.passed.fg : COLORS.flaky.fg }, size: 12 };

  // Run info panel
  const durations = tests.map((t) => t.duration);
  const slowest = tests.reduce((a, b) => (b.duration > (a?.duration ?? -1) ? b : a), null);
  const info = [
    ['Run Information', null],
    ['Playwright version', config.version || '-'],
    ['Projects', (config.projects || []).map((p) => p.name).join(', ') || '-'],
    ['Workers', config.metadata?.actualWorkers ?? config.workers ?? '-'],
    ['Total duration', formatDuration(stats.duration)],
    ['Average test time', formatDuration(durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null)],
    ['Slowest test', slowest ? `${slowest.title} (${formatDuration(slowest.duration)})` : '-'],
    ['Test files', new Set(tests.map((t) => t.file)).size],
    ['Global errors', (report.errors || []).length],
  ];
  info.forEach(([label, value], i) => {
    const row = sheet.getRow(7 + i);
    const labelCell = row.getCell(6);
    const valueCell = row.getCell(7);
    labelCell.value = label;
    if (i === 0) {
      sheet.mergeCells(7, 6, 7, 7);
      labelCell.font = { bold: true, color: { argb: COLORS.white } };
      labelCell.fill = fill(COLORS.primary);
      labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
      labelCell.border = thinBorder;
      return;
    }
    valueCell.value = value;
    labelCell.font = { bold: true, color: { argb: 'FF3C4657' } };
    labelCell.fill = fill(COLORS.primaryLight);
    [labelCell, valueCell].forEach((c) => {
      c.border = thinBorder;
      c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    });
    row.height = 20;
  });
}

function buildDetailsSheet(wb, tests) {
  const sheet = wb.addWorksheet('Test Details', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
    properties: { tabColor: { argb: 'FF4472C4' } },
  });

  const columns = [
    { header: '#', key: 'no', width: 6 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Test', key: 'title', width: 40 },
    { header: 'File', key: 'file', width: 26 },
    { header: 'Suite', key: 'suite', width: 24 },
    { header: 'Project', key: 'project', width: 12 },
    { header: 'Duration', key: 'duration', width: 12 },
    { header: 'Retries', key: 'retries', width: 9 },
    { header: 'Started At', key: 'startTime', width: 21 },
    { header: 'Location', key: 'location', width: 26 },
    { header: 'Tags', key: 'tags', width: 14 },
  ];
  sheet.columns = columns.map(({ key, width }) => ({ key, width }));

  addTitle(sheet, 'Test Details', `${tests.length} test(s) — use the filter arrows to sort or filter`, 'K');

  const header = sheet.getRow(3);
  columns.forEach((c, i) => (header.getCell(i + 1).value = c.header));
  styleHeaderRow(header);

  tests.forEach((t, i) => {
    const row = sheet.addRow({
      no: i + 1,
      status: t.status,
      title: t.title,
      file: t.file,
      suite: t.suite,
      project: t.project,
      duration: t.duration / 1000,
      retries: t.retries,
      startTime: t.startTime,
      location: t.location,
      tags: t.tags || '-',
    });
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (i % 2 === 1) cell.fill = fill(COLORS.zebra);
    });
    row.getCell('no').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('duration').numFmt = '0.00 "s"';
    row.getCell('retries').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('startTime').numFmt = 'yyyy-mm-dd hh:mm:ss';
    styleStatusCell(row.getCell('status'), t.status);
  });

  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: columns.length } };
}

function buildFailuresSheet(wb, tests) {
  const failures = tests.filter((t) => t.error || ['failed', 'timedOut', 'interrupted', 'flaky'].includes(t.status));
  const sheet = wb.addWorksheet('Failures', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
    properties: { tabColor: { argb: failures.length ? 'FFC00000' : 'FF70AD47' } },
  });
  sheet.columns = [{ width: 6 }, { width: 12 }, { width: 36 }, { width: 26 }, { width: 90 }];
  addTitle(sheet, 'Failures & Errors', failures.length ? `${failures.length} test(s) need attention` : 'No failures', 'E');

  const header = sheet.getRow(3);
  ['#', 'Status', 'Test', 'Location', 'Error Message'].forEach((h, i) => (header.getCell(i + 1).value = h));
  styleHeaderRow(header);

  if (!failures.length) {
    sheet.mergeCells('A4:E4');
    const cell = sheet.getCell('A4');
    cell.value = '🎉  No failures — every test passed!';
    cell.font = { bold: true, size: 13, color: { argb: COLORS.passed.fg } };
    cell.fill = fill(COLORS.passed.bg);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(4).height = 30;
    return;
  }

  failures.forEach((t, i) => {
    const row = sheet.addRow([i + 1, t.status, t.title, t.location, t.error || '-']);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder;
      cell.alignment = { vertical: 'top', wrapText: true };
    });
    row.getCell(5).font = { name: 'Consolas', size: 9, color: { argb: COLORS.failed.fg } };
    styleStatusCell(row.getCell(2), t.status);
    row.height = Math.min(300, Math.max(30, (t.error.split('\n').length || 1) * 13));
  });
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const tests = collectTests(report.suites);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Playwright Excel Reporter';
  wb.created = new Date();

  buildSummarySheet(wb, report, tests);
  buildDetailsSheet(wb, tests);
  buildFailuresSheet(wb, tests);

  await wb.xlsx.writeFile(outputPath);
  const passed = tests.filter((t) => t.status === 'passed').length;
  console.log(`Excel report written to ${outputPath}`);
  console.log(`  ${passed}/${tests.length} passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
