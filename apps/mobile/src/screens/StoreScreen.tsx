import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { createMyStoreOrder, getMyStoreItems, getMyStoreOrders, type MyStoreItem, type MyStoreOrder } from "../lib/api-client";

/** Gap-remediation pass — Unit 64's parent-facing store (uniforms/books) had zero UI anywhere, web or mobile, despite the fee-engine-backed order flow already existing on the backend. */
export function StoreScreen({ accessToken, branchId, studentId }: { accessToken: string; branchId: string; studentId: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<MyStoreItem[]>([]);
  const [orders, setOrders] = useState<MyStoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, ordersRes] = await Promise.all([
        getMyStoreItems(accessToken, branchId),
        getMyStoreOrders(accessToken, studentId),
      ]);
      setItems(itemsRes);
      setOrders(ordersRes);
    } finally {
      setLoading(false);
    }
  }, [accessToken, branchId, studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function order(storeItemId: string) {
    setOrdering(storeItemId);
    try {
      await createMyStoreOrder(accessToken, { storeItemId, studentId, quantity: 1 });
      await load();
    } catch (err) {
      Alert.alert(t("attendance.errorTitle"), (err as Error).message);
    } finally {
      setOrdering(null);
    }
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
      <Text style={styles.sectionTitle}>{t("store.catalog")}</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.title}>{item.itemName}</Text>
              <Text style={styles.price}>₹{(item.pricePaise / 100).toFixed(2)}</Text>
            </View>
            <TouchableOpacity onPress={() => order(item.id)} disabled={ordering === item.id}>
              <Text style={styles.orderLink}>{ordering === item.id ? t("store.ordering") : t("store.order")}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t("store.noItems")}</Text>}
      />
      <Text style={styles.sectionTitle}>{t("store.myOrders")}</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>
              {t("store.qty")} {item.quantity} — {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t("store.noOrders")}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontWeight: "700", fontSize: 14, marginTop: 12, marginBottom: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontWeight: "600" },
  price: { color: "#6B7280", fontSize: 13 },
  orderLink: { color: "#4F46E5", fontWeight: "700" },
  empty: { textAlign: "center", color: "#6B7280", marginVertical: 12 },
});
