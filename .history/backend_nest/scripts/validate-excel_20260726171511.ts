import * as path from 'node:path';
import * as XLSX from 'xlsx';

type ExcelRow = Record<string, unknown>;

const requiredColumns = [
  'MACHINE',
  'ORDERNO',
  'PRODCODE',
  'CASTCODE',
  'MACH_DATE',
  'CEVRIMCOUNTER',
  'MENGAC',
  'ENJTIME',
  'MALTIME',
  'SOGZAMAN',
  'MENGKAP',
  'TIMERCEVRIM',
] as const;

const componentTimeColumns = [
  'MENGAC',
  'ENJTIME',
  'MALTIME',
  'SOGZAMAN',
  'MENGKAP',
] as const;

function isNonEmptyText(value: unknown): boolean {
  return (
    (typeof value === 'string' || typeof value === 'number') &&
    String(value).trim().length > 0
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function validateRow(row: ExcelRow, excelRowNumber: number): string[] {
  const errors: string[] = [];

  for (const field of ['MACHINE', 'ORDERNO', 'PRODCODE', 'CASTCODE']) {
    if (!isNonEmptyText(row[field])) {
      errors.push(`Row ${excelRowNumber}: ${field} is empty`);
    }
  }

  if (!isValidDate(row.MACH_DATE)) {
    errors.push(`Row ${excelRowNumber}: MACH_DATE is invalid`);
  }

  if (!Number.isInteger(row.CEVRIMCOUNTER) || Number(row.CEVRIMCOUNTER) < 0) {
    errors.push(`Row ${excelRowNumber}: CEVRIMCOUNTER is invalid`);
  }

  for (const field of componentTimeColumns) {
    const value = row[field];

    if (!isFiniteNumber(value) || value < 0) {
      errors.push(`Row ${excelRowNumber}: ${field} is invalid`);
    }
  }

  if (!isFiniteNumber(row.TIMERCEVRIM) || row.TIMERCEVRIM <= 0) {
    errors.push(`Row ${excelRowNumber}: TIMERCEVRIM is invalid`);
  }

  return errors;
}

const fileArgument = process.argv[2];

if (!fileArgument) {
  console.error('Example: npm run validate:excel -- "data/enj0130-3.xls"');

  process.exit(1);
}

const filePath = path.resolve(fileArgument);

const workbook = XLSX.readFile(filePath, {
  cellDates: true,
});

const sheetName = workbook.SheetNames[0];

if (!sheetName) {
  throw new Error('The Excel file does not contain any sheets.');
}

const worksheet = workbook.Sheets[sheetName];

const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
  defval: null,
  raw: true,
});

const actualColumns = Object.keys(rows[0] ?? {});

const missingColumns = requiredColumns.filter(
  (column) => !actualColumns.includes(column),
);

if (missingColumns.length > 0) {
  console.error('Missing required columns:', missingColumns);
  process.exit(1);
}

let validRowCount = 0;
let invalidRowCount = 0;

const sampleErrors: string[] = [];

rows.forEach((row, index) => {
  // Header is Excel row 1, so first data row is row 2.
  const excelRowNumber = index + 2;
  const errors = validateRow(row, excelRowNumber);

  if (errors.length === 0) {
    validRowCount += 1;
    return;
  }

  invalidRowCount += 1;

  if (sampleErrors.length < 10) {
    sampleErrors.push(...errors);
  }
});

console.log(`File: ${path.basename(filePath)}`);
console.log(`Total rows: ${rows.length}`);
console.log(`Valid rows: ${validRowCount}`);
console.log(`Invalid rows: ${invalidRowCount}`);

if (sampleErrors.length > 0) {
  console.log('First validation errors:');
  console.log(sampleErrors.slice(0, 10));
} else {
  console.log('All rows passed validation.');
}
