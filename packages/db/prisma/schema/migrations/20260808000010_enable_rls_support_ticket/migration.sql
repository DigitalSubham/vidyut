-- Unit 56 — RLS for SupportTicket, same posture as AuditLog: tenant-owned
-- and RLS-scoped even though the platform side reads/writes it, always via
-- withTenant(thatTenantId, ...) for the specific tenant in question.
ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SupportTicket"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
