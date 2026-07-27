import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/types";
import { verifyOtp } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";

type Props = NativeStackScreenProps<AuthStackParamList, "Otp">;

export function OtpScreen({ route }: Props) {
  const { t } = useTranslation();
  const { tenantSlug, phone } = route.params;
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setError(null);
    setIsLoading(true);
    try {
      const { accessToken, refreshToken } = await verifyOtp(tenantSlug, phone, code.trim());
      await login({ accessToken, refreshToken, tenantSlug });
      // Navigation to the role-routed home happens automatically — the root
      // navigator switches stacks once AuthProvider's session becomes non-null.
    } catch {
      setError(t("otp.invalid"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("otp.title")}</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} disabled={!code || isLoading} onPress={handleVerify}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("otp.verify")}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16, letterSpacing: 4 },
  button: { backgroundColor: "#4F46E5", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#DC2626" },
});
