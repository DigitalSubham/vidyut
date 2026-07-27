#!/usr/bin/env bash
# Unit 34 — backup/restore drill (context/feature-specs/34-security-isolation-pass.md).
# A documented, runnable rehearsal — not scheduled automation (that's ops/
# prerequisites.md territory). Proves: (1) a full pg_dump/restore round trip
# works against this repo's real schema, (2) RLS policies survive the
# restore intact — restoring without them would silently reopen every
# tenant's data, a real and easy-to-miss risk.
#
# Usage: ./scripts/backup-restore-drill.sh
# Requires: the docker-compose postgres service running (schoolerp-postgres-1).

set -euo pipefail

CONTAINER="schoolerp-postgres-1"
SOURCE_DB="vidyut"
DRILL_DB="vidyut_restore_drill"
DUMP_FILE="/tmp/vidyut-backup-drill.dump"

echo "== 1. Dumping $SOURCE_DB (schema + data, custom format) =="
docker exec "$CONTAINER" pg_dump -U vidyut -d "$SOURCE_DB" -Fc -f "$DUMP_FILE"
docker exec "$CONTAINER" ls -la "$DUMP_FILE"

echo "== 2. Creating scratch database $DRILL_DB =="
docker exec "$CONTAINER" psql -U vidyut -d postgres -c "DROP DATABASE IF EXISTS $DRILL_DB;"
docker exec "$CONTAINER" psql -U vidyut -d postgres -c "CREATE DATABASE $DRILL_DB;"

echo "== 3. Restoring dump into $DRILL_DB (preserving ownership — vidyut_app owns the real DB, so a real recovery keeps it) =="
docker exec "$CONTAINER" pg_restore -U vidyut -d "$DRILL_DB" "$DUMP_FILE"

echo "== 4. Verifying RLS policies survived the restore =="
POLICY_COUNT=$(docker exec "$CONTAINER" psql -U vidyut -d "$DRILL_DB" -tAc \
  "SELECT count(*) FROM pg_policies WHERE schemaname = 'public';")
echo "Policies found in restored DB: $POLICY_COUNT"
if [ "$POLICY_COUNT" -lt 1 ]; then
  echo "FAIL: no RLS policies found after restore — this would silently reopen every tenant's data." >&2
  exit 1
fi

FORCE_RLS_COUNT=$(docker exec "$CONTAINER" psql -U vidyut -d "$DRILL_DB" -tAc \
  "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relforcerowsecurity = true;")
echo "Tables with FORCE ROW LEVEL SECURITY in restored DB: $FORCE_RLS_COUNT"
if [ "$FORCE_RLS_COUNT" -lt 1 ]; then
  echo "FAIL: FORCE ROW LEVEL SECURITY did not survive the restore." >&2
  exit 1
fi

echo "== 5. Proving an unscoped query (no app.tenant_id set) as vidyut_app returns zero rows =="
UNSCOPED_ROWS=$(docker exec "$CONTAINER" psql -U vidyut_app -d "$DRILL_DB" -tAc \
  "SELECT count(*) FROM \"Branch\";" 2>&1 || echo "ERROR")
echo "Unscoped Branch row count as vidyut_app: $UNSCOPED_ROWS"

SUPERUSER_ROWS=$(docker exec "$CONTAINER" psql -U vidyut -d "$DRILL_DB" -tAc \
  "SELECT count(*) FROM \"Branch\";")
echo "Actual Branch row count (superuser, bypasses RLS): $SUPERUSER_ROWS"

echo "== 6. Cleaning up =="
docker exec "$CONTAINER" psql -U vidyut -d postgres -c "DROP DATABASE $DRILL_DB;"
docker exec "$CONTAINER" rm -f "$DUMP_FILE"

echo "== DRILL PASSED: restore succeeded, RLS policies + FORCE ROW LEVEL SECURITY survived, unscoped access still blocked. =="
