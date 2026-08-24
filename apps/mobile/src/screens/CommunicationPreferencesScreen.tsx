import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  ALL_CHANNELS,
  getMyCommunicationPreferences,
  setMyCommunicationPreference,
  type MyCommunicationPreference,
} from "../lib/api-client";

/** Gap-remediation pass — Unit 68's opt-out toggle had a real API (defaults to opted-in per channel) but no UI anywhere; this is the missing per-channel toggle list. */
export function CommunicationPreferencesScreen({ accessToken }: { accessToken: string }) {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyCommunicationPreferences(accessToken)
      .then((rows: MyCommunicationPreference[]) => {
        const map: Record<string, boolean> = {};
        for (const row of rows) map[row.channel] = row.optedIn;
        setPrefs(map);
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function toggle(channel: string, current: boolean) {
    const next = !current;
    setPrefs({ ...prefs, [channel]: next });
    await setMyCommunicationPreference(accessToken, channel, next);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {ALL_CHANNELS.map((channel) => {
        const optedIn = prefs[channel] ?? true;
        return (
          <View key={channel} style={styles.row}>
            <Text>{t(`commPrefs.${channel}`)}</Text>
            <Switch value={optedIn} onValueChange={() => toggle(channel, optedIn)} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
});
