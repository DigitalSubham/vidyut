import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/types";
import { requestOtp } from "../lib/api-client";

type Props = NativeStackScreenProps<AuthStackParamList, "Phone">;

export function PhoneScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { tenantSlug } = route.params;
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode() {
    setError(null);
    setIsLoading(true);
    try {
      await requestOtp(tenantSlug, phone.trim());
      navigation.navigate("Otp", { tenantSlug, phone: phone.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("phone.title")}</Text>
      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        placeholder={t("phone.placeholder")}
        value={phone}
        onChangeText={setPhone}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} disabled={!phone || isLoading} onPress={handleSendCode}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("phone.sendCode")}</Text>}
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
