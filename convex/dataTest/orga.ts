import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";

const TEST_ORGA_NAME_PREFIX = "TEST_MODEL_";

/**
 * Create a test organization with:
 * - 81-121 members (1 admin + 80-120 test users from createTestUsers)
 * - 20-30 teams (created recursively from roles)
 * - Each member holds 1-5 roles across the teams
 */
export const createTestOrganization = internalMutation({
  args: {},
  returns: v.object({
    orgaId: v.id("orgas"),
    memberCount: v.number(),
    teamCount: v.number(),
    roleCount: v.number(),
  }),
  handler: async (ctx): Promise<{
    orgaId: Id<"orgas">;
    memberCount: number;
    teamCount: number;
    roleCount: number;
  }> => {
    const user = await ctx.runQuery(internal.admin.getAdmin, {});
    if (!user) {
      throw new Error("Admin user not found");
    }
    
    // Generate random target number of teams between 20 and 30
    const targetTeamCount = 20 + Math.floor(Math.random() * 11); // 20-30 inclusive
    
    // Create the test organization
    const timestamp = Date.now();
    const testOrgaName = `${TEST_ORGA_NAME_PREFIX}${timestamp}`;
    
    // Create the organization
    const orgaId = await ctx.db.insert("orgas", {
      name: testOrgaName,
      logoUrl: undefined,
      colorScheme: {
        primary: { r: 100, g: 150, b: 200 },
        secondary: { r: 200, g: 150, b: 100 },
      },
      owner: user._id,
    });
    
    // Create member document for the first user
    const memberId = await ctx.db.insert("members", {
      orgaId: orgaId,
      personId: user._id,
      firstname: user.firstname,
      surname: user.surname,
      email: user.email,
      pictureURL: user.pictureURL,
      contactInfos: user.contactInfos,
      roleIds: [], // Will be populated after roles are created
    });
    
    // Create the first team (top-level team with no parentTeamId on leader role)
    const firstTeamId = await ctx.db.insert("teams", {
      orgaId,
      name: `${testOrgaName} - First Team`,
    });
    
    // Helper function to create a team from a role (replicates createTeam mutation logic)
    const createTeamFromRole = async (
      roleId: Id<"roles">,
      teamName: string,
      parentTeamId: Id<"teams"> | undefined
    ): Promise<Id<"teams">> => {
      const role = await ctx.db.get(roleId);
      if (!role) {
        throw new Error("Role not found");
      }
      if (role.roleType === "leader") {
        throw new Error("Cannot create a team with a leader role");
      }
      
      // If this is a top-level team (no parentTeamId), ensure there's only one
      if (!parentTeamId) {
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
            throw new Error("There can only be one top-level team in an organization");
          }
        }
      }
      
      // Create the team
      const newTeamId = await ctx.db.insert("teams", {
        orgaId,
        name: teamName,
      });
      
      // Create leader role from the provided role
      const leaderRoleId = await ctx.db.insert("roles", {
        orgaId,
        teamId: newTeamId,
        parentTeamId: parentTeamId,
        title: role.title,
        roleType: "leader",
        mission: role.mission,
        duties: role.duties,
        memberId: role.memberId,
      });
      
      // Update member's roleIds to include the new leader role
      const roleMember = await ctx.db.get(role.memberId);
      if (roleMember) {
        await ctx.db.patch(role.memberId, {
          roleIds: [...roleMember.roleIds, leaderRoleId],
        });
      }
      
      return newTeamId;
    };
    
    // Helper function to populate a team with roles
    const populateTeamWithRoles = async (
      teamId: Id<"teams">,
      numRoles: number,
      memberIds: Id<"members">[]
    ): Promise<Id<"roles">[]> => {
      const roleTitles = [
        "Developer",
        "Designer",
        "Manager",
        "Analyst",
        "Coordinator",
        "Specialist",
        "Consultant",
        "Advisor",
        "Assistant",
        "Supervisor",
      ];
      
      const roleIds: Id<"roles">[] = [];
      
      for (let i = 0; i < numRoles; i++) {
        // Randomly select a member
        const memberIndex = Math.floor(Math.random() * memberIds.length);
        const selectedMemberId = memberIds[memberIndex];
        
        // Select a random role title
        const roleTitleIndex = Math.floor(Math.random() * roleTitles.length);
        const roleTitle = roleTitles[roleTitleIndex];
        
        const roleId = await ctx.db.insert("roles", {
          orgaId,
          teamId,
          title: roleTitle,
          mission: `Test mission for ${roleTitle}`,
          duties: [`Test duty 1 for ${roleTitle}`, `Test duty 2 for ${roleTitle}`],
          memberId: selectedMemberId,
        });
        
        roleIds.push(roleId);
        
        // Update member's roleIds
        const member = await ctx.db.get(selectedMemberId);
        if (member) {
          await ctx.db.patch(selectedMemberId, {
            roleIds: [...member.roleIds, roleId],
          });
        }
      }
      
      return roleIds;
    };
    
    // Create test users
    const { userIds: testUserIds } = await ctx.runMutation(
      internal.dataTest.users.createTestUsers,
      {}
    );
    
    // Create members for all test users
    const memberIds: Id<"members">[] = [memberId];
    const userIds: Id<"users">[] = [user._id];
    
    for (const testUserId of testUserIds) {
      const testUser = (await ctx.db.get(testUserId)) as Doc<"users"> | null;
      if (!testUser) {
        throw new Error(`Test user ${testUserId} not found`);
      }
      
      userIds.push(testUser._id);
      
      const testMemberId = await ctx.db.insert("members", {
        orgaId,
        personId: testUser._id,
        firstname: testUser.firstname,
        surname: testUser.surname,
        email: testUser.email,
        pictureURL: testUser.pictureURL,
        contactInfos: testUser.contactInfos,
        roleIds: [],
      });
      memberIds.push(testMemberId);
      
      if (!testUser.orgaIds.includes(orgaId)) {
        await ctx.db.patch(testUser._id, {
          orgaIds: [...testUser.orgaIds, orgaId],
        });
      }
    }
    
    // Add organization to user's orgaIds
    await ctx.db.patch(user._id, {
      orgaIds: [...user.orgaIds, orgaId],
    });
    
    // Create the three initial roles for the first team (Leader, Secretary, Referee)
    const leaderRoleId = await ctx.db.insert("roles", {
      orgaId,
      teamId: firstTeamId,
      title: "Leader",
      roleType: "leader",
      mission: "Test Leader mission",
      duties: ["Test Leader duty 1", "Test Leader duty 2"],
      memberId,
    });
    
    const secretaryRoleId = await ctx.db.insert("roles", {
      orgaId,
      teamId: firstTeamId,
      title: "Secretary",
      roleType: "secretary",
      mission: "Test Secretary mission",
      duties: ["Test Secretary duty 1"],
      memberId,
    });
    
    const refereeRoleId = await ctx.db.insert("roles", {
      orgaId,
      teamId: firstTeamId,
      title: "Referee",
      roleType: "referee",
      mission: "Test Referee mission",
      duties: ["Test Referee duty 1"],
      memberId,
    });
    
    // Update member with initial role IDs
    await ctx.db.patch(memberId, {
      roleIds: [leaderRoleId, secretaryRoleId, refereeRoleId],
    });
    
    // Populate the first team with 5-12 additional roles
    const initialRoleCount = 5 + Math.floor(Math.random() * 8); // 5-12 inclusive
    const additionalFirstTeamRoleIds = await populateTeamWithRoles(
      firstTeamId,
      initialRoleCount,
      memberIds
    );
    
    // Track all teams and roles created
    const teamIds: Id<"teams">[] = [firstTeamId];
    let totalRoleCount = 3 + initialRoleCount; // Leader, Secretary, Referee + additional roles
    
    // Recursive function to create teams from roles
    const createTeamsRecursively = async (
      parentTeamId: Id<"teams">,
      rolesToProcess: Id<"roles">[],
      teamNamePrefix: string,
      depth: number
    ): Promise<void> => {
      if (teamIds.length >= targetTeamCount || rolesToProcess.length === 0) {
        return;
      }
      
      // Select some roles to turn into teams (30-50% of available roles, but at least 1)
      const numRolesToConvert = Math.min(
        Math.max(1, Math.floor(rolesToProcess.length * (0.3 + Math.random() * 0.2))),
        rolesToProcess.length,
        targetTeamCount - teamIds.length
      );
      
      // Randomly select roles to convert
      const rolesToConvert = rolesToProcess
        .sort(() => Math.random() - 0.5)
        .slice(0, numRolesToConvert);
      
      for (let i = 0; i < rolesToConvert.length && teamIds.length < targetTeamCount; i++) {
        const roleId = rolesToConvert[i];
        const role = await ctx.db.get(roleId);
        if (!role || role.roleType === "leader") {
          continue; // Skip if role is a leader
        }
        
        const newTeamName = `${teamNamePrefix} - Team ${teamIds.length + 1}`;
        const newTeamId = await createTeamFromRole(roleId, newTeamName, parentTeamId);
        teamIds.push(newTeamId);
        
        // Populate the new team with 5-12 roles
        const newTeamRoleCount = 5 + Math.floor(Math.random() * 8); // 5-12 inclusive
        const newTeamRoleIds = await populateTeamWithRoles(
          newTeamId,
          newTeamRoleCount,
          memberIds
        );
        totalRoleCount += newTeamRoleCount;
        
        // Recursively create teams from the new team's roles
        if (teamIds.length < targetTeamCount) {
          await createTeamsRecursively(
            newTeamId,
            newTeamRoleIds,
            `${teamNamePrefix} - ${teamIds.length}`,
            depth + 1
          );
        }
      }
    };
    
    // Start recursive team creation from the first team's roles
    const firstTeamRoles = [secretaryRoleId, refereeRoleId, ...additionalFirstTeamRoleIds];
    await createTeamsRecursively(
      firstTeamId,
      firstTeamRoles,
      testOrgaName,
      0
    );
    
    // Assign additional roles to members across all teams (to reach 1-5 roles per member)
    const allTeams = await ctx.db
      .query("teams")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();
    
    for (const memberIdToAssign of memberIds) {
      const member = await ctx.db.get(memberIdToAssign);
      if (!member) continue;
      
      // Current number of roles for this member
      const currentRoleCount = member.roleIds.length;
      
      // Target: 1-5 roles per member
      const targetRoleCount = 1 + Math.floor(Math.random() * 5);
      
      if (currentRoleCount < targetRoleCount) {
        const numRolesNeeded = targetRoleCount - currentRoleCount;
        const selectedTeams = new Set<Id<"teams">>();
        
        // Select random teams
        while (selectedTeams.size < numRolesNeeded && selectedTeams.size < allTeams.length) {
          const randomTeamIndex = Math.floor(Math.random() * allTeams.length);
          selectedTeams.add(allTeams[randomTeamIndex]._id);
        }
        
        // Create roles for this member
        const memberRoleIds: Id<"roles">[] = [];
        const roleTitles = [
          "Developer",
          "Designer",
          "Manager",
          "Analyst",
          "Coordinator",
          "Specialist",
          "Consultant",
          "Advisor",
          "Assistant",
          "Supervisor",
        ];
        
        for (const teamId of selectedTeams) {
          const roleTitleIndex = Math.floor(Math.random() * roleTitles.length);
          const roleTitle = roleTitles[roleTitleIndex];
          
          const roleId = await ctx.db.insert("roles", {
            orgaId,
            teamId,
            title: roleTitle,
            mission: `Test mission for ${roleTitle}`,
            duties: [`Test duty 1 for ${roleTitle}`, `Test duty 2 for ${roleTitle}`],
            memberId: memberIdToAssign,
          });
          
          memberRoleIds.push(roleId);
          totalRoleCount++;
        }
        
        // Update member with new role IDs
        await ctx.db.patch(memberIdToAssign, {
          roleIds: [...member.roleIds, ...memberRoleIds],
        });
      }
    }
    
    return {
      orgaId,
      memberCount: memberIds.length,
      teamCount: teamIds.length,
      roleCount: totalRoleCount,
    };
  },
});

