import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
 * Ensure the user is authenticated and a member of the organization
 */
export async function requireAuthAndMembership(
  ctx: QueryCtx | MutationCtx,
  orgaId: Id<"orgas">
) {
  return await getMemberInOrga(ctx, orgaId);
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
export async function getTeamLeader(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">
): Promise<Id<"members">> {
  const leaderRole = await ctx.db
    .query("roles")
    .withIndex("by_team_and_role_type", (q) => q.eq("teamId", teamId).eq("roleType", "leader"))
    .first();
  
  if (!leaderRole) {
    throw new Error("Team leader role not found");
  }
  
  if (!leaderRole.memberId) {
    throw new Error("Team leader role is not assigned to a member");
  }
  
  return leaderRole.memberId;
}

/**
 * Get the leader role for a given team
 */
export async function getLeaderRole(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">
) {
  const leaderRole = await ctx.db
    .query("roles")
    .withIndex("by_team_and_role_type", (q) => q.eq("teamId", teamId).eq("roleType", "leader"))
    .first();
  
  if (!leaderRole) {
    throw new Error("Team leader role not found");
  }
  
  return leaderRole;
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

