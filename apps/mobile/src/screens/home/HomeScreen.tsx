import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth-context";

/**
 * One shared placeholder home screen, parameterized by role label — each
 * role gets its own route in the navigator (so future units can swap in a
 * real screen per role without touching routing), but the placeholder body
 * is identical until real features land (Units 16, 24, 25, 26).
 */
export function HomeScreen({ titleKey }: { titleKey: "home.parent" | "home.teacher" | "home.staff" | "home.student" }) {
  const { t } = useTranslation();
  const { logout, roles } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t(titleKey)}</Text>
      <Text style={styles.roles}>{roles.join(", ")}</Text>
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>{t("home.logout")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: "600" },
  roles: { color: "#666" },
  button: { backgroundColor: "#4F46E5", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
