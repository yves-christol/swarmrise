import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
} from "./utils";

/**
 * Get an organization by ID
 */
export const getOrgaById = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.union(
    v.object({
      _id: v.id("orgas"),
      _creationTime: v.number(),
      name: v.string(),
      logoUrl: v.optional(v.string()),
      colorScheme: v.object({
        primary: v.object({
          r: v.number(),
          g: v.number(),
          b: v.number(),
        }),
        secondary: v.object({
          r: v.number(),
          g: v.number(),
          b: v.number(),
        }),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);
    return await ctx.db.get(args.orgaId);
  },
});

/**
 * Update an organization
 */
export const updateOrga = mutation({
  args: {
    orgaId: v.id("orgas"),
    name: v.optional(v.string()),
    logoUrl: v.optional(v.union(v.string(), v.null())),
    colorScheme: v.optional(
      v.object({
        primary: v.object({
          r: v.number(),
          g: v.number(),
          b: v.number(),
        }),
        secondary: v.object({
          r: v.number(),
          g: v.number(),
          b: v.number(),
        }),
      })
    ),
  },
  returns: v.id("orgas"),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);
    const orga = await ctx.db.get(args.orgaId);
    if (!orga) {
      throw new Error("Organization not found");
    }
    
    // Store before state
    const before = {
      name: orga.name,
      logoUrl: orga.logoUrl,
      colorScheme: orga.colorScheme,
    };
    
    // Update organization
    const updates: {
      name?: string;
      logoUrl?: string;
      colorScheme?: {
        primary: { r: number; g: number; b: number };
        secondary: { r: number; g: number; b: number };
      };
    } = {};
    
    if (args.name !== undefined) updates.name = args.name;
    if (args.logoUrl !== undefined) {
      updates.logoUrl = args.logoUrl === null ? undefined : args.logoUrl;
    }
    if (args.colorScheme !== undefined) updates.colorScheme = args.colorScheme;
    
    await ctx.db.patch(args.orgaId, updates);
    
    // Get updated organization for after state
    const updatedOrga = await ctx.db.get(args.orgaId);
    if (!updatedOrga) {
      throw new Error("Failed to retrieve updated organization");
    }
    
    const after = {
      name: updatedOrga.name,
      logoUrl: updatedOrga.logoUrl,
      colorScheme: updatedOrga.colorScheme,
    };
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, args.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: args.orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.orgaId,
      targetType: "orgas",
      diff: {
        type: "Organization",
        before,
        after,
      },
    });
    
    return args.orgaId;
  },
});

