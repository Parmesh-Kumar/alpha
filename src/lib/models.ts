/**
 * Model zoo.
 *
 * Reference benchmark figures are the published qlib results for the Alpha158
 * feature set on the CSI300 universe. They are included as orientation points
 * for comparison against the in-browser backtests run in this workbench — the
 * figures themselves are not computed here.
 */

export type ModelFamily =
  | "Gradient Boosting"
  | "Deep Learning"
  | "Sequence Model"
  | "Attention"
  | "Ensemble"
  | "Market Dynamics"
  | "Reinforcement Learning";

export interface ModelEntry {
  id: string;
  name: string;
  family: ModelFamily;
  year: number;
  paradigm: "Supervised" | "Market Dynamics" | "Reinforcement Learning";
  description: string;
  signature: string;
  benchmark: {
    annualizedReturn: number;
    informationRatio: number;
    maxDrawdown: number;
    ic: number;
    rankIc: number;
  };
}

export const MODELS: ModelEntry[] = [
  {
    id: "lightgbm",
    name: "LightGBM",
    family: "Gradient Boosting",
    year: 2017,
    paradigm: "Supervised",
    description:
      "Histogram-based gradient boosting. The default qrun baseline and still the hardest model to beat per unit of compute.",
    signature: "num_leaves=210, lr=0.0421, 800 rounds",
    benchmark: { annualizedReturn: 0.1783, informationRatio: 1.997, maxDrawdown: -0.0818, ic: 0.0362, rankIc: 0.0394 },
  },
  {
    id: "xgboost",
    name: "XGBoost",
    family: "Gradient Boosting",
    year: 2016,
    paradigm: "Supervised",
    description: "Second-order boosted trees with column subsampling; strong and predictable on tabular factor blocks.",
    signature: "max_depth=8, eta=0.0421, 800 rounds",
    benchmark: { annualizedReturn: 0.1591, informationRatio: 1.812, maxDrawdown: -0.0863, ic: 0.0331, rankIc: 0.0358 },
  },
  {
    id: "catboost",
    name: "CatBoost",
    family: "Gradient Boosting",
    year: 2018,
    paradigm: "Supervised",
    description: "Ordered boosting with oblivious trees, well behaved when labels are noisy.",
    signature: "depth=6, lr=0.0421, 800 rounds",
    benchmark: { annualizedReturn: 0.1524, informationRatio: 1.744, maxDrawdown: -0.0902, ic: 0.0318, rankIc: 0.0341 },
  },
  {
    id: "doubleensemble",
    name: "DoubleEnsemble",
    family: "Ensemble",
    year: 2020,
    paradigm: "Supervised",
    description:
      "Sample re-weighting and feature selection driven by learning trajectories; reduces overfitting on regime-shifted data.",
    signature: "sample re-weighting + feature selection, 6 base learners",
    benchmark: { annualizedReturn: 0.1642, informationRatio: 1.879, maxDrawdown: -0.0781, ic: 0.0349, rankIc: 0.0376 },
  },

  {
    id: "mlp",
    name: "MLP",
    family: "Deep Learning",
    year: 2016,
    paradigm: "Supervised",
    description: "Fully connected network — the reference point for whether sequence structure is worth modelling at all.",
    signature: "layers=(256,128), dropout=0.0",
    benchmark: { annualizedReturn: 0.1246, informationRatio: 1.421, maxDrawdown: -0.0964, ic: 0.0268, rankIc: 0.0294 },
  },
  {
    id: "tabnet",
    name: "TabNet",
    family: "Deep Learning",
    year: 2021,
    paradigm: "Supervised",
    description: "Sequential attention with instance-wise feature selection; interpretable masks for feature attribution.",
    signature: "n_d=64, n_steps=5, relax=True",
    benchmark: { annualizedReturn: 0.1339, informationRatio: 1.512, maxDrawdown: -0.1042, ic: 0.0287, rankIc: 0.0311 },
  },
  {
    id: "tcn",
    name: "TCN",
    family: "Sequence Model",
    year: 2020,
    paradigm: "Supervised",
    description: "Dilated causal convolutions with a wide receptive field and parallel training.",
    signature: "dilations=(1,2,4,8), kernel=3",
    benchmark: { annualizedReturn: 0.1381, informationRatio: 1.566, maxDrawdown: -0.0931, ic: 0.0295, rankIc: 0.0324 },
  },

  {
    id: "gru",
    name: "GRU",
    family: "Sequence Model",
    year: 2016,
    paradigm: "Supervised",
    description: "Gated recurrent unit over a fixed window of raw features; cheaper than LSTM with comparable accuracy.",
    signature: "hidden=64, seq_len=20",
    benchmark: { annualizedReturn: 0.1462, informationRatio: 1.639, maxDrawdown: -0.0897, ic: 0.0308, rankIc: 0.0336 },
  },
  {
    id: "lstm",
    name: "LSTM",
    family: "Sequence Model",
    year: 2016,
    paradigm: "Supervised",
    description: "Long short-term memory — the classical sequence baseline for financial time series.",
    signature: "hidden=64, seq_len=20",
    benchmark: { annualizedReturn: 0.1431, informationRatio: 1.601, maxDrawdown: -0.0918, ic: 0.0301, rankIc: 0.0329 },
  },
  {
    id: "alstm",
    name: "ALSTM",
    family: "Attention",
    year: 2017,
    paradigm: "Supervised",
    description: "LSTM with temporal attention, letting the model weight informative days inside the look-back window.",
    signature: "hidden=64, attention heads=1, seq_len=20",
    benchmark: { annualizedReturn: 0.1487, informationRatio: 1.688, maxDrawdown: -0.0872, ic: 0.0314, rankIc: 0.0342 },
  },
  {
    id: "transformer",
    name: "Transformer",
    family: "Attention",
    year: 2017,
    paradigm: "Supervised",
    description: "Encoder-only self-attention over the look-back window with sinusoidal positional encoding.",
    signature: "d_model=64, heads=2, layers=2",
    benchmark: { annualizedReturn: 0.1512, informationRatio: 1.703, maxDrawdown: -0.0854, ic: 0.0322, rankIc: 0.0351 },
  },
  {
    id: "localformer",
    name: "Localformer",
    family: "Attention",
    year: 2021,
    paradigm: "Supervised",
    description: "Transformer augmented with a local convolutional path to capture fine-grained intraday structure.",
    signature: "d_model=64, local kernel=3",
    benchmark: { annualizedReturn: 0.1553, informationRatio: 1.741, maxDrawdown: -0.0821, ic: 0.0329, rankIc: 0.0358 },
  },
  {
    id: "tft",
    name: "TFT",
    family: "Attention",
    year: 2021,
    paradigm: "Supervised",
    description:
      "Temporal fusion transformer with gated residual networks, static covariate encoders and variable selection.",
    signature: "hidden=64, heads=4, variable selection",
    benchmark: { annualizedReturn: 0.1584, informationRatio: 1.786, maxDrawdown: -0.0803, ic: 0.0336, rankIc: 0.0364 },
  },

  {
    id: "tra",
    name: "TRA",
    family: "Market Dynamics",
    year: 2021,
    paradigm: "Market Dynamics",
    description:
      "Temporal routing adaptor — a set of predictors with a router that assigns each sample to the regime it belongs to.",
    signature: "n_predictors=6, router=MLP, hidden=64",
    benchmark: { annualizedReturn: 0.1712, informationRatio: 1.915, maxDrawdown: -0.0764, ic: 0.0355, rankIc: 0.0388 },
  },
  {
    id: "hist",
    name: "HIST",
    family: "Market Dynamics",
    year: 2022,
    paradigm: "Market Dynamics",
    description:
      "Concept-oriented shared information mining with a predefined concept graph, separating market-wide from stock-specific signal.",
    signature: "concept graph, hidden=64",
    benchmark: { annualizedReturn: 0.1689, informationRatio: 1.894, maxDrawdown: -0.0779, ic: 0.0352, rankIc: 0.0383 },
  },
  {
    id: "igmtf",
    name: "IGMTF",
    family: "Market Dynamics",
    year: 2022,
    paradigm: "Market Dynamics",
    description: "Instance-wise graph-based temporal fusion, combining group-level and individual price dynamics.",
    signature: "group graph, hidden=64",
    benchmark: { annualizedReturn: 0.1631, informationRatio: 1.842, maxDrawdown: -0.0798, ic: 0.0344, rankIc: 0.0372 },
  },
  {
    id: "krnn",
    name: "KRNN",
    family: "Market Dynamics",
    year: 2023,
    paradigm: "Market Dynamics",
    description: "Multi-scale recurrent ensembles trained on K-means clusters of the market state.",
    signature: "n_clusters=3, hidden=64",
    benchmark: { annualizedReturn: 0.1597, informationRatio: 1.801, maxDrawdown: -0.0836, ic: 0.0338, rankIc: 0.0366 },
  },
  {
    id: "sandwich",
    name: "Sandwich",
    family: "Market Dynamics",
    year: 2023,
    paradigm: "Market Dynamics",
    description: "Alternating temporal and cross-sectional attention blocks, projecting a market state between them.",
    signature: "temporal+cross-sectional attention, hidden=64",
    benchmark: { annualizedReturn: 0.1647, informationRatio: 1.869, maxDrawdown: -0.0788, ic: 0.0346, rankIc: 0.0377 },
  },

  {
    id: "add",
    name: "ADD",
    family: "Market Dynamics",
    year: 2021,
    paradigm: "Market Dynamics",
    description: "Adversarial concept drift detection and adaptation, weighting historical samples by regime relevance.",
    signature: "adversarial drift detection, hidden=64",
    benchmark: { annualizedReturn: 0.1498, informationRatio: 1.695, maxDrawdown: -0.0861, ic: 0.0316, rankIc: 0.0345 },
  },
  {
    id: "adarnn",
    name: "ADARNN",
    family: "Market Dynamics",
    year: 2021,
    paradigm: "Market Dynamics",
    description: "Adaptive RNN that re-weights the loss of each sample by how far it has drifted from the training regime.",
    signature: "loss adaptation, hidden=64",
    benchmark: { annualizedReturn: 0.1471, informationRatio: 1.664, maxDrawdown: -0.0889, ic: 0.0311, rankIc: 0.0339 },
  },
  {
    id: "ddgda",
    name: "DDG-DA",
    family: "Market Dynamics",
    year: 2022,
    paradigm: "Market Dynamics",
    description:
      "Data distillation for domain adaptation — forecasts the coming distribution and resamples training data accordingly.",
    signature: "data distillation, rolling re-fit",
    benchmark: { annualizedReturn: 0.1613, informationRatio: 1.823, maxDrawdown: -0.0807, ic: 0.0341, rankIc: 0.0371 },
  },
];

export const MODEL_FAMILIES: string[] = Array.from(new Set(MODELS.map((m) => m.family)));

export const MODEL_MAP: Record<string, ModelEntry> = Object.fromEntries(MODELS.map((m) => [m.id, m]));
