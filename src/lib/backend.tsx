import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ConvexProvider, ConvexReactClient, useConvexConnectionState } from "convex/react";

export type BackendMode = "connecting" | "convex" | "local";

const convexUrl = (import.meta.env.VITE_CONVEX_URL as string | undefined)?.trim() ?? "";

function createClient(): ConvexReactClient | null {
  if (!convexUrl) return null;
  try {
    return new ConvexReactClient(convexUrl, { verbose: false });
  } catch {
    // A malformed deployment URL must not take the whole app down — the local
    // preview store keeps the workspace usable instead.
    return null;
  }
}

export const convexClient: ConvexReactClient | null = createClient();

export const convexConfigured = convexClient !== null;

const BackendContext = createContext<BackendMode>("local");

export function useBackendMode(): BackendMode {
  return useContext(BackendContext);
}

function Probe({ children }: { children: ReactNode }) {
  const connection = useConvexConnectionState();
  const [mode, setMode] = useState<BackendMode>(connection.hasEverConnected ? "convex" : "connecting");

  useEffect(() => {
    if (connection.hasEverConnected) {
      setMode("convex");
      return;
    }
    const timer = window.setTimeout(() => {
      setMode((current) => (current === "connecting" ? "local" : current));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [connection.hasEverConnected]);

  return <BackendContext.Provider value={mode}>{children}</BackendContext.Provider>;
}

export function BackendProvider({ children }: { children: ReactNode }) {
  if (!convexClient) {
    return <BackendContext.Provider value="local">{children}</BackendContext.Provider>;
  }
  return (
    <ConvexProvider client={convexClient}>
      <Probe>{children}</Probe>
    </ConvexProvider>
  );
}

/** Small helper so components can react to the active backend. */
export function useBackendStatus() {
  const mode = useBackendMode();
  return {
    mode,
    isConvex: mode === "convex",
    isLocal: mode === "local",
    isConnecting: mode === "connecting",
  };
}
