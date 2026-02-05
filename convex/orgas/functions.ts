import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { orgaValidator, ColorScheme } from ".";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getAuthenticatedUser,
} from "../utils";

/**
 * Get an organization by ID
 */
export const getOrgaById = query({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.union(orgaValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAuthAndMembership(ctx, args.orgaId);
    return await ctx.db.get(args.orgaId);
  },
});

/**
 * Get organizations with their counts (members, teams, roles) for the authenticated user
 */
export const listMyOrgasWithCounts = query({
  args: {},
  returns: v.array(
    v.object({
      orga: orgaValidator,
      counts: v.object({
        members: v.number(),
        teams: v.number(),
        roles: v.number(),
      }),
    })
  ),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const orgas = [];
    for (const orgaId of user.orgaIds) {
      const orga = await ctx.db.get(orgaId);
      if (orga) {
        // Get counts using direct queries (more reliable than aggregates for existing data)
        const [membersList, teamsList, rolesList] = await Promise.all([
          ctx.db
            .query("members")
            .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
            .collect(),
          ctx.db
            .query("teams")
            .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
            .collect(),
          ctx.db
            .query("roles")
            .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
            .collect(),
        ]);
        orgas.push({
          orga,
          counts: {
            members: membersList.length,
            teams: teamsList.length,
            roles: rolesList.length,
          },
        });
      }
    }
    return orgas;
  },
});

/**
 * Create a new organization
 * Only authenticated users can create an organization.
 * The creating user becomes the first member and holds all three initial roles (Leader, Secretary, Referee).
 */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    logoStorageId: v.optional(v.id("_storage")), // Storage ID for uploaded logo
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
    firstTeamName: v.optional(v.string()), // Optional name for the first team, defaults to organization name
  },
  returns: v.id("orgas"),
  handler: async (ctx, args) => {
    // Ensure user is authenticated
    const user = await getAuthenticatedUser(ctx);

    // Get the logo URL from storage if a storage ID was provided
    let logoUrl: string | undefined;
    if (args.logoStorageId) {
      const url = await ctx.storage.getUrl(args.logoStorageId);
      if (url) {
        logoUrl = url;
      }
    }

    // Create the organization first with owner set to the creator
    const orgaId = await ctx.db.insert("orgas", {
      name: args.name,
      logoUrl,
      colorScheme: args.colorScheme,
      owner: user._id,
    });

    // Create member document for the user
    const memberId = await ctx.db.insert("members", {
      orgaId,
      personId: user._id,
      firstname: user.firstname,
      surname: user.surname,
      email: user.email,
      pictureURL: user.pictureURL,
      contactInfos: user.contactInfos,
      roleIds: [], // Will be populated after roles are created
    });
    
    // Create the first team (top-level team with no parentTeamId)
    const firstTeamName = args.firstTeamName || args.name;
    const teamId = await ctx.db.insert("teams", {
      orgaId,
      name: firstTeamName,
    });
    
    // Create the three initial roles with placeholder missions and duties
    const leaderRoleId = await ctx.db.insert("roles", {
      orgaId,
      teamId,
      title: "Leader",
      roleType: "leader",
      mission: "TODO: Define Leader mission", // Placeholder
      duties: ["TODO: Define Leader duties"], // Placeholder
      memberId,
    });
    
    const secretaryRoleId = await ctx.db.insert("roles", {
      orgaId,
      teamId,
      title: "Secretary",
      roleType: "secretary",
      mission: "TODO: Define Secretary mission", // Placeholder
      duties: ["TODO: Define Secretary duties"], // Placeholder
      memberId,
    });
    
    const refereeRoleId = await ctx.db.insert("roles", {
      orgaId,
      teamId,
      title: "Referee",
      roleType: "referee",
      mission: "TODO: Define Referee mission", // Placeholder
      duties: ["TODO: Define Referee duties"], // Placeholder
      memberId,
    });
    
    // Update member with role IDs
    await ctx.db.patch(memberId, {
      roleIds: [leaderRoleId, secretaryRoleId, refereeRoleId],
    });
    
    // Add organization to user's orgaIds
    await ctx.db.patch(user._id, {
      orgaIds: [...user.orgaIds, orgaId],
    });
    
    // Create decision record for organization creation
    const email = await getAuthenticatedUserEmail(ctx);
    
    await ctx.db.insert("decisions", {
      orgaId,
      authorEmail: email,
      roleName: "Leader", // User is creating as Leader
      teamName: firstTeamName,
      targetId: orgaId,
      targetType: "orgas",
      diff: {
        type: "Organization",
        before: undefined,
        after: {
          name: args.name,
          logoUrl,
          colorScheme: args.colorScheme,
        },
      },
    });
    
    return orgaId;
  },
});

