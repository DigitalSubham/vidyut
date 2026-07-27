import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import type { MyTeacherAssignment } from "../lib/api-client";

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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {assignments.map((assignment) => (
        <TouchableOpacity
          key={assignment.id}
          style={[styles.chip, assignment.id === activeAssignmentId ? styles.chipActive : null]}
          onPress={() => onSelect(assignment)}
        >
          <Text>
            {assignment.section.class.name} {assignment.section.name} — {assignment.subject.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#F3F4F6" },
  chipActive: { backgroundColor: "#DCFCE7" },
});
