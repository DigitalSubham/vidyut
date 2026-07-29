-- DropIndex
DROP INDEX "AttendanceRecord_studentId_date_key";

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "periodId" TEXT,
ALTER COLUMN "markedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "attendanceDeviceToken" TEXT;

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_date_idx" ON "AttendanceRecord"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_attendanceDeviceToken_key" ON "Branch"("attendanceDeviceToken");

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "TimetablePeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
