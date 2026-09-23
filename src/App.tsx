import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { BrandMark } from "@/components/Brand";
import { RequireAuth } from "@/components/RequireAuth";
import { AuthProvider } from "@/lib/auth";
import { BackendProvider, useBackendMode } from "@/lib/backend";
import { RunsProvider } from "@/lib/runs";
import AuthPage from "@/pages/AuthPage";
import ExperimentsPage from "@/pages/ExperimentsPage";
import FactorsPage from "@/pages/FactorsPage";
import Landing from "@/pages/Landing";
import ModelsPage from "@/pages/ModelsPage";
import OverviewPage from "@/pages/OverviewPage";
import StudioPage from "@/pages/StudioPage";

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <BrandMark className="h-10 w-10 text-base" />
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
          Connecting to the research backend…
        </div>
      </div>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

function Routes_() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <OverviewPage />
          </Protected>
        }
      />
      <Route
        path="/dashboard/factors"
        element={
          <Protected>
            <FactorsPage />
          </Protected>
        }
      />
      <Route
        path="/dashboard/models"
        element={
          <Protected>
            <ModelsPage />
          </Protected>
        }
      />
      <Route
        path="/dashboard/studio"
        element={
          <Protected>
            <StudioPage />
          </Protected>
        }
      />
      <Route
        path="/dashboard/experiments"
        element={
          <Protected>
            <ExperimentsPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function BackendGate() {
  const mode = useBackendMode();
  if (mode === "connecting") return <Splash />;
  return (
    <AuthProvider>
      <RunsProvider>
        <Routes_ />
      </RunsProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BackendProvider>
      <BackendGate />
    </BackendProvider>
  );
}