/**
 * Delete a test organization and all related data
 * This function will find and delete the test organization created by createTestOrganization
 */
export const deleteTestOrganization = internalMutation({
  args: {
    orgaId: v.optional(v.id("orgas")), // Optional: if not provided, finds by name prefix
  },
  returns: v.object({
    deleted: v.boolean(),
    orgaId: v.optional(v.id("orgas")),
    deletedCounts: v.object({
      members: v.number(),
      teams: v.number(),
      roles: v.number(),
      invitations: v.number(),
      decisions: v.number(),
      policies: v.number(),
      topics: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    let targetOrgaId: Id<"orgas"> | null = null;
    
    if (args.orgaId) {
      // Use provided orgaId
      const orga = await ctx.db.get(args.orgaId);
      if (!orga) {
        throw new Error("Organization not found");
      }
      if (!orga.name.startsWith(TEST_ORGA_NAME_PREFIX)) {
        throw new Error("This is not a test organization");
      }
      targetOrgaId = args.orgaId;
    } else {
      // Find test organization by name prefix
      // Query all orgas and filter by prefix (for test purposes, this is acceptable)
      const allOrgas = await ctx.db
        .query("orgas")
        .collect();
      
      const testOrga = allOrgas.find((orga) => orga.name.startsWith(TEST_ORGA_NAME_PREFIX));
      if (!testOrga) {
        return {
          deleted: false,
          orgaId: undefined,
          deletedCounts: {
            members: 0,
            teams: 0,
            roles: 0,
            invitations: 0,
            decisions: 0,
            policies: 0,
            topics: 0,
          },
        };
      }
      targetOrgaId = testOrga._id;
    }
    
    if (!targetOrgaId) {
      throw new Error("Could not determine test organization to delete");
    }
    
    const orga = await ctx.db.get(targetOrgaId);
    if (!orga) {
      throw new Error("Organization not found");
    }
    
    // Get all related entities
    const members = await ctx.db
      .query("members")
      .withIndex("by_orga", (q) => q.eq("orgaId", targetOrgaId))
      .collect();
    
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_orga", (q) => q.eq("orgaId", targetOrgaId))
      .collect();
    
    // Delete all roles and topics (need to query before deleting teams)
    let roleCount = 0;
    let topicCount = 0;
    for (const team of teams) {
      const roles = await ctx.db
        .query("roles")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();
      for (const role of roles) {
        await ctx.db.delete(role._id);
        roleCount++;
      }
      
      // Delete all topics for this team
      const topics = await ctx.db
        .query("topics")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();
      for (const topic of topics) {
        await ctx.db.delete(topic._id);
        topicCount++;
      }
    }
    
    // Delete all teams
    for (const team of teams) {
      await ctx.db.delete(team._id);
    }
    
    // Delete all invitations
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_orga", (q) => q.eq("orgaId", targetOrgaId))
      .collect();
    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }
    
    // Delete all decisions
    const decisions = await ctx.db
      .query("decisions")
      .withIndex("by_orga", (q) => q.eq("orgaId", targetOrgaId))
      .collect();
    for (const decision of decisions) {
      await ctx.db.delete(decision._id);
    }
    
    // Delete all policies
    const policies = await ctx.db
      .query("policies")
      .withIndex("by_orga", (q) => q.eq("orgaId", targetOrgaId))
      .collect();
    for (const policy of policies) {
      await ctx.db.delete(policy._id);
    }
    
    // Remove organization from all users' orgaIds and delete members
    for (const member of members) {
      const user = await ctx.db.get(member.personId);
      if (user) {
        await ctx.db.patch(member.personId, {
          orgaIds: user.orgaIds.filter((id) => id !== targetOrgaId),
        });
      }
      await ctx.db.delete(member._id);
    }
    
    // Delete the organization
    await ctx.db.delete(targetOrgaId);
    
    return {
      deleted: true,
      orgaId: targetOrgaId,
      deletedCounts: {
        members: members.length,
        teams: teams.length,
        roles: roleCount,
        invitations: invitations.length,
        decisions: decisions.length,
        policies: policies.length,
        topics: topicCount,
      },
    };
  },
});
