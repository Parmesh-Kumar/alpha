"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { internal } from "./_generated/api";
import { SESSION_DURATION_MS } from "./auth";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function newToken(): string {
  return randomBytes(32).toString("hex");
}

interface AuthResult {
  token: string;
  email: string;
  name: string;
}

export const signUp = action({
  args: { email: v.string(), password: v.string(), name: v.string() },
  handler: async (ctx, args): Promise<AuthResult> => {
    const email = args.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    const name = args.name.trim() || email.split("@")[0];

    const existing = await ctx.runQuery(internal.auth.findUserByEmail, { email });
    if (existing) {
      throw new Error("An account with that email already exists.");
    }

    const salt = randomBytes(16).toString("hex");
    const token = newToken();

    await ctx.runMutation(internal.auth.createUserWithSession, {
      email,
      name,
      salt,
      passwordHash: hashPassword(args.password, salt),
      token,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    return { token, email, name };
  },
});

export const signIn = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<AuthResult> => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.runQuery(internal.auth.findUserByEmail, { email });
    if (!user) {
      throw new Error("Incorrect email or password.");
    }

    const candidate = Buffer.from(hashPassword(args.password, user.salt), "hex");
    const stored = Buffer.from(user.passwordHash, "hex");
    if (candidate.length !== stored.length || !timingSafeEqual(candidate, stored)) {
      throw new Error("Incorrect email or password.");
    }

    const token = newToken();
    await ctx.runMutation(internal.auth.createSession, {
      userId: user.id,
      token,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    return { token, email: user.email, name: user.name };
  },
});