/**
 * Update an organization
 */
export const updateOrga = mutation({
  args: {
    orgaId: v.id("orgas"),
    name: v.optional(v.string()),
    logoStorageId: v.optional(v.union(v.id("_storage"), v.null())), // Storage ID for uploaded logo, null to remove
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

    // Update organization
    const updates: {
      name?: string;
      logoUrl?: string;
      colorScheme?: ColorScheme;
    } = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.logoStorageId !== undefined) {
      if (args.logoStorageId === null) {
        updates.logoUrl = undefined;
      } else {
        const url = await ctx.storage.getUrl(args.logoStorageId);
        updates.logoUrl = url ?? undefined;
      }
    }
    if (args.colorScheme !== undefined) updates.colorScheme = args.colorScheme;

    // Build before and after with only modified fields
    const before: {
      name?: string;
      logoUrl?: string;
      colorScheme?: ColorScheme;
    } = {};
    const after: {
      name?: string;
      logoUrl?: string;
      colorScheme?: ColorScheme;
    } = {};

    if (args.name !== undefined) {
      before.name = orga.name;
      after.name = args.name;
    }
    if (args.logoStorageId !== undefined) {
      before.logoUrl = orga.logoUrl;
      after.logoUrl = updates.logoUrl;
    }
    if (args.colorScheme !== undefined) {
      before.colorScheme = orga.colorScheme;
      after.colorScheme = args.colorScheme;
    }
    
    await ctx.db.patch(args.orgaId, updates);
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, args.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: args.orgaId,
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.orgaId,
      targetType: "orgas",
      diff: {
        type: "Organization",
        before: Object.keys(before).length > 0 ? before : undefined,
        after: Object.keys(after).length > 0 ? after : undefined,
      },
    });
    
    return args.orgaId;
  },
});

/**
 * Transfer ownership of an organization to another member
 * Only the current owner can transfer ownership
 */
export const transferOwnership = mutation({
  args: {
    orgaId: v.id("orgas"),
    newOwnerMemberId: v.id("members"),
  },
  returns: v.id("orgas"),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);
    const orga = await ctx.db.get(args.orgaId);
    if (!orga) {
      throw new Error("Organization not found");
    }
    
    // Verify that the current user is the owner
    if (!orga.owner || orga.owner !== member.personId) {
      throw new Error("Only the owner can transfer ownership");
    }
    
    // Verify that the new owner is a member of the organization
    const newOwner = await ctx.db.get(args.newOwnerMemberId);
    if (!newOwner) {
      throw new Error("New owner member not found");
    }
    if (newOwner.orgaId !== args.orgaId) {
      throw new Error("New owner must be a member of the organization");
    }
    
    // Verify that the new owner is not the current owner
    if (newOwner._id === member._id) {
      throw new Error("New owner must be different from the current owner");
    }
    
    // Transfer ownership
    // Note: owner is not part of the Organization diff schema, so we don't track it
    await ctx.db.patch(args.orgaId, {
      owner: newOwner.personId
    });
    
    // Create decision record
    // Since owner is not in the diff schema, we create a decision with empty diff
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, args.orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId: args.orgaId,
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.orgaId,
      targetType: "orgas",
      diff: {
        type: "Organization",
        before: undefined,
        after: undefined,
      },
    });
    
    return args.orgaId;
  },
});

