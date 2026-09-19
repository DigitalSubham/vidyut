-- DropIndex
DROP INDEX "Class_branchId_name_key";

-- DropIndex
DROP INDEX "Section_classId_name_key";

-- CreateIndex
-- Partial unique index: only rows that haven't been soft-deleted compete for
-- the (branchId, name) / (classId, name) slot, so recreating a class/section
-- with a name that a soft-deleted row still holds no longer 409s. Also
-- serves as the lookup index for the (deletedAt IS NULL) queries every
-- listClasses/listSections call already uses.
CREATE UNIQUE INDEX "Class_branchId_name_active_key" ON "Class"("branchId", "name") WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Section_classId_name_active_key" ON "Section"("classId", "name") WHERE "deletedAt" IS NULL;
