import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/types";
import { resolveSchoolCode } from "../lib/api-client";

type Props = NativeStackScreenProps<AuthStackParamList, "SchoolCode">;

export function SchoolCodeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [schoolCode, setSchoolCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleContinue() {
    setError(null);
    setIsLoading(true);
    try {
      const { tenantSlug } = await resolveSchoolCode(schoolCode.trim());
      navigation.navigate("Phone", { tenantSlug });
    } catch {
      setError(t("schoolCode.notFound"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("schoolCode.title")}</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="characters"
        placeholder={t("schoolCode.placeholder")}
        value={schoolCode}
        onChangeText={setSchoolCode}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={styles.button}
        disabled={!schoolCode || isLoading}
        onPress={handleContinue}
      >
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("schoolCode.continue")}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: "#4F46E5", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#DC2626" },
});
