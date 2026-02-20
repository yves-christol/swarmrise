import { query, mutation, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { policyValidator } from ".";
import {
  getMemberInOrga,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getOrgaFromRole,
} from "../utils";
import {
  buildPolicyGlobalNotification,
  getOrgaMemberUsers,
} from "../notifications/helpers";

/**
 * Helper: get the next policy number for an organization.
 * Queries the max existing number and returns max + 1 (or 1 if none exist).
 */
async function getNextPolicyNumber(
  ctx: { db: { query: (table: "policies") => any } },
  orgaId: Id<"orgas">
): Promise<number> {
  // Query policies by orga in descending order of number to find the max
  const lastPolicy = await ctx.db
    .query("policies")
    .withIndex("by_orga_and_number", (q: any) => q.eq("orgaId", orgaId))
    .order("desc")
    .first();
  return lastPolicy ? lastPolicy.number + 1 : 1;
}

/**
 * Helper: verify the caller holds the specified role.
 * Returns the member document if authorized, throws otherwise.
 */
async function verifyRoleOwnership(
  ctx: any,
  roleId: Id<"roles">,
  orgaId: Id<"orgas">
) {
  const member = await getMemberInOrga(ctx, orgaId);
  const role = await ctx.db.get(roleId);
  if (!role) {
    throw new Error("Role not found");
  }
  if (role.orgaId !== orgaId) {
    throw new Error("Role does not belong to this organization");
  }
  if (role.memberId !== member._id) {
    throw new Error("Only the role holder can manage policies for this role");
  }
  return { member, role };
}

/**
 * Get a policy by ID
 */
export const get = query({
  args: {
    policyId: v.id("policies"),
  },
  returns: v.union(policyValidator, v.null()),
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) {
      return null;
    }
    await getMemberInOrga(ctx, policy.orgaId);
    return policy;
  },
});

/**
 * List all policies in an organization, optionally filtered by search term.
 * Search uses the search index on title; for abstract search, client-side
 * filtering is used as Convex search indexes support a single searchField.
 */
export const list = query({
  args: {
    orgaId: v.id("orgas"),
    search: v.optional(v.string()),
  },
  returns: v.array(policyValidator),
  handler: async (ctx, args) => {
    await getMemberInOrga(ctx, args.orgaId);

    if (args.search && args.search.trim().length > 0) {
      const searchTerm = args.search.trim();
      // Use the search index on title, filtered by orgaId
      const titleMatches = await ctx.db
        .query("policies")
        .withSearchIndex("search_title_abstract", (q: any) =>
          q.search("title", searchTerm).eq("orgaId", args.orgaId)
        )
        .collect();

      // Also search by abstract client-side from the full list
      // (Convex only supports one searchField per search index)
      const allPolicies = await ctx.db
        .query("policies")
        .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
        .collect();

      const lowerSearch = searchTerm.toLowerCase();
      const abstractMatches = allPolicies.filter(
        (p) => p.abstract.toLowerCase().includes(lowerSearch)
      );

      // Merge results, deduplicating by _id
      const seen = new Set<string>();
      const merged = [];
      for (const p of titleMatches) {
        if (!seen.has(p._id)) {
          seen.add(p._id);
          merged.push(p);
        }
      }
      for (const p of abstractMatches) {
        if (!seen.has(p._id)) {
          seen.add(p._id);
          merged.push(p);
        }
      }

      // Sort by number ascending
      merged.sort((a, b) => a.number - b.number);
      return merged;
    }

    return await ctx.db
      .query("policies")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();
  },
});

/**
 * List all policies owned by a specific role
 */
export const listByRole = query({
  args: {
    roleId: v.id("roles"),
  },
  returns: v.array(policyValidator),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromRole(ctx, args.roleId);
    await getMemberInOrga(ctx, orgaId);
    return await ctx.db
      .query("policies")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();
  },
});

/**
 * Create a new policy.
 * Only the member holding the specified role can create a policy for it.
 * The policy number is auto-incremented per organization.
 */
