import type { GradingScheme } from "@vidyut/db";

/**
 * CBSE's own 9-band CCE table — the de facto standard every Bihar CBSE
 * school already uses (context/feature-specs/18's Open Question 1). Used for
 * both GRADE and CCE schemes since no per-tenant boundary config exists yet.
 */
const CCE_BANDS: Array<{ min: number; grade: string }> = [
  { min: 91, grade: "A1" },
  { min: 81, grade: "A2" },
  { min: 71, grade: "B1" },
  { min: 61, grade: "B2" },
  { min: 51, grade: "C1" },
  { min: 41, grade: "C2" },
  { min: 33, grade: "D" },
  { min: 21, grade: "E1" },
  { min: 0, grade: "E2" },
];

/** Returns null when the scheme has no defined computation (MARKS, CGPA) or the student was absent. */
export function computeGrade(
  gradingScheme: GradingScheme,
  marks: number | undefined,
  maxMarks: number
): string | null {
  if (marks === undefined) {
    return null;
  }
  const percent = (marks / maxMarks) * 100;

  if (gradingScheme === "PERCENTAGE") {
    return `${percent.toFixed(2)}%`;
  }
  if (gradingScheme === "GRADE" || gradingScheme === "CCE") {
    return CCE_BANDS.find((band) => percent >= band.min)?.grade ?? "E2";
  }
  return null;
}
