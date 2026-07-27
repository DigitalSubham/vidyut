"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Same cross-@types/react-instance mismatch as components/i18n-provider.tsx
// (introduced by apps/mobile's react-native peer, Unit 15b) — re-typed
// against this file's own ReactNode.
const TypedQueryClientProvider = QueryClientProvider as unknown as ComponentType<{
  client: QueryClient;
  children: ReactNode;
}>;

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <TypedQueryClientProvider client={client}>{children}</TypedQueryClientProvider>;
}
