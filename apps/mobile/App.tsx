import "./src/i18n";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider } from "./src/lib/auth-context";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        {/*
         * SafeAreaProvider alone only makes insets *available* — nothing
         * consumed them, so every screen rendered flush under the status
         * bar/notch (and against the bottom home-indicator/gesture bar).
         * One wrapper here fixes it for every screen at once, rather than
         * patching ~20 individual screen files. AppDrawer's own Modal is
         * unaffected by this (Modals render in their own native layer, not
         * as a child of this tree) — it already applies its own insets via
         * useSafeAreaInsets(), so there's no double-padding.
         */}
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <RootNavigator />
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
