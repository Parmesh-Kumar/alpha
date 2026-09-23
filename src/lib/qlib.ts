/**
 * Map of the vendored qlib source tree.
 *
 * The complete microsoft/qlib checkout lives in this repository under
 * `vendor/qlib` (MIT licensed, © Microsoft Corporation). This module exposes
 * the paths that matter for the workbench so the UI can link the factor and
 * model catalogues to the upstream implementations they follow, both on GitHub
 * and inside this checkout.
 */

export const VENDOR_ROOT = "vendor/qlib";

const UPSTREAM_TREE = "https://github.com/microsoft/qlib/tree/main";
const UPSTREAM_BLOB = "https://github.com/microsoft/qlib/blob/main";
const UPSTREAM_RAW = "https://raw.githubusercontent.com/microsoft/qlib/main";

/** Upstream GitHub page for a path inside the qlib checkout. */
export function qlibGithub(path: string): string {
  return `${UPSTREAM_BLOB}/${path}`;
}

/** Upstream GitHub tree page for a directory inside the qlib checkout. */
export function qlibGithubDir(path: string): string {
  return `${UPSTREAM_TREE}/${path}`;
}

/** Raw content URL for a file inside the qlib checkout. */
export function qlibRaw(path: string): string {
  return `${UPSTREAM_RAW}/${path}`;
}

export type QlibKind = "python" | "dir" | "doc" | "config";

export interface QlibEntry {
  /** Path relative to `vendor/qlib`. */
  path: string;
  label: string;
  description: string;
  kind: QlibKind;
}

export interface QlibGroup {
  id: string;
  title: string;
  description: string;
  entries: QlibEntry[];
}

export const QLIB_STATS = {
  /** Files tracked under vendor/qlib. */
  files: 618,
  /** Python modules under the qlib package. */
  modules: 232,
  /** Runnable examples: scripts and workflow configs. */
  examples: 109,
  /** Operator classes in qlib/data/ops.py. */
  operators: 58,
  /** Benchmark directories under examples/benchmarks. */
  benchmarks: 25,
} as const;

