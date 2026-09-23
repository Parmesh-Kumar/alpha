import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  FlaskConical,
  FolderGit2,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Brand } from "./Brand";
import { Badge, Button } from "./ui";
import { useAuth } from "@/lib/auth";
import { useBackendMode } from "@/lib/backend";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/factors", label: "Factor library", icon: FlaskConical, end: false },
  { to: "/dashboard/models", label: "Model zoo", icon: BrainCircuit, end: false },
  { to: "/dashboard/studio", label: "Backtest studio", icon: SlidersHorizontal, end: false },
  { to: "/dashboard/experiments", label: "Saved runs", icon: FolderOpen, end: false },
  { to: "/dashboard/qlib", label: "Qlib source", icon: FolderGit2, end: false },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                : "text-muted-foreground hover:bg-elevated/60 hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground")}
              />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function ModeBadge() {
  const mode = useBackendMode();
  if (mode === "convex") {
    return <Badge tone="positive">Convex synced</Badge>;
  }
  return <Badge tone="warning">Local preview store</Badge>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 grid-backdrop opacity-[0.35]" aria-hidden />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border/70 px-4 py-6 lg:flex">
          <Brand to="/dashboard" />
          <div className="mt-8 flex-1">
            <div className="label mb-3 px-3">Research</div>
            <NavItems />
          </div>
          <div className="space-y-3 border-t border-border/70 pt-4">
            <ModeBadge />
            <div className="rounded-md border border-border bg-surface/70 p-3">
              <div className="truncate text-sm font-medium text-foreground">{user?.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
            <Brand to="/dashboard" compact />
            <div className="flex items-center gap-2">
              <ModeBadge />
              <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)} aria-label="Menu">
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </header>

          {open ? (
            <div className="border-b border-border/70 bg-surface/95 px-4 py-4 lg:hidden">
              <NavItems onNavigate={() => setOpen(false)} />
              <Button variant="ghost" size="sm" className="mt-3 w-full justify-start" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          ) : null}

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