export const create = mutation({
  args: {
    orgaId: v.id("orgas"),
    roleId: v.id("roles"),
    title: v.string(),
    abstract: v.string(),
    text: v.string(),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("policies"),
  handler: async (ctx, args) => {
    const { member, role } = await verifyRoleOwnership(ctx, args.roleId, args.orgaId);

    // Auto-increment policy number
    const number = await getNextPolicyNumber(ctx, args.orgaId);

    const policyId = await ctx.db.insert("policies", {
      orgaId: args.orgaId,
      roleId: args.roleId,
      number,
      title: args.title,
      abstract: args.abstract,
      text: args.text,
      attachmentIds: args.attachmentIds,
    });

    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, args.orgaId);

    await ctx.db.insert("decisions", {
      orgaId: args.orgaId,
      authorEmail: email,
      roleName,
      teamName,
      targetTeamId: role.teamId,
      targetId: policyId,
      targetType: "policies",
      diff: {
        type: "Policy",
        before: undefined,
        after: {
          orgaId: args.orgaId,
          roleId: args.roleId,
          number,
          title: args.title,
          abstract: args.abstract,
          text: args.text,
        },
      },
    });

    // Notify all organization members except the creator
    const orga = await ctx.db.get(args.orgaId);
    const orgaName = orga?.name ?? "Unknown Organization";
    const orgaMembers = await getOrgaMemberUsers(ctx, args.orgaId);
    const notifications = orgaMembers
      .filter((m) => m.userId !== member.personId)
      .map((m) =>
        buildPolicyGlobalNotification({
          userId: m.userId,
          orgaId: args.orgaId,
          memberId: m.memberId,
          policyId: policyId,
          policyTitle: args.title,
          orgaName: orgaName,
        })
      );

    if (notifications.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.functions.createBatch,
        { notifications }
      );
    }

    return policyId;
  },
});

/**
 * Update a policy.
 * Only the member holding the policy's owning role can update it.
 */
export const update = mutation({
  args: {
    policyId: v.id("policies"),
    title: v.optional(v.string()),
    abstract: v.optional(v.string()),
    text: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("policies"),
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    const { member } = await verifyRoleOwnership(ctx, policy.roleId, policy.orgaId);

    // Build updates
    const updates: {
      title?: string;
      abstract?: string;
      text?: string;
      attachmentIds?: Id<"_storage">[];
    } = {};

    if (args.title !== undefined) updates.title = args.title;
    if (args.abstract !== undefined) updates.abstract = args.abstract;
    if (args.text !== undefined) updates.text = args.text;
    if (args.attachmentIds !== undefined) updates.attachmentIds = args.attachmentIds;

    // Build before/after diff with only modified fields
    const before: {
      title?: string;
      abstract?: string;
      text?: string;
    } = {};
    const after: {
      title?: string;
      abstract?: string;
      text?: string;
    } = {};

    if (args.title !== undefined) {
      before.title = policy.title;
      after.title = args.title;
    }
    if (args.abstract !== undefined) {
      before.abstract = policy.abstract;
      after.abstract = args.abstract;
    }
    if (args.text !== undefined) {
      before.text = policy.text;
      after.text = args.text;
    }

    await ctx.db.patch(args.policyId, updates);

    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, policy.orgaId);

    const role = await ctx.db.get(policy.roleId);

    await ctx.db.insert("decisions", {
      orgaId: policy.orgaId,
      authorEmail: email,
      roleName,
      teamName,
      targetTeamId: role?.teamId,
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
 * Delete a policy.
 * Only the member holding the policy's owning role can delete it.
 */
export const remove = mutation({
  args: {
    policyId: v.id("policies"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    const { member } = await verifyRoleOwnership(ctx, policy.roleId, policy.orgaId);

    // Delete associated storage files if any
    if (policy.attachmentIds && policy.attachmentIds.length > 0) {
      for (const storageId of policy.attachmentIds) {
        try {
          await ctx.storage.delete(storageId);
        } catch {
          // Storage file may already be deleted
        }
        // Also delete tracking record if it exists
        const trackingRecord = await ctx.db
          .query("storageFiles")
          .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
          .unique();
        if (trackingRecord) {
          await ctx.db.delete(trackingRecord._id);
        }
      }
    }

    // Store before state for decision record
    const before = {
      orgaId: policy.orgaId,
      roleId: policy.roleId,
      number: policy.number,
      title: policy.title,
      abstract: policy.abstract,
      text: policy.text,
    };

    const role = await ctx.db.get(policy.roleId);

    await ctx.db.delete(args.policyId);

    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, policy.orgaId);

    await ctx.db.insert("decisions", {
      orgaId: policy.orgaId,
      authorEmail: email,
      roleName,
      teamName,
      targetTeamId: role?.teamId,
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

/**
 * Transfer all policies from one role to another.
 * Internal mutation called when a role is deleted -- policies are transferred
 * to the leader of the related team.
 */
export const transferToLeader = internalMutation({
  args: {
    fromRoleId: v.id("roles"),
    toRoleId: v.id("roles"),
    orgaId: v.id("orgas"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const policies = await ctx.db
      .query("policies")
      .withIndex("by_role", (q) => q.eq("roleId", args.fromRoleId))
      .collect();

    for (const policy of policies) {
      await ctx.db.patch(policy._id, {
        roleId: args.toRoleId,
      });
    }

    return null;
  },
});
