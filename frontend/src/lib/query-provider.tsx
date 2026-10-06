"use client";

import { QueryClient, QueryClientContext, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useContext, useState } from "react";

function createBrowserQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getBrowserQueryClient(): QueryClient {
  if (!browserQueryClient) {
    browserQueryClient = createBrowserQueryClient();
  }
  return browserQueryClient;
}

export function clearQueryClient() {
  if (browserQueryClient) {
    browserQueryClient.clear();
    browserQueryClient = undefined;
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getBrowserQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function EnsureQueryClient({ children }: { children: ReactNode }) {
  const client = useContext(QueryClientContext);
  if (!client) {
    return <QueryProvider>{children}</QueryProvider>;
  }
  return <>{children}</>;
}
