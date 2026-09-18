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

type StoredSession = {
  accessToken: string;
  refreshToken: string;
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
};

const STORAGE_KEY = "edualto.auth.session";
const REFRESH_SKEW_MS = 30_000;

const AuthSessionContext = createContext<AuthSessionState | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<StoredSession | null> | null>(null);

  const clearSession = useCallback(() => {
    setSession(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveSession = useCallback((response: AuthTokenResponse) => {
    const nextSession: StoredSession = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: Date.now() + response.expiresInSeconds * 1000,
      user: response.user
    };
    setSession(nextSession);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    }
    return nextSession;
  }, []);

  const refreshStoredSession = useCallback(
    async (refreshToken?: string) => {
      const token = refreshToken ?? session?.refreshToken;
      if (!token) {
        clearSession();
        return null;
      }

      if (!refreshPromiseRef.current) {
        refreshPromiseRef.current = authApi
          .refresh(token)
          .then(saveSession)
          .catch((error: unknown) => {
            clearSession();
            throw error;
          })
          .finally(() => {
            refreshPromiseRef.current = null;
          });
      }

      return refreshPromiseRef.current;
    },
    [clearSession, saveSession, session?.refreshToken]
  );

  useEffect(() => {
    const storedSession = readStoredSession();
    if (!storedSession) {
      setIsLoading(false);
      return;
    }

    setSession(storedSession);
    const shouldRefresh = storedSession.expiresAt <= Date.now() + REFRESH_SKEW_MS;
    const bootstrap = shouldRefresh ? refreshStoredSession(storedSession.refreshToken) : Promise.resolve(storedSession);

    bootstrap
      .catch(() => null)
      .finally(() => {
        setIsLoading(false);
      });
  }, [refreshStoredSession]);

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
      setSession((current) => persistUser(current, user));
      return user;
    } catch (error) {
      if (isUnauthorized(error)) {
        const refreshed = await refreshStoredSession();
        if (!refreshed) {
          return null;
        }
        const user = await currentUserApi.getCurrentUser(refreshed.accessToken);
        setSession((current) => persistUser(current, user));
        return user;
      }
      throw error;
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
    const refreshToken = session?.refreshToken;
    clearSession();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Local cleanup is complete; logout must not expose token state through errors.
      }
    }
  }, [clearSession, session?.refreshToken]);

  const refreshSession = useCallback(async () => {
    const refreshed = await refreshStoredSession();
    return refreshed?.user ?? null;
  }, [refreshStoredSession]);

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
      reloadCurrentUser
    }),
    [getAccessToken, isLoading, login, logout, refreshSession, reloadCurrentUser, session]
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

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string" &&
      typeof parsed.expiresAt === "number" &&
      parsed.user
    ) {
      return parsed as StoredSession;
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return null;
}

function persistUser(current: StoredSession | null, user: CurrentUser): StoredSession | null {
  if (!current) {
    return current;
  }

  const nextSession = { ...current, user };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
  }
  return nextSession;
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}
