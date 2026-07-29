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

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
});

export const database = new Database({
  adapter,
  modelClasses: [AttendanceRecordModel],
});
