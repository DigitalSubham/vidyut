-- Unit 24: optional direct student login (nullable, unique) — same pattern
-- as Guardian.userId. Hand-written because `prisma migrate dev` refuses
-- non-interactively for a nullable-then-unique column warning.

ALTER TABLE "Student" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
