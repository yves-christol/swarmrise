import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";

const TEST_ORGA_NAME_PREFIX = "TEST_DATA_MODEL_";

/**
 * Create a test organization with:
 * - 81-121 members (1 admin + 80-120 test users from createTestUsers)
 * - 20-30 teams
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
    
    // Generate random number of teams between 20 and 30
    const teamCount = 20 + Math.floor(Math.random() * 11); // 20-30 inclusive
    
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
    
    // Create member document for the first user (with temporary orgaId)
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
    
    // Create the first team
    const firstTeamId = await ctx.db.insert("teams", {
      orgaId,
      name: `${testOrgaName} - First Team`,
      parentTeamId: undefined,
      mission: "Test organization first team",
      isFirstTeam: true,
    });
    
    // Create the three initial roles for the first team
    const leaderRoleId = await ctx.db.insert("roles", {
      orgaId,
      teamId: firstTeamId,
      title: "Leader",
      mission: "Test Leader mission",
      duties: ["Test Leader duty 1", "Test Leader duty 2"],
      memberId,
    });
    
    const secretaryRoleId = await ctx.db.insert("roles", {
      orgaId,
      teamId: firstTeamId,
      title: "Secretary",
      mission: "Test Secretary mission",
      duties: ["Test Secretary duty 1"],
      memberId,
    });
    
    const refereeRoleId = await ctx.db.insert("roles", {
      orgaId,
      teamId: firstTeamId,
      title: "Referee",
      mission: "Test Referee mission",
      duties: ["Test Referee duty 1"],
      memberId,
    });
    
    // Update member with initial role IDs
    await ctx.db.patch(memberId, {
      roleIds: [leaderRoleId, secretaryRoleId, refereeRoleId],
    });
    
    // Add organization to user's orgaIds
    await ctx.db.patch(user._id, {
      orgaIds: [...user.orgaIds, orgaId],
    });
    
    // Create additional teams (19-29 more teams, since we already have the first team)
    const teamIds: Id<"teams">[] = [firstTeamId];
    for (let i = 1; i < teamCount; i++) {
      const teamId = await ctx.db.insert("teams", {
        orgaId,
        name: `${testOrgaName} - Team ${i + 1}`,
        parentTeamId: undefined, // All teams are top-level for simplicity
        mission: `Test team ${i + 1} mission`,
        isFirstTeam: false,
      });
      teamIds.push(teamId);
    }
    
    // Create test users using createTestUsers function
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
      
      // Create member for this user
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
      
      // Add organization to user's orgaIds if not already present
      if (!testUser.orgaIds.includes(orgaId)) {
        await ctx.db.patch(testUser._id, {
          orgaIds: [...testUser.orgaIds, orgaId],
        });
      }
    }
    
    // Assign roles to members: each member gets 1-5 roles randomly across teams
    let totalRoleCount = 3; // We already created 3 roles (Leader, Secretary, Referee)
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
    
    for (const memberIdToAssign of memberIds) {
      // Random number of roles for this member (1-5)
      const numRoles = 1 + Math.floor(Math.random() * 5);
      
      // Randomly select teams for this member's roles
      const selectedTeams = new Set<Id<"teams">>();
      while (selectedTeams.size < numRoles && selectedTeams.size < teamIds.length) {
        const randomTeamIndex = Math.floor(Math.random() * teamIds.length);
        selectedTeams.add(teamIds[randomTeamIndex]);
      }
      
      // Create roles for this member
      const memberRoleIds: Id<"roles">[] = [];
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
      
      // Update member with role IDs
      const member = await ctx.db.get(memberIdToAssign);
      if (member) {
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

