"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { ApiClientError } from "@/lib/api";
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

const AuthSessionContext = createContext<AuthSessionState | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<InMemorySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<InMemorySession | null> | null>(null);

  const clearSession = useCallback(() => {
    setSession(null);
  }, []);

  const saveSession = useCallback((response: AuthTokenResponse): InMemorySession => {
    const nextSession: InMemorySession = {
      accessToken: response.accessToken,
      expiresAt: Date.now() + response.expiresInSeconds * 1000,
      user: response.user
    };
    setSession(nextSession);
    return nextSession;
  }, []);

  const refreshStoredSession = useCallback(
    async (): Promise<InMemorySession | null> => {
      if (!refreshPromiseRef.current) {
        refreshPromiseRef.current = authApi
          .refresh()
          .then(saveSession)
          .catch(() => {
            clearSession();
            return null;
          })
          .finally(() => {
            refreshPromiseRef.current = null;
          });
      }

      return refreshPromiseRef.current;
    },
    [clearSession, saveSession]
  );

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
    if (!session) {
      return null;
    }
    if (session.expiresAt > Date.now() + REFRESH_SKEW_MS) {
      return session.accessToken;
    }
    const refreshed = await refreshStoredSession();
    return refreshed?.accessToken ?? null;
  }, [refreshStoredSession, session]);

  const reloadCurrentUser = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const user = await currentUserApi.getCurrentUser(token);
      setSession((current) => {
        if (!current) return current;
        return { ...current, user };
      });
      return user;
    } catch (error) {
      if (isUnauthorized(error)) {
        const refreshed = await refreshStoredSession();
        if (!refreshed) {
          return null;
        }
        try {
          const user = await currentUserApi.getCurrentUser(refreshed.accessToken);
          setSession((current) => {
            if (!current) return current;
            return { ...current, user };
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
      const response = await authApi.login(request);
      return saveSession(response).user;
    },
    [saveSession]
  );

  const logout = useCallback(async () => {
    clearSession();
    try {
      await authApi.logout();
    } catch {
      // Local cleanup is complete; logout must not expose token state through errors.
    }
  }, [clearSession]);

  const refreshSession = useCallback(async () => {
    const refreshed = await refreshStoredSession();
    return refreshed?.user ?? null;
  }, [refreshStoredSession]);

  const updateUserAvatar = useCallback((avatarUrl: string | null) => {
    setSession((current) => {
      if (!current) return null;
      return { ...current, user: { ...current.user, avatarUrl } };
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
      updateUserAvatar
    }),
    [getAccessToken, isLoading, login, logout, refreshSession, reloadCurrentUser, session, updateUserAvatar]
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
