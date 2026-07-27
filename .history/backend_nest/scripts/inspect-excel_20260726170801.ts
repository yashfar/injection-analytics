import * as path from 'node:path';
import * as XLSX from 'xlsx';

type ExcelRow = Record<string, unknown>;

const fileArgument = process.argv[2];

if (!fileArgument) {
  console.error('Please provide an Excel file path.');
  console.error('Example: npm run inspect:excel -- "data/enj0130-3.xls"');

  process.exit(1);
}

const filePath = path.resolve(fileArgument);

console.log(`Reading file: ${filePath}`);

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

console.log(`Sheet name: ${sheetName}`);
console.log(`Row count: ${rows.length}`);

if (rows.length > 0) {
  console.log('Columns:');
  console.log(Object.keys(rows[0]));

  console.log('First three rows:');
  console.dir(rows.slice(0, 3), {
    depth: null,
  });
}
