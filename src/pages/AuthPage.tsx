import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, User } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Badge, Button, Input, Label, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useBackendMode } from "@/lib/backend";

const HIGHLIGHTS = [
  "33 price, volume, microstructure and regime factors",
  "Cost-aware cross-sectional backtests with volatility targeting",
  "IC, rank IC, drawdown, Calmar and monthly attribution",
  "Saved runs that keep their full parameter set",
];

export default function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const mode = useBackendMode();

  const [isSignUp, setIsSignUp] = useState(params.get("mode") === "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const returnTo = params.get("returnTo") || "/dashboard";

  useEffect(() => {
    if (!loading && user) navigate(returnTo, { replace: true });
  }, [user, loading, navigate, returnTo]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isSignUp) await signUp(name, email, password);
      else await signIn(email, password);
      navigate(returnTo, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] grid-backdrop radial-fade opacity-35" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-[-220px] h-[520px] w-[760px] -translate-x-1/2 rounded-full opacity-25 blur-[110px]"
        style={{ background: "radial-gradient(circle, hsl(39 78% 60% / 0.5), transparent 65%)" }}
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-[1080px] items-center gap-3 px-5 py-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to overview
        </Link>
        <span className="ml-auto">
          <Brand to="/" compact />
        </span>
      </div>

      <div className="relative mx-auto grid w-full max-w-[1080px] gap-10 px-5 pb-16 lg:grid-cols-2 lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge tone="primary" className="mb-5">
            {isSignUp ? "Create your workspace" : "Welcome back"}
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {isSignUp ? "Start a research desk" : "Sign in to your desk"}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Your account holds the factor blends you build and the runs you save. Nothing else is required to get
            started.
          </p>

          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-md border border-border/70 bg-surface/60 p-4 text-xs leading-relaxed text-muted-foreground">
            {mode === "convex"
              ? "Sessions run through the Convex backend: passwords are hashed with scrypt and sessions are server-side."
              : "The Convex backend is unreachable, so this workspace is running in local preview mode. Accounts are kept in this browser only."}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <Panel className="p-6 sm:p-7">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-md border border-border bg-background/50 p-1">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                }}
                className={`rounded px-3 py-2 text-sm transition-colors ${
                  !isSignUp ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                }}
                className={`rounded px-3 py-2 text-sm transition-colors ${
                  isSignUp ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {isSignUp ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ada Lovelace"
                      autoComplete="name"
                      className="pl-9"
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@fund.com"
                    autoComplete="email"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    className="pl-9"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-md border border-negative/40 bg-negative/10 px-3 py-2 text-sm text-negative">
                  {error}
                </div>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Working…" : isSignUp ? "Create account" : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              By continuing you agree to keep your own market data out of the bundled synthetic universe.
            </p>
          </Panel>
        </motion.div>
      </div>
    </div>
  );
}
