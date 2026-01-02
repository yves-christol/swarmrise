import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { policyValidator } from "./validators";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getOrgaFromRole,
  getOrgaFromTeam,
} from "./utils";

/**
 * Get a policy by ID
 */
export const getPolicyById = query({
  args: {
    policyId: v.id("policies"),
  },
  returns: v.union(policyValidator, v.null()),
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) {
      return null;
    }
    await requireAuthAndMembership(ctx, policy.orgaId);
    return policy;
  },
});

/**
 * List all policies in an organization
 */
export const listPoliciesInOrga = query({
  args: {
    orgaId: v.id("orgas"),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
  },
  returns: v.array(policyValidator),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);
    if (args.visibility) {
      return await ctx.db
        .query("policies")
        .withIndex("by_orga_and_visibility", (q) =>
          q.eq("orgaId", args.orgaId).eq("visibility", args.visibility as "private" | "public")
        )
        .collect();
    } else {
      return await ctx.db
        .query("policies")
        .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
        .collect();
    }
  },
});

/**
 * List all policies in a team
 */
export const listPoliciesInTeam = query({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.array(policyValidator),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    await requireAuthAndMembership(ctx, orgaId);
    return await ctx.db
      .query("policies")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

/**
 * List policies by role
 */
export const listPoliciesByRole = query({
  args: {
    roleId: v.id("roles"),
  },
  returns: v.array(policyValidator),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromRole(ctx, args.roleId);
    await requireAuthAndMembership(ctx, orgaId);
    return await ctx.db
      .query("policies")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();
  },
});

/**
 * Create a new policy
 */
export const createPolicy = mutation({
  args: {
    orgaId: v.id("orgas"),
    teamId: v.id("teams"),
    roleId: v.id("roles"),
    title: v.string(),
    text: v.string(),
    visibility: v.union(v.literal("private"), v.literal("public")),
    expirationDate: v.optional(v.number()),
  },
  returns: v.id("policies"),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);
    
    // Validate team belongs to organization
    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.orgaId !== args.orgaId) {
      throw new Error("Team must belong to the organization");
    }
    
    // Validate role belongs to team
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }
    if (role.teamId !== args.teamId) {
      throw new Error("Role must belong to the team");
    }
    
    // Create policy
    const policyId = await ctx.db.insert("policies", {
      orgaId: args.orgaId,
      teamId: args.teamId,
      roleId: args.roleId,
      issuedDate: Date.now(),
      title: args.title,
      text: args.text,
      visibility: args.visibility,
      expirationDate: args.expirationDate,
    });
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, args.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: args.orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: policyId,
      targetType: "policies",
      diff: {
        type: "Policy",
        before: undefined,
        after: {
          orgaId: args.orgaId,
          teamId: args.teamId,
          roleId: args.roleId,
          issuedDate: Date.now(),
          title: args.title,
          text: args.text,
          visibility: args.visibility,
          expirationDate: args.expirationDate,
        },
      },
    });
    
    return policyId;
  },
});

/**
 * Update a policy
 */
export const updatePolicy = mutation({
  args: {
    policyId: v.id("policies"),
    title: v.optional(v.string()),
    text: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    expirationDate: v.optional(v.union(v.number(), v.null())),
  },
  returns: v.id("policies"),
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }
    
    const member = await requireAuthAndMembership(ctx, policy.orgaId);
    
    // Update policy
    const updates: {
      title?: string;
      text?: string;
      visibility?: "private" | "public";
      expirationDate?: number;
    } = {};
    
    if (args.title !== undefined) updates.title = args.title;
    if (args.text !== undefined) updates.text = args.text;
    if (args.visibility !== undefined) updates.visibility = args.visibility;
    if (args.expirationDate !== undefined) updates.expirationDate = args.expirationDate ?? undefined;
    
    // Build before and after with only modified fields
    const before: {
      orgaId?: Id<"orgas">;
      teamId?: Id<"teams">;
      roleId?: Id<"roles">;
      issuedDate?: number;
      title?: string;
      text?: string;
      visibility?: "private" | "public";
      expirationDate?: number;
    } = {};
    const after: {
      orgaId?: Id<"orgas">;
      teamId?: Id<"teams">;
      roleId?: Id<"roles">;
      issuedDate?: number;
      title?: string;
      text?: string;
      visibility?: "private" | "public";
      expirationDate?: number;
    } = {};
    
    if (args.title !== undefined) {
      before.title = policy.title;
      after.title = args.title;
    }
    if (args.text !== undefined) {
      before.text = policy.text;
      after.text = args.text;
    }
    if (args.visibility !== undefined) {
      before.visibility = policy.visibility;
      after.visibility = args.visibility;
    }
    if (args.expirationDate !== undefined) {
      before.expirationDate = policy.expirationDate;
      after.expirationDate = args.expirationDate ?? undefined;
    }
    
    await ctx.db.patch(args.policyId, updates);
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, policy.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: policy.orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.policyId,
      targetType: "policies",
      diff: {
        type: "Policy",
        before: Object.keys(before).length > 0 ? before : undefined,
        after: Object.keys(after).length > 0 ? after : undefined,
      },
    });
    
    return args.policyId;
  },
});

/**
 * Delete a policy
 */
export const deletePolicy = mutation({
  args: {
    policyId: v.id("policies"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }
    
    const member = await requireAuthAndMembership(ctx, policy.orgaId);
    
    // Store before state
    const before = {
      orgaId: policy.orgaId,
      teamId: policy.teamId,
      roleId: policy.roleId,
      issuedDate: policy.issuedDate,
      title: policy.title,
      text: policy.text,
      visibility: policy.visibility,
      expirationDate: policy.expirationDate,
    };
    
    // Delete policy
    await ctx.db.delete(args.policyId);
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, policy.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: policy.orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.policyId,
      targetType: "policies",
      diff: {
        type: "Policy",
        before,
        after: undefined,
      },
    });
    
    return null;
  },
});

