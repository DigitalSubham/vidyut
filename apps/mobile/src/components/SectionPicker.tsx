import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import type { MyTeacherAssignment } from "../lib/api-client";
import { colors } from "../theme";

/**
 * Unit 26 — replaces the manual branch/section text-entry every teacher
 * screen used to need (Unit 16's documented gap) with a real picker fed by
 * `GET /academic/teacher-assignments/me`.
 */
export function SectionPicker({
  assignments,
  activeAssignmentId,
  onSelect,
}: {
  assignments: MyTeacherAssignment[];
  activeAssignmentId: string | null;
  onSelect: (assignment: MyTeacherAssignment) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {assignments.map((assignment) => {
        const active = assignment.id === activeAssignmentId;
        return (
          <TouchableOpacity
            key={assignment.id}
            style={[styles.chip, active ? styles.chipActive : null]}
            onPress={() => onSelect(assignment)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
              {assignment.section.class.name} {assignment.section.name} — {assignment.subject.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // `flexGrow: 0` on the ScrollView itself plus `alignItems: "flex-start"`
  // on its content row — without both, a horizontal ScrollView's content
  // container defaults to CSS's normal `alignItems: "stretch"`, which
  // stretches every chip to fill all available vertical space instead of
  // sizing to its own text. That's what produced the giant full-height
  // pill instead of a normal chip.
  scroll: { flexGrow: 0 },
  row: { gap: 8, paddingVertical: 4, alignItems: "flex-start" },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  chipTextActive: { color: "#FFFFFF" },
});
