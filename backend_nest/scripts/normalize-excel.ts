import * as path from 'node:path';
import * as XLSX from 'xlsx';

type ExcelRow = Record<string, unknown>;

type NormalizedCycle = {
  sourceRowNumber: number;
  machine: string;
  orderNo: string;
  productCode: string;
  castCode: string;
  machineDate: Date;
  cycleCounter: number;
  moldOpenTime: number;
  injectionTime: number;
  materialTime: number;
  coolingTime: number;
  moldCloseTime: number;
  cycleTime: number;
};

function normalizeRow(row: ExcelRow, sourceRowNumber: number): NormalizedCycle {
  return {
    sourceRowNumber,

    machine: String(row.MACHINE).trim(),
    orderNo: String(row.ORDERNO).trim(),
    productCode: String(row.PRODCODE).trim(),
    castCode: String(row.CASTCODE).trim(),

    machineDate: row.MACH_DATE as Date,
    cycleCounter: Number(row.CEVRIMCOUNTER),

    moldOpenTime: Number(row.MENGAC),
    injectionTime: Number(row.ENJTIME),
    materialTime: Number(row.MALTIME),
    coolingTime: Number(row.SOGZAMAN),
    moldCloseTime: Number(row.MENGKAP),
    cycleTime: Number(row.TIMERCEVRIM),
  };
}

const fileArgument = process.argv[2];

if (!fileArgument) {
  console.error('Example: npm run normalize:excel -- "data/enj0130-3.xls"');

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

const rawRows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
  defval: null,
  raw: true,
});

const normalizedRows = rawRows.map((row, index) => {
  const sourceRowNumber = index + 2;

  return normalizeRow(row, sourceRowNumber);
});

console.log(`Normalized rows: ${normalizedRows.length}`);

console.log('First three normalized rows:');

console.dir(normalizedRows.slice(0, 3), {
  depth: null,
});
