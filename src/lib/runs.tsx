import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { BacktestConfig, BacktestMetrics } from "./engine";
import { useAuth } from "./auth";
import { useBackendMode } from "./backend";

export interface StoredRun {
  id: string;
  name: string;
  note: string;
  config: BacktestConfig;
  metrics: BacktestMetrics;
  equityPreview: number[];
  createdAt: number;
}

export interface RunDraft {
  name: string;
  note: string;
  config: BacktestConfig;
  metrics: BacktestMetrics;
  equityPreview: number[];
}

interface RunsValue {
  runs: StoredRun[];
  loading: boolean;
  create: (draft: RunDraft) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const LOCAL_RUNS_KEY = "alphafoundry.runs";
const RUNS_EVENT = "alphafoundry:runs";

const RunsContext = createContext<RunsValue>({
  runs: [],
  loading: false,
  create: async () => undefined,
  remove: async () => undefined,
});

export function useRuns(): RunsValue {
  return useContext(RunsContext);
}

function readLocalRuns(): StoredRun[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRun[];
    return Array.isArray(parsed) ? [...parsed].sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch {
    return [];
  }
}

function writeLocalRuns(runs: StoredRun[]) {
  try {
    window.localStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(runs));
  } catch {
    /* ignore */
  }
}

function LocalRunsProvider({ children }: { children: ReactNode }) {
  const [runs, setRuns] = useState<StoredRun[]>([]);

  useEffect(() => {
    const sync = () => setRuns(readLocalRuns());
    sync();
    window.addEventListener(RUNS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(RUNS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const emit = useCallback(() => {
    window.dispatchEvent(new Event(RUNS_EVENT));
  }, []);

  const create = useCallback(
    async (draft: RunDraft) => {
      const next: StoredRun = {
        ...draft,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
      };
      writeLocalRuns([next, ...readLocalRuns()]);
      emit();
    },
    [emit],
  );

  const remove = useCallback(
    async (id: string) => {
      writeLocalRuns(readLocalRuns().filter((run) => run.id !== id));
      emit();
    },
    [emit],
  );

  const value = useMemo<RunsValue>(() => ({ runs, loading: false, create, remove }), [runs, create, remove]);
  return <RunsContext.Provider value={value}>{children}</RunsContext.Provider>;
}

function ConvexRunsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const rows = useQuery(api.experiments.list, { token });
  const createRun = useMutation(api.experiments.create);
  const removeRun = useMutation(api.experiments.remove);

  const runs = useMemo<StoredRun[]>(() => {
    if (!rows) return [];
    return rows.map((row) => ({
      id: row._id,
      name: row.name,
      note: row.note,
      config: row.config as BacktestConfig,
      metrics: row.metrics as BacktestMetrics,
      equityPreview: row.equityPreview,
      createdAt: row.createdAt,
    }));
  }, [rows]);

  const create = useCallback(
    async (draft: RunDraft) => {
      await createRun({ ...draft, token });
    },
    [createRun, token],
  );

  const remove = useCallback(
    async (id: string) => {
      await removeRun({ token, id: id as never });
    },
    [removeRun, token],
  );

  const value = useMemo<RunsValue>(
    () => ({ runs, loading: rows === undefined, create, remove }),
    [runs, rows, create, remove],
  );

  return <RunsContext.Provider value={value}>{children}</RunsContext.Provider>;
}

export function RunsProvider({ children }: { children: ReactNode }) {
  const mode = useBackendMode();
  const { user } = useAuth();

  if (!user) return <RunsContext.Provider value={EMPTY_RUNS}>{children}</RunsContext.Provider>;
  if (mode === "convex") return <ConvexRunsProvider>{children}</ConvexRunsProvider>;
  return <LocalRunsProvider>{children}</LocalRunsProvider>;
}

const EMPTY_RUNS: RunsValue = {
  runs: [],
  loading: false,
  create: async () => undefined,
  remove: async () => undefined,
};
