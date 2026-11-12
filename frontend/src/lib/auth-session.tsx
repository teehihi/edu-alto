"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiClientError, setUnauthorizedAccessTokenHandler } from "@/lib/api";
import { authApi, currentUserApi } from "@/lib/auth-client";
import type { AuthTokenResponse, CurrentUser, LoginRequest } from "@/types/auth";

type InMemorySession = {
  accessToken: string;
  expiresAt: number;
  user: CurrentUser;
};

type AuthSessionState = {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  login: (request: LoginRequest) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<CurrentUser | null>;
  getAccessToken: () => Promise<string | null>;
  reloadCurrentUser: () => Promise<CurrentUser | null>;
  updateUserAvatar: (avatarUrl: string | null) => void;
};

const REFRESH_SKEW_MS = 30_000;
const AUTH_REFRESH_LOCK_NAME = "edualto.auth.refresh";
const AUTH_BROADCAST_CHANNEL = "edualto.auth.session";

type AuthBroadcastMessage =
  | { type: "SESSION_SYNCED"; response: AuthTokenResponse; syncedAt: number }
  | { type: "SESSION_CLEARED" };

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && typeof navigator.locks?.request === "function") {
    return navigator.locks.request(AUTH_REFRESH_LOCK_NAME, task);
  }
  return task();
}

const AuthSessionContext = createContext<AuthSessionState | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<InMemorySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef<InMemorySession | null>(null);
  const sessionVersionRef = useRef(0);
  const refreshPromiseRef = useRef<Promise<InMemorySession | null> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastCrossTabSyncAtRef = useRef(0);

  const clearSession = useCallback(() => {
    sessionVersionRef.current++;
    sessionRef.current = null;
    setSession(null);
  }, []);

  const saveSession = useCallback((response: AuthTokenResponse): InMemorySession => {
    const nextSession: InMemorySession = {
      accessToken: response.accessToken,
      expiresAt: Date.now() + response.expiresInSeconds * 1000,
      user: response.user,
    };
    sessionRef.current = nextSession;
    setSession(nextSession);
    return nextSession;
  }, []);

  const postAuthBroadcast = useCallback((message: AuthBroadcastMessage) => {
    try {
      channelRef.current?.postMessage(message);
    } catch {
      // Ignore closed channel races during tab teardown.
    }
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
      const message = event.data;
      if (!message) {
        return;
      }
      if (message.type === "SESSION_SYNCED") {
        lastCrossTabSyncAtRef.current = Math.max(lastCrossTabSyncAtRef.current, message.syncedAt);
        saveSession(message.response);
      } else if (message.type === "SESSION_CLEARED") {
        clearSession();
      }
    };

    return () => {
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
      channel.close();
    };
  }, [clearSession, saveSession]);

  const refreshStoredSession = useCallback(async (): Promise<InMemorySession | null> => {
    if (!refreshPromiseRef.current) {
      const version = sessionVersionRef.current;
      const requestedAt = Date.now();
      refreshPromiseRef.current = withRefreshLock(async () => {
        if (version !== sessionVersionRef.current) {
          return null;
        }
        const syncedSession = sessionRef.current;
        if (
          lastCrossTabSyncAtRef.current >= requestedAt &&
          syncedSession &&
          syncedSession.expiresAt > Date.now() + REFRESH_SKEW_MS
        ) {
          return syncedSession;
        }
        const response = await authApi.refresh();
        if (version !== sessionVersionRef.current) {
          return null;
        }
        const nextSession = saveSession(response);
        const syncedAt = Date.now();
        lastCrossTabSyncAtRef.current = syncedAt;
        postAuthBroadcast({ type: "SESSION_SYNCED", response, syncedAt });
        return nextSession;
      })
        .catch(() => {
          if (version === sessionVersionRef.current) clearSession();
          return null;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }

    return refreshPromiseRef.current;
  }, [clearSession, postAuthBroadcast, saveSession]);

  useEffect(() => {
    setUnauthorizedAccessTokenHandler(async (rejectedToken) => {
      const current = sessionRef.current;
      if (!current) return null;
      if (current.accessToken !== rejectedToken) return current.accessToken;

      const refreshed = await refreshStoredSession();
      return refreshed?.accessToken ?? null;
    });

    return () => setUnauthorizedAccessTokenHandler(null);
  }, [refreshStoredSession]);

  // On mount, attempt to restore session via refresh token cookie
  useEffect(() => {
    refreshStoredSession()
      .catch(() => null)
      .finally(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAccessToken = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) {
      return null;
    }
    if (current.expiresAt > Date.now() + REFRESH_SKEW_MS) {
      return current.accessToken;
    }
    const refreshed = await refreshStoredSession();
    return refreshed?.accessToken ?? null;
  }, [refreshStoredSession]);

  const reloadCurrentUser = useCallback(async () => {
    const version = sessionVersionRef.current;
    const token = await getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const user = await currentUserApi.getCurrentUser(token);
      setSession((current) => {
        if (!current || version !== sessionVersionRef.current) return current;
        const next = { ...current, user };
        sessionRef.current = next;
        return next;
      });
      return user;
    } catch (error) {
      if (version !== sessionVersionRef.current) return null;
      if (isUnauthorized(error)) {
        const refreshed = await refreshStoredSession();
        if (!refreshed) {
          return null;
        }
        try {
          const user = await currentUserApi.getCurrentUser(refreshed.accessToken);
          setSession((current) => {
            if (!current || version !== sessionVersionRef.current) return current;
            const next = { ...current, user };
            sessionRef.current = next;
            return next;
          });
          return user;
        } catch {
          return null;
        }
      }
      return null;
    }
  }, [getAccessToken, refreshStoredSession]);

  const login = useCallback(
    async (request: LoginRequest) => {
      const version = ++sessionVersionRef.current;
      await refreshPromiseRef.current;
      const response = await authApi.login(request);
      if (version === sessionVersionRef.current) {
        saveSession(response);
        const syncedAt = Date.now();
        lastCrossTabSyncAtRef.current = syncedAt;
        postAuthBroadcast({ type: "SESSION_SYNCED", response, syncedAt });
      }
      return response.user;
    },
    [postAuthBroadcast, saveSession],
  );

  const logout = useCallback(async () => {
    clearSession();
    postAuthBroadcast({ type: "SESSION_CLEARED" });
    try {
      await refreshPromiseRef.current;
      await withRefreshLock(() => authApi.logout());
    } catch {
      // Local cleanup is complete; logout must not expose token state through errors.
    }
  }, [clearSession, postAuthBroadcast]);

  const refreshSession = useCallback(async () => {
    const refreshed = await refreshStoredSession();
    return refreshed?.user ?? null;
  }, [refreshStoredSession]);

  const updateUserAvatar = useCallback((avatarUrl: string | null) => {
    setSession((current) => {
      if (!current) return null;
      const next = { ...current, user: { ...current.user, avatarUrl } };
      sessionRef.current = next;
      return next;
    });
  }, []);

  const value = useMemo<AuthSessionState>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      isLoading,
      accessToken: session?.accessToken ?? null,
      login,
      logout,
      refreshSession,
      getAccessToken,
      reloadCurrentUser,
      updateUserAvatar,
    }),
    [
      getAccessToken,
      isLoading,
      login,
      logout,
      refreshSession,
      reloadCurrentUser,
      session,
      updateUserAvatar,
    ],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used inside AuthSessionProvider");
  }
  return context;
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}
