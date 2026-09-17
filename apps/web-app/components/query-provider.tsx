"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { QueryCache, QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-message";

// Same cross-@types/react-instance mismatch as components/i18n-provider.tsx
// (introduced by apps/mobile's react-native peer, Unit 15b) — re-typed
// against this file's own ReactNode.
const TypedQueryClientProvider = QueryClientProvider as unknown as ComponentType<{
  client: QueryClient;
  children: ReactNode;
}>;

/**
 * Cache-level onError (not defaultOptions.queries.onError, removed in
 * TanStack Query v5) — the correct place for a *global* handler in v5, and
 * the only one that fires regardless of whether the calling screen bothers
 * to handle its own query/mutation errors. Before this, a failed request
 * was visible only in the Network tab / console — every one of the ~70
 * admin screens would need its own try/catch + toast to surface anything,
 * and none of them had it.
 */
function reportError(error: unknown) {
  const { title, description } = getErrorMessage(error);
  toast.error(title, { description });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: reportError }),
        mutationCache: new MutationCache({ onError: reportError }),
      })
  );
  return <TypedQueryClientProvider client={client}>{children}</TypedQueryClientProvider>;
}
