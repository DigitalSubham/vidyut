import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getMyTransport, type MyTransportInfo } from "../lib/api-client";

/** Gap-remediation pass — closes Unit 57's zero-mobile-UI gap: route/stop/vehicle + last known location, self-scoped. */
export function TransportScreen({ accessToken, studentId }: { accessToken: string; studentId: string }) {
  const { t } = useTranslation();
  const [info, setInfo] = useState<MyTransportInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyTransport(accessToken, studentId)
      .then(setInfo)
      .finally(() => setLoading(false));
  }, [accessToken, studentId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!info) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>{t("transport.notAllocated")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{t("transport.route")}</Text>
        <Text>{info.routeName}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t("transport.stop")}</Text>
        <Text>{info.stopName}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t("transport.vehicle")}</Text>
        <Text>{info.vehicleRegNo ?? "—"}</Text>
      </View>
      {info.lastLocation ? (
        <View style={styles.row}>
          <Text style={styles.label}>{t("transport.lastSeen")}</Text>
          <Text>
            {info.lastLocation.latitude.toFixed(4)}, {info.lastLocation.longitude.toFixed(4)} —{" "}
            {new Date(info.lastLocation.recordedAt).toLocaleTimeString()}
          </Text>
        </View>
      ) : (
        <Text style={styles.empty}>{t("transport.noLocationYet")}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12, paddingTop: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  label: { fontWeight: "600", marginBottom: 2 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 24 },
});
