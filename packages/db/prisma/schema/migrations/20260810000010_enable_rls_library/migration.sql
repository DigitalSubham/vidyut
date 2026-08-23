-- Unit 58 — RLS for Book/BookCopy/LibraryMember/BookIssue.
ALTER TABLE "Book" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Book" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Book"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "BookCopy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookCopy" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BookCopy"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "LibraryMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LibraryMember" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LibraryMember"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "BookIssue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookIssue" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BookIssue"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
