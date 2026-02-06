import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { userValidator } from "./users";

/**
 * Get the admin user by email configured in ADMIN_EMAIL environment variable.
 * This is an internal query - not exposed to the public API.
 */
export const getAdmin = internalQuery({
  args: {},
  returns: v.union(userValidator, v.null()),
  handler: async (ctx) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn("ADMIN_EMAIL environment variable is not set");
      return null;
    }

    try {
      return await ctx.db.query("users").withIndex('by_email', (q) => q.eq('email', adminEmail)).unique();
    } catch {
      return null;
    }
  },
});
