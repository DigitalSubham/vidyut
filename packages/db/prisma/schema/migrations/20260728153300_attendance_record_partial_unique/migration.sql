-- Partial uniques replacing AttendanceRecord's old (studentId, date) unique:
-- one row per day when periodId IS NULL (daily attendance), one row per
-- period when it isn't (period-wise attendance) — Prisma can't express a
-- partial unique index in-schema, so this is a hand-written migration.
CREATE UNIQUE INDEX "AttendanceRecord_daily_unique"
  ON "AttendanceRecord" ("studentId", "date")
  WHERE "periodId" IS NULL;

CREATE UNIQUE INDEX "AttendanceRecord_period_unique"
  ON "AttendanceRecord" ("studentId", "date", "periodId")
  WHERE "periodId" IS NOT NULL;
