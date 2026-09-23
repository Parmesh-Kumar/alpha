import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

const configValidator = v.object({
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

const metricsValidator = v.object({
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

export const list = query({
  args: { token: v.union(v.string(), v.null()) },
  handler: async (ctx, { token }) => {
    if (!token) return [];
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return [];
    const rows = await ctx.db
      .query("experiments")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    token: v.union(v.string(), v.null()),
    name: v.string(),
    note: v.string(),
    config: configValidator,
    metrics: metricsValidator,
    equityPreview: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const name = args.name.trim() || "Untitled run";
    return await ctx.db.insert("experiments", {
      userId: user._id,
      name,
      note: args.note,
      config: args.config,
      metrics: args.metrics,
      equityPreview: args.equityPreview,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { token: v.union(v.string(), v.null()), id: v.id("experiments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Experiment not found.");
    }
    await ctx.db.delete(args.id);
  },
});
