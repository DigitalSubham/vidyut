-- Unit 37 — Global Search. pg_trgm gives ILIKE/substring queries a usable
-- index (standard extension on RDS/any Postgres 16); not represented in
-- schema.prisma (same raw-SQL-migration pattern as the RLS migrations),
-- so `prisma migrate dev` diffing never tries to drop it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS student_first_name_trgm_idx ON "Student" USING GIN ("firstName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS student_last_name_trgm_idx ON "Student" USING GIN ("lastName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS student_admission_no_trgm_idx ON "Student" USING GIN ("admissionNo" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS user_name_trgm_idx ON "User" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS invoice_number_trgm_idx ON "Invoice" USING GIN ("number" gin_trgm_ops);
