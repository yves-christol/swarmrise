import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { Infer } from "convex/values";
import { contactInfo } from "./users";
import type { Member } from "./members";

/**
 * Get the authenticated user's email or throw an error
 */
export async function getAuthenticatedUserEmail(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const email = identity.email;
  if (!email) {
    throw new Error("User email not found in identity");
  }
  return email;
}

/**
 * Get the authenticated user document or throw an error
 */
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const email = await getAuthenticatedUserEmail(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

/**
 * Get the member document for a user in an organization or throw an error
 */
export async function getMemberInOrga(
  ctx: QueryCtx | MutationCtx,
  orgaId: Id<"orgas">
) {
  const user = await getAuthenticatedUser(ctx);
  const member = await ctx.db
    .query("members")
    .withIndex("by_orga_and_person", (q) =>
      q.eq("orgaId", orgaId).eq("personId", user._id)
    )
    .unique();
  if (!member) {
    throw new Error("User is not a member of this organization");
  }
  return member;
}

/**
 * Get organization from a team ID
 */
export async function getOrgaFromTeam(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">
): Promise<Id<"orgas">> {
  const team = await ctx.db.get(teamId);
  if (!team) {
    throw new Error("Team not found");
  }
  return team.orgaId;
}

/**
 * Get organization from a role ID
 */
export async function getOrgaFromRole(
  ctx: QueryCtx | MutationCtx,
  roleId: Id<"roles">
): Promise<Id<"orgas">> {
  const role = await ctx.db.get(roleId);
  if (!role) {
    throw new Error("Role not found");
  }
  const team = await ctx.db.get(role.teamId);
  if (!team) {
    throw new Error("Team not found");
  }
  return team.orgaId;
}

/**
 * Get the team leader member ID for a given team
 * The leader is the member who holds the role with roleType "leader" in the team
 */
export async function getTeamLeaderMemberId(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">
): Promise<Id<"members">> {
  const leaderRole = await ctx.db
    .query("roles")
    .withIndex("by_team_and_role_type", (q) => q.eq("teamId", teamId).eq("roleType", "leader"))
    .first();
  
  if (!leaderRole) {
    throw new Error("Resource not found");
  }

  if (!leaderRole.memberId) {
    throw new Error("Operation not permitted");
  }
  
  return leaderRole.memberId;
}

/**
 * Check if a team already has a leader
 */
export async function hasTeamLeader(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">
): Promise<boolean> {
  const leaderRole = await ctx.db
    .query("roles")
    .withIndex("by_team_and_role_type", (q) => q.eq("teamId", teamId).eq("roleType", "leader"))
    .first();
  
  return leaderRole !== null;
}

/**
 * Get role and team information for decision creation
 */
export async function getRoleAndTeamInfo(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<"members">,
  orgaId: Id<"orgas">
): Promise<{ roleName: string; teamName: string }> {
  const member = await ctx.db.get(memberId);
  if (!member) {
    throw new Error("Member not found");
  }
  
  // Get the first role for the member (or use a default)
  if (member.roleIds.length > 0) {
    const role = await ctx.db.get(member.roleIds[0]);
    if (role) {
      const team = await ctx.db.get(role.teamId);
      if (team) {
        return {
          roleName: role.title,
          teamName: team.name,
        };
      }
    }
  }
  
  // Fallback: get the top-level team of the organization (leader role with undefined parentTeamId)
  const allTeams = await ctx.db
    .query("teams")
    .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
    .collect();
  
  for (const team of allTeams) {
    const leaderRole = await ctx.db
      .query("roles")
      .withIndex("by_team_and_role_type", (q) => q.eq("teamId", team._id).eq("roleType", "leader"))
      .first();
    
    if (leaderRole && !leaderRole.parentTeamId) {
      return {
        roleName: "Member",
        teamName: team.name,
      };
    }
  }
  
  throw new Error("Could not determine role and team information");
}

/**
 * Check if a member has at least one role in a team.
 */
export async function memberHasTeamAccess(
  ctx: QueryCtx | MutationCtx,
  member: Member,
  teamId: Id<"teams">,
): Promise<boolean> {
  for (const roleId of member.roleIds) {
    const role = await ctx.db.get(roleId);
    if (role && role.teamId === teamId) return true;
  }
  return false;
}

/**
 * Ensure an Email contact info entry exists in a contactInfos array.
 * If no Email entry matching the given address is present, prepends one.
 * Returns the (possibly augmented) array -- never mutates the original.
 */
export function ensureEmailInContactInfos(
  contactInfos: Infer<typeof contactInfo>[],
  email: string
): Infer<typeof contactInfo>[] {
  const hasEmail = contactInfos.some(
    (ci) => ci.type === "Email" && ci.value === email
  );
  if (hasEmail) {
    return contactInfos;
  }
  return [{ type: "Email" as const, value: email }, ...contactInfos];
}

