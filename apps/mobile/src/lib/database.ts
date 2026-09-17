import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { appSchema, tableSchema, Model } from "@nozbe/watermelondb";
import { field, date, readonly } from "@nozbe/watermelondb/decorators";
import { schemaMigrations, addColumns } from "@nozbe/watermelondb/Schema/migrations";

/**
 * Offline attendance storage (context/feature-specs/16's scope #1-2) — a
 * local mirror of what will sync to Unit 15's POST /attendance. `id` is the
 * client-generated cuid this unit produces, reused as AttendanceRecord.id
 * server-side for idempotent upsert (data-model.md §8's own note).
 *
 * `period_id` (Unit 44) is optional and null for daily attendance — a local
 * mirror of the server's own daily-vs-period-wise distinction
 * (AttendanceRecord.periodId), not a separate table.
 */
const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: "attendance_records",
      columns: [
        { name: "branch_id", type: "string" },
        { name: "section_id", type: "string" },
        { name: "student_id", type: "string" },
        { name: "date", type: "string" }, // YYYY-MM-DD, not a WatermelonDB date column — one calendar day, not a timestamp
        { name: "period_id", type: "string", isOptional: true },
        { name: "status", type: "string" },
        { name: "synced_at", type: "number", isOptional: true },
        { name: "created_at", type: "number" },
      ],
    }),
  ],
});

const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [addColumns({ table: "attendance_records", columns: [{ name: "period_id", type: "string", isOptional: true }] })],
    },
  ],
});

export class AttendanceRecordModel extends Model {
  static table = "attendance_records";

  @field("branch_id") branchId!: string;
  @field("section_id") sectionId!: string;
  @field("student_id") studentId!: string;
  @field("date") date!: string;
  @field("period_id") periodId!: string | null;
  @field("status") status!: string;
  @field("synced_at") syncedAt!: number | null;
  @readonly @date("created_at") createdAt!: Date;
}

let cachedDatabase: Database | null = null;

/**
 * Lazy on purpose: SQLiteAdapter's constructor calls the native
 * initializeJSI() synchronously, which throws in Expo Go (no native
 * module) or a stale dev client. A top-level `export const database = new
 * Database(...)` used to run that constructor the instant this file was
 * *imported* — which happened for every teacher login regardless of
 * whether they ever opened the attendance tab, and (worse) an earlier
 * attempt to defer that via React.lazy()/dynamic import produced its own
 * separate Metro bug ("Element type is invalid... resolves to undefined").
 * Deferring construction to first *call* means merely importing this
 * module is always safe; the throw only happens where a caller can
 * actually catch it (TeacherAttendanceScreen's existing try/catch blocks).
 */
export function getDatabase(): Database {
  if (!cachedDatabase) {
    const adapter = new SQLiteAdapter({
      schema,
      migrations,
      jsi: true,
    });
    cachedDatabase = new Database({
      adapter,
      modelClasses: [AttendanceRecordModel],
    });
  }
  return cachedDatabase;
}
