import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./utils";

/**
 * Generate an upload URL for client-side file uploads.
 * Requires authentication to prevent unauthorized uploads.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Ensure user is authenticated before allowing uploads
    await getAuthenticatedUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get the URL for a stored file.
 * Requires authentication. Returns null if the file doesn't exist.
 */
export const getStorageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Delete a file from storage.
 * Internal only - not exposed to clients.
 */
export const deleteStorageFile = internalMutation({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
    return null;
  },
});