export const QLIB_GROUPS: QlibGroup[] = [
  {
    id: "core",
    title: "Core engine",
    description: "Initialisation, configuration and shared plumbing for the whole platform.",
    entries: [
      { path: "qlib/__init__.py", label: "qlib.init", description: "Provider registration and global initialisation entry point.", kind: "python" },
      { path: "qlib/config.py", label: "Config & C registry", description: "Hierarchical configuration plus the class registry that powers the declarative task configs.", kind: "python" },
      { path: "qlib/constant.py", label: "Constants", description: "Trading calendar sizes, regions and default market conventions.", kind: "python" },
      { path: "qlib/utils", label: "Utilities", description: "Config instantiation, serialisation, hashing and time helpers used everywhere.", kind: "dir" },
      { path: "qlib/log.py", label: "Logging", description: "Time-annotated logger with the GetTimeLogger used across workflow runs.", kind: "python" },
    ],
  },
  {
    id: "data",
    title: "Data layer",
    description: "Point-in-time storage, expression operators and the Alpha158/Alpha360 handlers.",
    entries: [
      { path: "qlib/data/data.py", label: "LocalDatasetProvider", description: "Calendar, instrument and feature providers backing every D.features call.", kind: "python" },
      { path: "qlib/data/ops.py", label: "Expression operators", description: "58 operators (Ref, Mean, Std, Corr, Rank…) composing the factor expression language.", kind: "python" },
      { path: "qlib/contrib/data/handler.py", label: "Alpha158 & Alpha360", description: "The canonical feature handlers this workbench's factor library follows.", kind: "python" },
      { path: "qlib/contrib/data/loader.py", label: "Alpha158DL", description: "Feature expression definitions behind the Alpha158 handler.", kind: "python" },
      { path: "qlib/data/dataset", label: "Dataset & loader", description: "DatasetH, processor pipeline and the learned processor used in rolling studies.", kind: "dir" },
      { path: "qlib/data/storage", label: "Storage backends", description: "File storage implementations for calendars, instruments and features.", kind: "dir" },
      { path: "qlib/data/cache", label: "Caching", description: "Expression and dataset cache layers with disk/memory providers.", kind: "dir" },
      { path: "qlib/data/pit.py", label: "Point-in-time data", description: "Point-in-time database reader for quarterly fundamentals without lookahead.", kind: "python" },
    ],
  },
  {
    id: "models",
    title: "Model layer",
    description: "The 35-module contrib model zoo plus the base training interfaces.",
    entries: [
      { path: "qlib/contrib/model", label: "Contrib model zoo", description: "LightGBM/XGBoost/CatBoost and the PyTorch family: GRU, LSTM, ALSTM, Transformer, TRA, HIST…", kind: "dir" },
      { path: "qlib/contrib/model/gbdt.py", label: "LGBModel", description: "The default qrun baseline — histogram gradient boosting on tabular features.", kind: "python" },
      { path: "qlib/model/base.py", label: "Model & Dataset base", description: "fit/predict contracts every implementation follows.", kind: "python" },
      { path: "qlib/model/trainer.py", label: "Trainer", description: "Single-model and nested trainers, including user-defined custom loops.", kind: "python" },
      { path: "qlib/model/ens", label: "Ensemble", description: "Rolling and grouped ensembling of prediction artifacts.", kind: "dir" },
      { path: "qlib/model/riskmodel", label: "Risk models", description: "Structured covariance estimators for risk-factorised portfolios.", kind: "dir" },
      { path: "qlib/contrib/eva", label: "Evaluation", description: "Signal and position evaluators used by the report layer.", kind: "dir" },
      { path: "qlib/contrib/tuner", label: "Tuner", description: "Hyper-parameter search wrappers around the task configs.", kind: "dir" },
    ],
  },
  {
    id: "backtest",
    title: "Backtest & execution",
    description: "Exchange simulation, nested executors, account tracking and cost control.",
    entries: [
      { path: "qlib/backtest", label: "Backtest engine", description: "Exchange, executor, account, position and decision modules of the event-driven simulator.", kind: "dir" },
      { path: "qlib/contrib/strategy", label: "Contrib strategies", description: "TopkDropoutStrategy, rule-based TWAP/VWAP strategies and cost-aware order generation.", kind: "dir" },
      { path: "qlib/contrib/report", label: "Report layer", description: "Score IC, cumulative return, rank label and risk analysis graphs for positions.", kind: "dir" },
      { path: "qlib/contrib/evaluate.py", label: "Portfolio evaluation", description: "Risk analysis of excess return with and without cost.", kind: "python" },
    ],
  },
  {
    id: "workflow",
    title: "Workflow & serving",
    description: "Experiment tracking, recorder artifacts, task management and online serving.",
    entries: [
      { path: "qlib/workflow", label: "Workflow", description: "Experiment, recorder and record_temp — the R.log/R.save API used in every example.", kind: "dir" },
      { path: "qlib/workflow/task", label: "Task management", description: "Task pooling, scheduling and rerunning for rolling retraining pipelines.", kind: "dir" },
      { path: "qlib/contrib/online", label: "Online serving", description: "Online strategy, simulator and update routines for live paper trading.", kind: "dir" },
      { path: "qlib/contrib/meta", label: "Meta-learning", description: "Meta-task and meta-model scaffolding behind DDG-DA.", kind: "dir" },
      { path: "qlib/contrib/rolling", label: "Rolling retrain", description: "Rolling retraining utilities: data splitting and task generation.", kind: "dir" },
    ],
  },
  {
    id: "rl",
    title: "Reinforcement learning",
    description: "The order-execution RL framework: simulators, strategies and rewards.",
    entries: [
      { path: "qlib/rl", label: "RL framework", description: "Simulator, reward, seed and strategy interfaces with a training pipeline.", kind: "dir" },
      { path: "qlib/rl/order_execution", label: "Order execution", description: "The full TAQ-based order execution environment from the qlib paper.", kind: "dir" },
      { path: "examples/rl_order_execution", label: "RL example", description: "End-to-end training configs and scripts for the execution agent.", kind: "dir" },
      { path: "examples/orderbook_data", label: "Orderbook data", description: "Converting exchange order book dumps into training data.", kind: "dir" },
    ],
  },
  {
    id: "examples",
    title: "Examples",
    description: "Runnable workflows for every benchmark, plus portfolio and high-frequency studies.",
    entries: [
      { path: "examples/benchmarks", label: "Benchmark recipes", description: "26 directories, one per model: workflow YAML, requirements and result tables.", kind: "dir" },
      { path: "examples/benchmarks_dynamic", label: "Dynamic benchmarks", description: "DDG-DA and other distribution-shift studies.", kind: "dir" },
      { path: "examples/workflow_by_code.py", label: "workflow_by_code.py", description: "The shortest complete qlib script: init, Alpha158, LGBModel, backtest, report.", kind: "python" },
      { path: "examples/workflow_by_code.ipynb", label: "Notebook version", description: "The same loop as a notebook with inline report graphs.", kind: "doc" },
      { path: "examples/portfolio", label: "Portfolio", description: "Risk-factor construction and optimization examples.", kind: "dir" },
      { path: "examples/highfreq", label: "High frequency", description: "Intraday data handlers and the high-frequency gradient boosting model.", kind: "dir" },
      { path: "examples/online_srv", label: "Online service", description: "Rolling retrain + live simulation serving stack.", kind: "dir" },
      { path: "examples/tutorial", label: "Tutorial", description: "Step-by-step beginner workflow.", kind: "dir" },
      { path: "examples/run_all_model.py", label: "run_all_model.py", description: "Sweeps every benchmark recipe through qrun.", kind: "python" },
    ],
  },
  {
    id: "docs",
    title: "Docs & packaging",
    description: "Sphinx documentation source, tests and packaging manifests.",
    entries: [
      { path: "docs", label: "Documentation", description: "Component reference, advanced topics and getting-started guides (rst sources).", kind: "dir" },
      { path: "README.md", label: "Upstream README", description: "Feature overview, installation and the benchmark results table.", kind: "doc" },
      { path: "CHANGELOG.md", label: "Changelog", description: "Release history of the upstream project.", kind: "doc" },
      { path: "tests", label: "Tests", description: "Upstream test suite for the data, contrib and backtest layers.", kind: "dir" },
      { path: "setup.py", label: "setup.py", description: "The pyqlib packaging entry point.", kind: "config" },
      { path: "Dockerfile", label: "Dockerfile", description: "Conda-based image used for the published qlib containers.", kind: "config" },
      { path: "LICENSE", label: "MIT License", description: "Copyright © Microsoft Corporation. All rights reserved.", kind: "doc" },
    ],
  },
];

