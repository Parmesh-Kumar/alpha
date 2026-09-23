import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { convexClient, useBackendMode, type BackendMode } from "./backend";

export const TOKEN_KEY = "alphafoundry.token";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  mode: Exclude<BackendMode, "connecting">;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const USERS_KEY = "alphafoundry.users";
const LOCAL_SESSION_KEY = "alphafoundry.session";

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

/* -------------------------------------------------------------------------- */
/* Local preview backend                                                       */
/* -------------------------------------------------------------------------- */

interface LocalUserRecord {
  id: string;
  email: string;
  name: string;
  salt: string;
  hash: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the session simply will not persist */
  }
}

function fallbackHash(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    a = ((a ^ code) * 16777619) >>> 0;
    b = (b + code * (i + 7)) >>> 0;
  }
  return `${a.toString(16)}${b.toString(16)}`;
}

async function hashText(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      const digest = await subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      /* non-secure context — fall through to the non-cryptographic hash */
    }
  }
  return fallbackHash(text);
}

function randomId(): string {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function normalise(name: string, email: string, password: string) {
  if (!EMAIL_PATTERN.test(email.trim().toLowerCase())) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  return { name: name.trim(), email: email.trim().toLowerCase() };
}

function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readJson<AuthUser | null>(LOCAL_SESSION_KEY, null));
    setLoading(false);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const clean = normalise(name, email, password);
    const users = readJson<LocalUserRecord[]>(USERS_KEY, []);
    if (users.some((entry) => entry.email === clean.email)) {
      throw new Error("An account with that email already exists.");
    }
    const salt = randomId();
    const hash = await hashText(`${salt}:${password}`);
    const record: LocalUserRecord = {
      id: randomId(),
      email: clean.email,
      name: clean.name || clean.email.split("@")[0],
      salt,
      hash,
    };
    writeJson(USERS_KEY, [...users, record]);
    const next: AuthUser = { id: record.id, email: record.email, name: record.name };
    writeJson(LOCAL_SESSION_KEY, next);
    setUser(next);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const clean = email.trim().toLowerCase();
    const users = readJson<LocalUserRecord[]>(USERS_KEY, []);
    const record = users.find((entry) => entry.email === clean);
    if (!record) throw new Error("Incorrect email or password.");
    const hash = await hashText(`${record.salt}:${password}`);
    if (hash !== record.hash) throw new Error("Incorrect email or password.");
    const next: AuthUser = { id: record.id, email: record.email, name: record.name };
    writeJson(LOCAL_SESSION_KEY, next);
    setUser(next);
  }, []);

  const signOut = useCallback(async () => {
    try {
      window.localStorage.removeItem(LOCAL_SESSION_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token: user?.id ?? null, loading, mode: "local", signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* -------------------------------------------------------------------------- */
/* Convex backend                                                              */
/* -------------------------------------------------------------------------- */

function ConvexAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const me = useQuery(api.auth.me, token ? { token } : "skip");
  const signInAction = useAction(api.passwords.signIn);
  const signUpAction = useAction(api.passwords.signUp);
  const signOutMutation = useMutation(api.auth.signOut);

  useEffect(() => {
    if (token && me === null) {
      try {
        window.localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
      setToken(null);
    }
  }, [token, me]);

  const persist = useCallback((next: string | null) => {
    try {
      if (next) window.localStorage.setItem(TOKEN_KEY, next);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setToken(next);
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (!convexClient) throw new Error("Backend unavailable.");
      const result = await signUpAction({ name, email, password });
      persist(result.token);
    },
    [signUpAction, persist],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!convexClient) throw new Error("Backend unavailable.");
      const result = await signInAction({ email, password });
      persist(result.token);
    },
    [signInAction, persist],
  );

  const signOut = useCallback(async () => {
    if (token && convexClient) {
      try {
        await signOutMutation({ token });
      } catch {
        /* the local session is cleared regardless */
      }
    }
    persist(null);
  }, [token, signOutMutation, persist]);

  const user = useMemo<AuthUser | null>(
    () => (me ? { id: me.id, email: me.email, name: me.name } : null),
    [me],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading: token !== null && me === undefined,
      mode: "convex",
      signIn,
      signUp,
      signOut,
    }),
    [user, token, me, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = useBackendMode();
  if (mode === "convex") return <ConvexAuthProvider>{children}</ConvexAuthProvider>;
  return <LocalAuthProvider>{children}</LocalAuthProvider>;
}
