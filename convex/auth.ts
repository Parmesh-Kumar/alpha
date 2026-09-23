import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export const findUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) return null;
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      salt: user.salt,
      passwordHash: user.passwordHash,
    };
  },
});

export const createUserWithSession = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    salt: v.string(),
    passwordHash: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      salt: args.salt,
      passwordHash: args.passwordHash,
      createdAt: now,
    });
    await ctx.db.insert("sessions", {
      userId,
      token: args.token,
      createdAt: now,
      expiresAt: args.expiresAt,
    });
    return userId;
  },
});

export const createSession = internalMutation({
  args: { userId: v.id("users"), token: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.insert("sessions", {
      userId: args.userId,
      token: args.token,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });
  },
});

export const me = query({
  args: { token: v.union(v.string(), v.null()) },
  handler: async (ctx, { token }) => {
    if (!token) return null;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    if (!user) return null;
    return { id: user._id, email: user.email, name: user.name };
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  token: string | null,
): Promise<Doc<"users">> {
  if (!token) throw new Error("Not authenticated.");
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Your session has expired. Please sign in again.");
  }
  const user = await ctx.db.get(session.userId);
  if (!user) throw new Error("Not authenticated.");
  return user;
}
