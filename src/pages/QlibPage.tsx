import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Box,
  Braces,
  Database,
  ExternalLink,
  FileCode2,
  FlaskConical,
  FolderGit2,
  FolderTree,
  Search,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Input, Panel } from "@/components/ui";
import {
  ALL_QLIB_ENTRIES,
  FACTOR_SOURCE_LINKS,
  MODEL_RECIPES,
  QLIB_GROUPS,
  QLIB_STATS,
  VENDOR_ROOT,
  qlibGithub,
  qlibGithubDir,
  qlibRaw,
} from "@/lib/qlib";
import { cn } from "@/lib/utils";

const GROUP_ICONS: Record<string, typeof Box> = {
  core: Box,
  data: Database,
  models: Braces,
  backtest: FlaskConical,
  workflow: Workflow,
  rl: FolderGit2,
  examples: FolderTree,
  docs: BookOpen,
};

const KIND_ICON: Record<string, typeof FileCode2> = {
  python: FileCode2,
  dir: FolderTree,
  doc: BookOpen,
  config: Workflow,
};

function RepoLink({ path, dir = false }: { path: string; dir?: boolean }) {
  return (
    <a
      href={dir ? qlibGithubDir(path) : qlibGithub(path)}
      target="_blank"
      rel="noreferrer"
      className="group/link inline-flex items-center gap-1.5 font-mono text-xs text-primary transition-colors hover:text-primary/80"
    >
      {path}
      <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover/link:opacity-100" />
    </a>
  );
}

