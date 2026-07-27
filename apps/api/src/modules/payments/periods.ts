type FeeFrequency = "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "TERM" | "ANNUAL";

export interface Period {
  periodLabel: string;
  dueDate: Date;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function clampToMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

function equalIntervalStarts(start: Date, end: Date, count: number): Date[] {
  const totalMs = end.getTime() - start.getTime();
  const stepMs = totalMs / count;
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * stepMs));
}

/**
 * Expands one FeeStructureItem's frequency into due-dated periods across a
 * session (context/feature-specs/12's Decisions — a documented
 * simplification: QUARTERLY/TERM are evenly-spaced splits of the session
 * range since no Term entity exists to anchor real boundaries).
 */
export function computePeriods(
  frequency: FeeFrequency,
  sessionStart: Date,
  sessionEnd: Date,
  dueDayOfMonth: number | null | undefined
): Period[] {
  const day = dueDayOfMonth ?? 1;

  switch (frequency) {
    case "ONE_TIME":
      return [{ periodLabel: "One Time", dueDate: sessionStart }];

    case "ANNUAL":
      return [
        {
          periodLabel: "Annual",
          dueDate: clampToMonth(sessionStart.getUTCFullYear(), sessionStart.getUTCMonth(), day),
        },
      ];

    case "MONTHLY": {
      const periods: Period[] = [];
      let year = sessionStart.getUTCFullYear();
      let month = sessionStart.getUTCMonth();
      const endYear = sessionEnd.getUTCFullYear();
      const endMonth = sessionEnd.getUTCMonth();
      while (year < endYear || (year === endYear && month <= endMonth)) {
        periods.push({
          periodLabel: `${MONTH_NAMES[month]} ${year}`,
          dueDate: clampToMonth(year, month, day),
        });
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }
      return periods;
    }

    case "QUARTERLY":
      return equalIntervalStarts(sessionStart, sessionEnd, 4).map((dueDate, i) => ({
        periodLabel: `Q${i + 1}`,
        dueDate,
      }));

    case "TERM":
      return equalIntervalStarts(sessionStart, sessionEnd, 3).map((dueDate, i) => ({
        periodLabel: `Term ${i + 1}`,
        dueDate,
      }));

    default:
      return [];
  }
}
