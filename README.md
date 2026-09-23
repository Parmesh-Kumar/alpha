# Alpha Foundry

A quantitative research workbench in the browser, inspired by [Microsoft qlib](https://github.com/microsoft/qlib).

Alpha Foundry reproduces the qlib research loop in a single-page application: a point-in-time
universe and data layer, a library of Alpha158-style factors, a catalogue of reference model
architectures, a cost-aware cross-sectional backtester, and an evaluation layer with the metrics a
research committee actually asks for. Everything is computed locally — nothing is mocked, and the
same parameters always produce the same result.

> **Synthetic data notice.** The bundled research universe is generated deterministically from a
> seeded PRNG. It behaves like an equity market (regime shifts, fat tails, sector co-movement,
> volume clustering, a persistent idiosyncratic state that gives trailing-price factors real
> predictive power) but it is **not** real market data. Reference model figures come from the
> published qlib benchmark tables and are orientation points, not outputs of this app.

## Stack

| Layer | Choice |
| --- | --- |
| Build | Vite 5 + TypeScript (strict) |
| UI | React 18, Tailwind CSS 3, Framer Motion, lucide-react |
| Charts | Hand-rolled SVG (line, area, bar, heatmap, donut, sparkline) |
| Backend | Convex — scrypt password hashing in a Node action, server-side sessions, experiment storage |
| Package manager | Bun |

## Getting started

```bash
bun install
bun run dev          # Vite dev server on 0.0.0.0:$PORT (defaults to 5173)
```

The Convex backend is provisioned per workspace. If `.env.local` contains `VITE_CONVEX_URL`, the app
uses Convex for auth and persistence and the sidebar shows **Convex synced**. If Convex cannot be
reached (or no URL is configured) the app degrades to a **local preview store**: accounts and saved
runs live in `localStorage` so the full flow still works end-to-end.

Useful scripts:

```bash
bun run typecheck    # tsc -b --noEmit
bun run build        # production bundle into dist/
bunx convex dev --once   # regenerate Convex types after editing convex/
```

### Deployment

This is a static Vite build, so production hosting needs two commands and nothing else:

| Step | Command |
| --- | --- |
| Install | `bun install` |
| Build | `vite build` (equivalently `bun run build`) |

`vite build` emits static assets into `dist/` and exits — it must not start a server. The build
toolchain (`vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`,
`typescript`) deliberately lives in `dependencies` rather than `devDependencies`, so a
production-only install still has everything needed to build. The `dev` and `preview` scripts bind
to `0.0.0.0` on the injected `PORT`.

## The five layers

1. **Data** (`src/lib/market.ts`) — 37 synthetic instruments across 8 sectors over 1,260 sessions
   from a shared trading calendar, with a latent persistent state driving genuine factor efficacy.
2. **Factors** (`src/lib/factors.ts`) — 33 descriptors in 8 families (momentum, volatility,
   volume/liquidity, trend, candlestick, distribution, regime, standardized). Each is a pure
   function of an instrument's OHLCV history.
3. **Models** (`src/lib/models.ts`) — 22 reference architectures (gradient boosting, deep learning,
   sequence models, attention, ensembles, market dynamics) with published qlib benchmark figures.
4. **Backtest** (`src/lib/engine.ts`) — cross-sectional z-scoring, composite scoring, quantile
   portfolio construction, commission and slippage, optional volatility targeting.
5. **Evaluation** — annualised return, volatility, Sharpe, Sortino, Calmar, max drawdown, hit rate,
   annual turnover, IC, rank IC, IC IR, beta, alpha, monthly attribution and per-name contribution.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | public | Landing page with live previews of the default run, factor IC and the model leaderboard |
| `/auth` | public | Sign in / sign up; honours `?returnTo=` and redirects to the intended destination |
| `/dashboard` | protected | KPI summary, equity and drawdown curves, IC preview, monthly heatmap, sector exposure |
| `/dashboard/factors` | protected | Searchable factor library with live IC, rank IC, IC IR, spread and coverage |
| `/dashboard/models` | protected | Sortable model leaderboard and reference growth paths |
| `/dashboard/studio` | protected | Factor blend, portfolio construction, cost controls, full result set, save a run |
| `/dashboard/experiments` | protected | Saved runs with their full configuration; reopen one in the studio |

Protected routes are wrapped in `RequireAuth`, which redirects to `/auth?returnTo=…` and returns the
user to the page they asked for after sign-in.

## Backend schema

```
users        email, name, salt, passwordHash, createdAt        (index by_email)
sessions     userId, token, createdAt, expiresAt              (index by_token)
experiments  userId, name, note, config, metrics, equityPreview, createdAt  (index by_user)
```

Passwords are hashed with scrypt (64-byte derived key, 16-byte random salt) inside a
`"use node"` Convex action; comparisons use `timingSafeEqual`. Session tokens are 32 random bytes
with a 30-day expiry.

## Attribution

The pipeline design, factor families and model catalogue follow the structure of Microsoft's
[qlib](https://github.com/microsoft/qlib) platform. All code in this repository is an independent
implementation.
