import { mutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, getMemberInOrga } from "../utils";

/**
 * Generate an upload URL for client-side file uploads.
 * When orgaId is provided, verifies the caller is a member of that org.
 * When omitted, only verifies authentication (needed for org creation flow).
 */
export const generateUploadUrl = mutation({
  args: { orgaId: v.optional(v.id("orgas")) },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.orgaId) {
      await getMemberInOrga(ctx, args.orgaId);
    } else {
      await getAuthenticatedUser(ctx);
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Verify that the caller has access to a stored file.
 * Checks the storageFiles tracking table and verifies org membership.
 * Used by the HTTP file-serving endpoint.
 */
export const verifyFileAccess = internalQuery({
  args: { storageId: v.id("_storage") },
  returns: v.union(
    v.object({
      allowed: v.literal(true),
      mimeType: v.optional(v.string()),
      fileName: v.optional(v.string()),
    }),
    v.object({ allowed: v.literal(false) }),
  ),
  handler: async (ctx, args) => {
    const sf = await ctx.db
      .query("storageFiles")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (!sf) return { allowed: false };

    try {
      await getMemberInOrga(ctx, sf.orgaId);
    } catch {
      return { allowed: false };
    }

    return { allowed: true, mimeType: sf.mimeType, fileName: sf.fileName };
  },
});
