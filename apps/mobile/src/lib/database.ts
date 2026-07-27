import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { appSchema, tableSchema, Model } from "@nozbe/watermelondb";
import { field, date, readonly } from "@nozbe/watermelondb/decorators";

/**
 * Offline attendance storage (context/feature-specs/16's scope #1-2) — a
 * local mirror of what will sync to Unit 15's POST /attendance. `id` is the
 * client-generated cuid this unit produces, reused as AttendanceRecord.id
 * server-side for idempotent upsert (data-model.md §8's own note).
 */
const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "attendance_records",
      columns: [
        { name: "branch_id", type: "string" },
        { name: "section_id", type: "string" },
        { name: "student_id", type: "string" },
        { name: "date", type: "string" }, // YYYY-MM-DD, not a WatermelonDB date column — one calendar day, not a timestamp
        { name: "status", type: "string" },
        { name: "synced_at", type: "number", isOptional: true },
        { name: "created_at", type: "number" },
      ],
    }),
  ],
});

export class AttendanceRecordModel extends Model {
  static table = "attendance_records";

  @field("branch_id") branchId!: string;
  @field("section_id") sectionId!: string;
  @field("student_id") studentId!: string;
  @field("date") date!: string;
  @field("status") status!: string;
  @field("synced_at") syncedAt!: number | null;
  @readonly @date("created_at") createdAt!: Date;
}

const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
});

export const database = new Database({
  adapter,
  modelClasses: [AttendanceRecordModel],
});