export const ALL_QLIB_ENTRIES: QlibEntry[] = QLIB_GROUPS.flatMap((group) => group.entries);

/**
 * Cross-reference from the workbench model zoo to the upstream implementation
 * and benchmark recipe. Module paths and benchmark directories are verified
 * against the vendored tree.
 */
export interface ModelRecipeLink {
  /** Python module implementing the model, relative to vendor/qlib. */
  module?: string;
  /** Benchmark recipe directory, relative to vendor/qlib. */
  benchmarkDir: string;
}

export const MODEL_RECIPES: Record<string, ModelRecipeLink> = {
  lightgbm: { module: "qlib/contrib/model/gbdt.py", benchmarkDir: "examples/benchmarks/LightGBM" },
  xgboost: { module: "qlib/contrib/model/xgboost.py", benchmarkDir: "examples/benchmarks/XGBoost" },
  catboost: { module: "qlib/contrib/model/catboost_model.py", benchmarkDir: "examples/benchmarks/CatBoost" },
  doubleensemble: { module: "qlib/contrib/model/double_ensemble.py", benchmarkDir: "examples/benchmarks/DoubleEnsemble" },
  mlp: { module: "qlib/contrib/model/pytorch_nn.py", benchmarkDir: "examples/benchmarks/MLP" },
  tabnet: { module: "qlib/contrib/model/pytorch_tabnet.py", benchmarkDir: "examples/benchmarks/TabNet" },
  tcn: { module: "qlib/contrib/model/pytorch_tcn.py", benchmarkDir: "examples/benchmarks/TCN" },
  gru: { module: "qlib/contrib/model/pytorch_gru.py", benchmarkDir: "examples/benchmarks/GRU" },
  lstm: { module: "qlib/contrib/model/pytorch_lstm.py", benchmarkDir: "examples/benchmarks/LSTM" },
  alstm: { module: "qlib/contrib/model/pytorch_alstm.py", benchmarkDir: "examples/benchmarks/ALSTM" },
  transformer: { module: "qlib/contrib/model/pytorch_transformer.py", benchmarkDir: "examples/benchmarks/Transformer" },
  localformer: { module: "qlib/contrib/model/pytorch_localformer.py", benchmarkDir: "examples/benchmarks/Localformer" },
  tft: { benchmarkDir: "examples/benchmarks/TFT" },
  tra: { module: "qlib/contrib/model/pytorch_tra.py", benchmarkDir: "examples/benchmarks/TRA" },
  hist: { module: "qlib/contrib/model/pytorch_hist.py", benchmarkDir: "examples/benchmarks/HIST" },
  igmtf: { module: "qlib/contrib/model/pytorch_igmtf.py", benchmarkDir: "examples/benchmarks/IGMTF" },
  krnn: { module: "qlib/contrib/model/pytorch_krnn.py", benchmarkDir: "examples/benchmarks/KRNN" },
  sandwich: { module: "qlib/contrib/model/pytorch_sandwich.py", benchmarkDir: "examples/benchmarks/Sandwich" },
  add: { module: "qlib/contrib/model/pytorch_add.py", benchmarkDir: "examples/benchmarks/ADD" },
  adarnn: { module: "qlib/contrib/model/pytorch_adarnn.py", benchmarkDir: "examples/benchmarks/ADARNN" },
  ddgda: { benchmarkDir: "examples/benchmarks_dynamic/DDG-DA" },
};

/** Workbench factor library ↔ upstream handler cross-reference. */
export const FACTOR_SOURCE_LINKS = {
  alpha158Handler: "qlib/contrib/data/handler.py",
  alpha158Loader: "qlib/contrib/data/loader.py",
  dataOps: "qlib/data/ops.py",
  workflowScript: "examples/workflow_by_code.py",
  benchmarksReadme: "examples/benchmarks/README.md",
} as const;
