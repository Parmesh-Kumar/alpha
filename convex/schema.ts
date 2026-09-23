import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const backtestConfig = v.object({
  factorIds: v.array(v.string()),
  weights: v.record(v.string(), v.number()),
  startIndex: v.number(),
  rebalanceDays: v.number(),
  quantile: v.number(),
  longShort: v.boolean(),
  costBps: v.number(),
  slippageBps: v.number(),
  volatilityTarget: v.union(v.number(), v.null()),
});

const backtestMetrics = v.object({
  totalReturn: v.number(),
  annualizedReturn: v.number(),
  annualizedVol: v.number(),
  sharpe: v.number(),
  sortino: v.number(),
  maxDrawdown: v.number(),
  calmar: v.number(),
  hitRate: v.number(),
  annualTurnover: v.number(),
  averagePositions: v.number(),
  ic: v.number(),
  rankIc: v.number(),
  icIr: v.number(),
  beta: v.number(),
  alpha: v.number(),
  benchmarkReturn: v.number(),
  bestDay: v.number(),
  worstDay: v.number(),
});

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    salt: v.string(),
    passwordHash: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  experiments: defineTable({
    userId: v.id("users"),
    name: v.string(),
    note: v.string(),
    config: backtestConfig,
    metrics: backtestMetrics,
    equityPreview: v.array(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