export default function QlibPage() {
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState<string>("core");

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return QLIB_GROUPS;
    return QLIB_GROUPS.map((group) => ({
      ...group,
      entries: group.entries.filter(
        (entry) =>
          entry.label.toLowerCase().includes(term) ||
          entry.description.toLowerCase().includes(term) ||
          entry.path.toLowerCase().includes(term),
      ),
    })).filter((group) => group.entries.length > 0);
  }, [query]);

  const searching = query.trim().length > 0;
  const activeGroup = groups.find((group) => group.id === groupId) ?? groups[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Qlib source"
        title="The vendored microsoft/qlib tree, mapped"
        description="The complete upstream checkout lives in this repository at vendor/qlib — 618 files of the research platform Alpha Foundry follows: data layer, expression operators, model zoo, backtest engine, workflow and RL. Browse the map below; every entry links to the file here in the checkout and to the upstream page on GitHub."
        actions={
          <a
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-foreground transition-colors hover:bg-elevated/60"
            href="https://github.com/microsoft/qlib"
            target="_blank"
            rel="noreferrer"
          >
            Upstream repository
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Files vendored", value: QLIB_STATS.files },
          { label: "Python modules", value: QLIB_STATS.modules },
          { label: "Example scripts & configs", value: QLIB_STATS.examples },
          { label: "Expression operators", value: QLIB_STATS.operators },
        ].map((item) => (
          <div key={item.label} className="panel-elevated px-4 py-3.5">
            <div className="label">{item.label}</div>
            <div className="num mt-1.5 text-xl font-semibold text-foreground">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter modules, paths, descriptions…"
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {searching
            ? `${groups.reduce((acc, group) => acc + group.entries.length, 0)} matching entries`
            : `${ALL_QLIB_ENTRIES.length} curated entries`}
        </span>
        <Badge tone="primary" className="ml-auto">
          MIT · © Microsoft Corporation
        </Badge>
      </div>

      {searching ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => {
            const GroupIcon = GROUP_ICONS[group.id] ?? Box;
            return (
              <Panel key={group.id} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <GroupIcon className="h-4 w-4 text-primary" />
                  <div className="text-sm font-semibold text-foreground">{group.title}</div>
                  <Badge className="ml-auto">{group.entries.length}</Badge>
                </div>
                <div className="space-y-2.5">
                  {group.entries.map((entry) => (
                    <div key={entry.path} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{entry.label}</div>
                        <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{entry.description}</div>
                        <div className="mt-1">
                          <RepoLink path={entry.path} dir={entry.kind === "dir"} />
                        </div>
                        <a
                          className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                          href={qlibRaw(entry.path)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {VENDOR_ROOT}/{entry.path}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="flex flex-wrap gap-1.5 lg:flex-col">
            {QLIB_GROUPS.map((group) => {
              const GroupIcon = GROUP_ICONS[group.id] ?? Box;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setGroupId(group.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                    activeGroup?.id === group.id
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-elevated/60 hover:text-foreground",
                  )}
                >
                  <GroupIcon className={cn("h-4 w-4", activeGroup?.id === group.id ? "text-primary" : "")} />
                  {group.title}
                  <span className="num ml-auto text-[11px] text-muted-foreground">{group.entries.length}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            {activeGroup ? (
              <>
                <Panel className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      {(() => {
                        const GroupIcon = GROUP_ICONS[activeGroup.id] ?? Box;
                        return <GroupIcon className="h-4 w-4 text-primary" />;
                      })()}
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">{activeGroup.title}</h2>
                      <Badge className="ml-auto">{activeGroup.entries.length} entries</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{activeGroup.description}</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {activeGroup.entries.map((entry) => {
                      const KindIcon = KIND_ICON[entry.kind] ?? FileCode2;
                      return (
                        <div key={entry.path} className="panel-elevated flex flex-col justify-between gap-3 p-4">
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-sm font-medium text-foreground">{entry.label}</div>
                              <KindIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{entry.description}</p>
                          </div>
                          <div className="space-y-1">
                            <RepoLink path={entry.path} dir={entry.kind === "dir"} />
                            <a
                              className="block truncate font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                              href={qlibRaw(entry.path)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {VENDOR_ROOT}/{entry.path}
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Cross-links into the workbench catalogues */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="space-y-4">
          <div>
            <div className="label">Factor library ↔ upstream</div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              The workbench factor catalogue follows the Alpha158 handler. Compare the descriptors in the{" "}
              <Link className="text-primary transition-colors hover:text-primary/80" to="/dashboard/factors">
                factor library
              </Link>{" "}
              against the upstream feature definitions:
            </p>
          </div>
          <div className="space-y-2">
            {[
              { label: "Alpha158 handler (feature blocks)", path: FACTOR_SOURCE_LINKS.alpha158Handler },
              { label: "Alpha158 expression loader", path: FACTOR_SOURCE_LINKS.alpha158Loader },
              { label: "Expression operator library", path: FACTOR_SOURCE_LINKS.dataOps },
              { label: "Complete workflow script", path: FACTOR_SOURCE_LINKS.workflowScript },
            ].map((item) => (
              <div key={item.path} className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-foreground">{item.label}</span>
                <RepoLink path={item.path} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <div>
            <div className="label">Model zoo ↔ upstream implementations</div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Every architecture in the{" "}
              <Link className="text-primary transition-colors hover:text-primary/80" to="/dashboard/models">
                model zoo
              </Link>{" "}
              maps to its upstream module and benchmark recipe. A few highlights:
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="label py-2 font-medium">Model</th>
                  <th className="label py-2 font-medium">Implementation</th>
                  <th className="label py-2 text-right font-medium">Recipe</th>
                </tr>
              </thead>
              <tbody>
                {["lightgbm", "gru", "alstm", "tra", "hist", "ddgda"].map((id) => {
                  const recipe = MODEL_RECIPES[id];
                  if (!recipe) return null;
                  return (
                    <tr key={id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-3 font-medium capitalize text-foreground">{id}</td>
                      <td className="py-2 pr-3">
                        {recipe.module ? (
                          <RepoLink path={recipe.module} />
                        ) : (
                          <span className="text-xs text-muted-foreground">config-driven</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <RepoLink path={recipe.benchmarkDir} dir />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
