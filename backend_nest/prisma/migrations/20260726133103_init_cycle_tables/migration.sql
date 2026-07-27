-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "import_batches" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_cycles" (
    "id" SERIAL NOT NULL,
    "importBatchId" INTEGER NOT NULL,
    "sourceRowNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "MACHINE" TEXT NOT NULL,
    "ORDERNO" TEXT NOT NULL,
    "PRODCODE" TEXT NOT NULL,
    "CASTCODE" TEXT NOT NULL,
    "MACH_DATE" TIMESTAMP(3) NOT NULL,
    "CEVRIMCOUNTER" INTEGER NOT NULL,
    "MENGAC" DECIMAL(10,3) NOT NULL,
    "ENJTIME" DECIMAL(10,3) NOT NULL,
    "MALTIME" DECIMAL(10,3) NOT NULL,
    "SOGZAMAN" DECIMAL(10,3) NOT NULL,
    "MENGKAP" DECIMAL(10,3) NOT NULL,
    "TIMERCEVRIM" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "production_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "production_cycles_MACHINE_idx" ON "production_cycles"("MACHINE");

-- CreateIndex
CREATE INDEX "production_cycles_MACH_DATE_idx" ON "production_cycles"("MACH_DATE");

-- CreateIndex
CREATE INDEX "production_cycles_ORDERNO_idx" ON "production_cycles"("ORDERNO");

-- CreateIndex
CREATE INDEX "production_cycles_PRODCODE_CASTCODE_MACHINE_MACH_DATE_idx" ON "production_cycles"("PRODCODE", "CASTCODE", "MACHINE", "MACH_DATE");

-- CreateIndex
CREATE UNIQUE INDEX "production_cycles_MACHINE_MACH_DATE_CEVRIMCOUNTER_key" ON "production_cycles"("MACHINE", "MACH_DATE", "CEVRIMCOUNTER");

-- CreateIndex
CREATE UNIQUE INDEX "production_cycles_importBatchId_sourceRowNumber_key" ON "production_cycles"("importBatchId", "sourceRowNumber");

-- AddForeignKey
ALTER TABLE "production_cycles" ADD CONSTRAINT "production_cycles_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
