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
    authorizedEmailDomains: v.optional(v.array(v.string())), // Optional: restrict invitations to these email domains
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

    // Validate and normalize email domains if provided
    let normalizedDomains: string[] | undefined;
    if (args.authorizedEmailDomains && args.authorizedEmailDomains.length > 0) {
      normalizedDomains = validateAndNormalizeEmailDomains(args.authorizedEmailDomains);
    }

    // Create the organization first with owner set to the creator
    const orgaId = await ctx.db.insert("orgas", {
      name: args.name,
      logoUrl,
      colorScheme: args.colorScheme,
      owner: user._id,
      ...(normalizedDomains && { authorizedEmailDomains: normalizedDomains }),
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
/**
 * Validates and normalizes an array of email domains.
 * Returns a clean array with trimmed, lowercased, non-empty domains that contain a dot.
 * Throws an error if any domain is invalid after normalization.
 */
function validateAndNormalizeEmailDomains(domains: string[]): string[] {
  const normalized: string[] = [];

  for (const domain of domains) {
    const cleaned = domain.trim().toLowerCase();

    // Skip empty strings
    if (cleaned.length === 0) {
      continue;
    }

    // Validate domain format: must contain a dot, no leading/trailing dots, reasonable length
    if (!cleaned.includes('.')) {
      throw new Error(`Invalid domain format: "${domain}" must contain a dot`);
    }
    if (cleaned.startsWith('.') || cleaned.endsWith('.')) {
      throw new Error(`Invalid domain format: "${domain}" cannot start or end with a dot`);
    }
    // Check for consecutive dots (e.g., "example..com")
    if (cleaned.includes('..')) {
      throw new Error(`Invalid domain format: "${domain}" cannot contain consecutive dots`);
    }
    if (cleaned.length > 253) {
      throw new Error(`Invalid domain format: "${domain}" exceeds maximum length of 253 characters`);
    }
    // Check for invalid characters (basic check - domains should only have alphanumeric, dots, and hyphens)
    if (!/^[a-z0-9.-]+$/.test(cleaned)) {
      throw new Error(`Invalid domain format: "${domain}" contains invalid characters`);
    }
    // Per RFC 1035, domain labels cannot start or end with a hyphen
    const labels = cleaned.split('.');
    for (const label of labels) {
      if (label.startsWith('-') || label.endsWith('-')) {
        throw new Error(`Invalid domain format: "${domain}" has a label that starts or ends with a hyphen`);
      }
    }

    normalized.push(cleaned);
  }

  return normalized;
}

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
    // Optional: list of authorized email domains for invitations (owner-only)
    // Pass null to remove the restriction, empty array is treated the same as null
    authorizedEmailDomains: v.optional(v.union(v.array(v.string()), v.null())),
  },
  returns: v.id("orgas"),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);
    const orga = await ctx.db.get(args.orgaId);
    if (!orga) {
      throw new Error("Organization not found");
    }

    // Only the owner can modify organization settings
    const isOwner = orga.owner === member.personId;
    if (args.name !== undefined && !isOwner) {
      throw new Error("Only the organization owner can modify the organization name");
    }
    if (args.logoStorageId !== undefined && !isOwner) {
      throw new Error("Only the organization owner can modify the organization logo");
    }
    if (args.colorScheme !== undefined && !isOwner) {
      throw new Error("Only the organization owner can modify the color scheme");
    }
    if (args.authorizedEmailDomains !== undefined && !isOwner) {
      throw new Error("Only the organization owner can modify authorized email domains");
    }

    // Update organization
    const updates: {
      name?: string;
      logoUrl?: string;
      colorScheme?: ColorScheme;
      authorizedEmailDomains?: string[];
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
    if (args.authorizedEmailDomains !== undefined) {
      if (args.authorizedEmailDomains === null || args.authorizedEmailDomains.length === 0) {
        // Remove the restriction
        updates.authorizedEmailDomains = undefined;
      } else {
        // Validate and normalize the domains
        updates.authorizedEmailDomains = validateAndNormalizeEmailDomains(args.authorizedEmailDomains);
      }
    }

    // Build before and after with only modified fields
    const before: {
      name?: string;
      logoUrl?: string;
      colorScheme?: ColorScheme;
      authorizedEmailDomains?: string[];
    } = {};
    const after: {
      name?: string;
      logoUrl?: string;
      colorScheme?: ColorScheme;
      authorizedEmailDomains?: string[];
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
    if (args.authorizedEmailDomains !== undefined) {
      before.authorizedEmailDomains = orga.authorizedEmailDomains;
      after.authorizedEmailDomains = updates.authorizedEmailDomains;
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

/**
 * Delete an organization
 * Only the owner can delete, and only if they are the only member
 */
export const deleteOrganization = mutation({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await requireAuthAndMembership(ctx, args.orgaId);
    const orga = await ctx.db.get(args.orgaId);
    if (!orga) {
      throw new Error("Organization not found");
    }

    // Verify that the current user is the owner
    if (!orga.owner || orga.owner !== member.personId) {
      throw new Error("Only the owner can delete the organization");
    }

    // Verify that there is only one member
    const members = await ctx.db
      .query("members")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();

    if (members.length > 1) {
      throw new Error("Cannot delete organization with multiple members");
    }

    // Get user to update their orgaIds
    const user = await getAuthenticatedUser(ctx);

    // Delete all roles in the organization
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();
    for (const role of roles) {
      await ctx.db.delete(role._id);
    }

    // Delete all teams in the organization
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();
    for (const team of teams) {
      await ctx.db.delete(team._id);
    }

    // Delete all decisions in the organization
    const decisions = await ctx.db
      .query("decisions")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();
    for (const decision of decisions) {
      await ctx.db.delete(decision._id);
    }

    // Delete all invitations for the organization
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();
    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }

    // Delete the member (should be only one - the owner)
    for (const m of members) {
      await ctx.db.delete(m._id);
    }

    // Update user's orgaIds to remove this organization
    const updatedOrgaIds = user.orgaIds.filter((id) => id !== args.orgaId);
    await ctx.db.patch(user._id, {
      orgaIds: updatedOrgaIds,
    });

    // Finally delete the organization
    await ctx.db.delete(args.orgaId);

    return null;
  },
});

