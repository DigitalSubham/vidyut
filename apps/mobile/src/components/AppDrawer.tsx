import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogOut, X, type LucideIcon } from "lucide-react-native";
import { colors } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(320, SCREEN_WIDTH * 0.82);
const ANIMATION_MS_IN = 260;
const ANIMATION_MS_OUT = 200;

export interface DrawerGroup<T extends string> {
  label: string;
  items: T[];
}

interface AppDrawerProps<T extends string> {
  visible: boolean;
  onClose: () => void;
  groups: DrawerGroup<T>[];
  activeItem: T;
  onSelect: (item: T) => void;
  getLabel: (item: T) => string;
  getIcon: (item: T) => LucideIcon;
  brandName: string;
  subtitle?: string;
  onLogout: () => void;
  logoutLabel: string;
}

/**
 * A slide-in sidebar menu, built on plain RN `Animated` + `Modal` — no
 * react-navigation Drawer / react-native-reanimated / gesture-handler.
 * Deliberate: the app's ~20 parent-facing sections are currently plain
 * self-managed tab state (setSection), not react-navigation routes, and
 * this repo's Metro/native-dependency setup took a lot of work to get
 * stable tonight. A real Drawer.Navigator would mean restructuring every
 * section into its own route and pulling in reanimated (which needs its
 * own babel plugin — no babel.config.js exists yet) purely for a visual
 * fix. This gets the same slide-out sidebar UX without touching any of
 * that, and can be replaced by a real Drawer Navigator later if the
 * screens are ever split into real routes.
 */
export function AppDrawer<T extends string>({
  visible,
  onClose,
  groups,
  activeItem,
  onSelect,
  getLabel,
  getIcon,
  brandName,
  subtitle,
  onLogout,
  logoutLabel,
}: AppDrawerProps<T>) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const translateX = useRef(new Animated.Value(visible ? 0 : -DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: ANIMATION_MS_IN, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: ANIMATION_MS_IN, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: ANIMATION_MS_OUT, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: ANIMATION_MS_OUT, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, translateX, backdropOpacity]);

  if (!mounted) return null;

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
          <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close menu" />
        </Animated.View>

        <Animated.View
          style={[styles.drawer, { width: DRAWER_WIDTH, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12, transform: [{ translateX }] }]}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>{brandName}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close menu" hitSlop={10}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {groups.map((group) => (
              <View key={group.label} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.items.map((item) => {
                  const Icon = getIcon(item);
                  const active = item === activeItem;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.item, active ? styles.itemActive : null]}
                      onPress={() => {
                        onSelect(item);
                        onClose();
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Icon size={20} color={active ? colors.brand : colors.textSecondary} />
                      <Text style={[styles.itemLabel, active ? styles.itemLabelActive : null]}>{getLabel(item)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutRow} onPress={onLogout} accessibilityRole="button">
              <LogOut size={20} color={colors.danger} />
              <Text style={styles.logoutLabel}>{logoutLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(15, 23, 42, 0.45)" },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.bgSurface,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: { fontSize: 20, fontWeight: "700", color: colors.brand },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingBottom: 8 },
  group: { marginBottom: 6 },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  itemActive: { backgroundColor: colors.brandTint },
  itemLabel: { fontSize: 15, color: colors.textPrimary, fontWeight: "500" },
  itemLabelActive: { color: colors.brand, fontWeight: "700" },

  footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, paddingHorizontal: 20 },
  logoutRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10 },
  logoutLabel: { fontSize: 15, fontWeight: "600", color: colors.danger },
});
