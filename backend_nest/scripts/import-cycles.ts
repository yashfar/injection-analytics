import * as path from 'node:path';
import * as XLSX from 'xlsx';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

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

const chunkSize = 5000;

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

function validateRow(row: ExcelRow): string[] {
  const errors: string[] = [];

  for (const field of ['MACHINE', 'ORDERNO', 'PRODCODE', 'CASTCODE']) {
    if (!isNonEmptyText(row[field])) {
      errors.push(`${field} is empty`);
    }
  }

  if (!isValidDate(row.MACH_DATE)) {
    errors.push('MACH_DATE is invalid');
  }

  if (
    typeof row.CEVRIMCOUNTER !== 'number' ||
    !Number.isInteger(row.CEVRIMCOUNTER) ||
    row.CEVRIMCOUNTER < 0
  ) {
    errors.push('CEVRIMCOUNTER is invalid');
  }

  for (const field of componentTimeColumns) {
    const value = row[field];

    if (!isFiniteNumber(value) || value < 0) {
      errors.push(`${field} is invalid`);
    }
  }

  if (!isFiniteNumber(row.TIMERCEVRIM) || row.TIMERCEVRIM <= 0) {
    errors.push('TIMERCEVRIM is invalid');
  }

  return errors;
}

function normalizeRow(
  row: ExcelRow,
  sourceRowNumber: number,
  importBatchId: number,
) {
  return {
    importBatchId,
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

async function main(): Promise<void> {
  const fileArgument = process.argv[2];

  if (!fileArgument) {
    throw new Error('Example: npm run import:cycles -- "data/enj0130-3.xls"');
  }

  const filePath = path.resolve(fileArgument);
  const fileName = path.basename(filePath);

  console.log(`Reading ${fileName}...`);

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

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const prisma = app.get(PrismaService);

  const importBatch = await prisma.importBatch.create({
    data: {
      fileName,
      totalRows: rawRows.length,
    },
  });

  try {
    const actualColumns = Object.keys(rawRows[0] ?? {});

    const missingColumns = requiredColumns.filter(
      (column) => !actualColumns.includes(column),
    );

    if (missingColumns.length > 0) {
      throw new Error(`Missing columns: ${missingColumns.join(', ')}`);
    }

    const validRows: ReturnType<typeof normalizeRow>[] = [];
    const sampleErrors: string[] = [];

    let invalidRowCount = 0;

    rawRows.forEach((row, index) => {
      const sourceRowNumber = index + 2;
      const errors = validateRow(row);

      if (errors.length > 0) {
        invalidRowCount += 1;

        if (sampleErrors.length < 10) {
          sampleErrors.push(`Row ${sourceRowNumber}: ${errors.join(', ')}`);
        }

        return;
      }

      validRows.push(normalizeRow(row, sourceRowNumber, importBatch.id));
    });

    let importedRowCount = 0;
    let duplicateRowCount = 0;

    for (
      let startIndex = 0;
      startIndex < validRows.length;
      startIndex += chunkSize
    ) {
      const chunk = validRows.slice(startIndex, startIndex + chunkSize);

      const result = await prisma.productionCycle.createMany({
        data: chunk,
        skipDuplicates: true,
      });

      importedRowCount += result.count;
      duplicateRowCount += chunk.length - result.count;

      console.log(
        `Processed ${Math.min(
          startIndex + chunk.length,
          validRows.length,
        )} / ${validRows.length}`,
      );
    }

    await prisma.importBatch.update({
      where: {
        id: importBatch.id,
      },
      data: {
        status: 'COMPLETED',
        importedRows: importedRowCount,
        duplicateRows: duplicateRowCount,
        errorRows: invalidRowCount,
        completedAt: new Date(),
      },
    });

    console.log('');
    console.log('Import completed');
    console.log(`File: ${fileName}`);
    console.log(`Total rows: ${rawRows.length}`);
    console.log(`Imported rows: ${importedRowCount}`);
    console.log(`Duplicate rows: ${duplicateRowCount}`);
    console.log(`Invalid rows: ${invalidRowCount}`);

    if (sampleErrors.length > 0) {
      console.log('First validation errors:');
      console.log(sampleErrors);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await prisma.importBatch.update({
      where: {
        id: importBatch.id,
      },
      data: {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
      },
    });

    throw error;
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('Import failed:', error);
  process.exitCode = 1;
});
