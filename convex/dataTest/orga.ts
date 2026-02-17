import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  RoleTemplate,
  TeamTemplate,
  EXECUTIVE_ROLES,
  ENGINEERING_ROLES,
  FRONTEND_ROLES,
  BACKEND_ROLES,
  PLATFORM_ROLES,
  PRODUCT_ROLES,
  DESIGN_ROLES,
  MARKETING_ROLES,
  GROWTH_ROLES,
  COMMUNICATIONS_ROLES,
  SALES_ROLES,
  CUSTOMER_SUCCESS_ROLES,
  FINANCE_ROLES,
  HR_ROLES,
  LEGAL_ROLES,
  DATA_ROLES,
  SECURITY_ROLES,
  IT_ROLES,
  OPERATIONS_ROLES,
  ORGANIZATION_TREE,
} from "./demoOrgaConfig";
import { getDefaultIconKey } from "../roles/iconDefaults";

const TEST_ORGA_NAME_PREFIX = "INFOMAX DEMO";

// Icon keys suitable for random assignment to regular roles (no roleType)
const RANDOM_ICON_KEYS = [
  "rond", "cross", "square", "diamond", "diamondcurve", "morningstar",
  "heightstar", "triangle", "starship", "chevron", "tranchoir", "moon",
  "octogon", "diamondband", "diamondstar", "blur", "tunnel", "clouds",
  "round", "sphere", "world", "spiral", "star", "sun", "pyramid",
  "heart", "moon2", "brightness", "allergen", "3d",
];

function getRandomIconKey(): string {
  return RANDOM_ICON_KEYS[Math.floor(Math.random() * RANDOM_ICON_KEYS.length)];
}

// Helper to get a random subset of roles
function getRandomRoles(roles: RoleTemplate[], minCount: number, maxCount: number): RoleTemplate[] {
  const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
  const shuffled = [...roles].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, roles.length));
}

/**
 * Create a test organization with:
 * - 81-121 members (1 admin + 80-120 test users from createTestUsers)
 * - 20-30 teams organized in a realistic tree hierarchy
 * - Each member holds 1-5 roles across the teams
 * - Realistic team names (Engineering, Marketing, Product, etc.)
 * - Diverse role titles (Software Engineer, Product Manager, UX Designer, etc.)
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

    // Create the test organization
    const timestamp = Date.now();
    const testOrgaName = `${TEST_ORGA_NAME_PREFIX}${timestamp}`;

    // Create the organization
    const orgaId = await ctx.db.insert("orgas", {
      name: testOrgaName,
      logoUrl: undefined,
      colorScheme: {
        primary: "#6496c8",
        secondary: "#c89664",
      },
      owner: user._id,
    });

    // Create member document for the admin user
    const adminMemberId = await ctx.db.insert("members", {
      orgaId: orgaId,
      personId: user._id,
      firstname: user.firstname,
      surname: user.surname,
      email: user.email,
      pictureURL: user.pictureURL,
      contactInfos: user.contactInfos,
      roleIds: [], // Will be populated after roles are created
    });

    // Create test users
    const { userIds: testUserIds } = await ctx.runMutation(
      internal.dataTest.users.createTestUsers,
      {}
    );

    // Create members for all test users
    const memberIds: Id<"members">[] = [adminMemberId];

    for (const testUserId of testUserIds) {
      const testUser = await ctx.db.get(testUserId);
      if (!testUser) {
        throw new Error(`Test user ${testUserId} not found`);
      }

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

    // Add organization to admin user's orgaIds
    await ctx.db.patch(user._id, {
      orgaIds: [...user.orgaIds, orgaId],
    });

    // Track all teams and roles created
    const teamIds: Id<"teams">[] = [];
    let totalRoleCount = 0;

    // Helper to get a random member
    const getRandomMember = (): Id<"members"> => {
      return memberIds[Math.floor(Math.random() * memberIds.length)];
    };

    // Helper to assign role to member and track it
    const assignRoleToMember = async (memberId: Id<"members">, roleId: Id<"roles">) => {
      const member = await ctx.db.get(memberId);
      if (member) {
        await ctx.db.patch(memberId, {
          roleIds: [...member.roleIds, roleId],
        });
      }
    };

    // Recursive function to create teams from the template tree
    // Returns both the team ID and the source role ID (the role in parent team representing this team)
    const createTeamFromTemplate = async (
      template: TeamTemplate,
      parentTeamId: Id<"teams"> | undefined
    ): Promise<{ teamId: Id<"teams">; sourceRoleId: Id<"roles"> | undefined }> => {
      // Create the team
      const teamId = await ctx.db.insert("teams", {
        orgaId,
        name: template.name,
      });
      teamIds.push(teamId);

      // Determine leader info
      const leaderMemberId = parentTeamId === undefined ? adminMemberId : getRandomMember();
      const leaderTitle = parentTeamId === undefined ? "Chief Executive Officer" : template.name;
      const leaderMission = parentTeamId === undefined
        ? "Lead the organization and set strategic direction"
        : `Lead the ${template.name} team and drive departmental excellence`;
      const leaderDuties = parentTeamId === undefined
        ? ["Set company vision", "Lead executive team", "Stakeholder management"]
        : [`Manage ${template.name} operations`, "Team leadership", "Strategic planning"];

      // For non-root teams, first create the SOURCE role in the PARENT team
      // This represents the child team in the parent team (double role pattern)
      let sourceRoleId: Id<"roles"> | undefined = undefined;
      if (parentTeamId !== undefined) {
        sourceRoleId = await ctx.db.insert("roles", {
          orgaId,
          teamId: parentTeamId, // Source role belongs to the PARENT team
          title: leaderTitle,
          mission: leaderMission,
          duties: leaderDuties,
          memberId: leaderMemberId,
          iconKey: getRandomIconKey(),
          // No roleType - this is a regular role representing the child team
        });
        totalRoleCount++;
        await assignRoleToMember(leaderMemberId, sourceRoleId);
      }

      // Create Leader role in the child team
      // For root team: no parentTeamId, no linkedRoleId
      // For non-root teams: set parentTeamId and linkedRoleId to establish the double role pattern
      const leaderRoleId = await ctx.db.insert("roles", {
        orgaId,
        teamId,
        parentTeamId,
        linkedRoleId: sourceRoleId, // Link to the source role in parent team
        title: leaderTitle,
        roleType: "leader",
        mission: leaderMission,
        duties: leaderDuties,
        memberId: leaderMemberId,
        iconKey: getDefaultIconKey("leader"),
      });
      totalRoleCount++;
      await assignRoleToMember(leaderMemberId, leaderRoleId);

      // Create Secretary role - must be a different member than Leader
      let secretaryMemberId = getRandomMember();
      while (secretaryMemberId === leaderMemberId && memberIds.length > 1) {
        secretaryMemberId = getRandomMember();
      }
      const secretaryRoleId = await ctx.db.insert("roles", {
        orgaId,
        teamId,
        title: "Secretary",
        roleType: "secretary",
        mission: `Coordinate administrative functions for ${template.name}`,
        duties: ["Meeting coordination", "Documentation", "Communication management"],
        memberId: secretaryMemberId,
        iconKey: getDefaultIconKey("secretary"),
      });
      totalRoleCount++;
      await assignRoleToMember(secretaryMemberId, secretaryRoleId);

      // Create Referee role - must be a different member than Leader and Secretary
      let refereeMemberId = getRandomMember();
      while ((refereeMemberId === leaderMemberId || refereeMemberId === secretaryMemberId) && memberIds.length > 2) {
        refereeMemberId = getRandomMember();
      }
      const refereeRoleId = await ctx.db.insert("roles", {
        orgaId,
        teamId,
        title: "Referee",
        roleType: "referee",
        mission: `Ensure fair processes and resolve conflicts within ${template.name}`,
        duties: ["Process facilitation", "Conflict resolution", "Decision support"],
        memberId: refereeMemberId,
        iconKey: getDefaultIconKey("referee"),
      });
      totalRoleCount++;
      await assignRoleToMember(refereeMemberId, refereeRoleId);

      // Create additional roles from the template (select 2-5 roles randomly)
      const selectedRoles = getRandomRoles(template.roles, 2, 5);

      // Track which members holding special roles might get additional roles in this team
      // Each special role holder has a 50% chance to get an additional role
      const specialMembersForAdditionalRoles: Id<"members">[] = [];
      if (Math.random() < 0.5) specialMembersForAdditionalRoles.push(leaderMemberId);
      if (Math.random() < 0.5) specialMembersForAdditionalRoles.push(secretaryMemberId);
      if (Math.random() < 0.5) specialMembersForAdditionalRoles.push(refereeMemberId);

      // Create a pool of role templates for assignment
      let roleIndex = 0;

      // First, assign additional roles to special members who were selected (50% chance each)
      for (const specialMemberId of specialMembersForAdditionalRoles) {
        if (roleIndex < selectedRoles.length) {
          const roleTemplate = selectedRoles[roleIndex];
          roleIndex++;

          const roleId = await ctx.db.insert("roles", {
            orgaId,
            teamId,
            title: roleTemplate.title,
            mission: roleTemplate.mission,
            duties: roleTemplate.duties,
            memberId: specialMemberId,
            iconKey: getRandomIconKey(),
          });
          totalRoleCount++;
          await assignRoleToMember(specialMemberId, roleId);
        }
      }

      // Then assign remaining roles to random members
      for (; roleIndex < selectedRoles.length; roleIndex++) {
        const roleTemplate = selectedRoles[roleIndex];
        const roleMemberId = getRandomMember();
        const roleId = await ctx.db.insert("roles", {
          orgaId,
          teamId,
          title: roleTemplate.title,
          mission: roleTemplate.mission,
          duties: roleTemplate.duties,
          memberId: roleMemberId,
          iconKey: getRandomIconKey(),
        });
        totalRoleCount++;
        await assignRoleToMember(roleMemberId, roleId);
      }

      // Recursively create child teams
      for (const childTemplate of template.children) {
        await createTeamFromTemplate(childTemplate, teamId);
      }

      return { teamId, sourceRoleId };
    };

    // Create the entire organization tree structure
    await createTeamFromTemplate(ORGANIZATION_TREE, undefined);

    // Ensure each member has at least 1 role and at most 5 roles
    // First, identify members with no roles
    for (const memberId of memberIds) {
      const member = await ctx.db.get(memberId);
      if (!member) continue;

      const currentRoleCount = member.roleIds.length;

      // If member has no roles, assign 1-3 roles
      if (currentRoleCount === 0) {
        const numRolesToAssign = 1 + Math.floor(Math.random() * 3);
        const selectedTeamIndices = new Set<number>();

        while (selectedTeamIndices.size < numRolesToAssign && selectedTeamIndices.size < teamIds.length) {
          selectedTeamIndices.add(Math.floor(Math.random() * teamIds.length));
        }

        // Collect all available role templates for random assignment
        const allRoleTemplates: RoleTemplate[] = [
          ...ENGINEERING_ROLES, ...FRONTEND_ROLES, ...BACKEND_ROLES, ...PLATFORM_ROLES,
          ...PRODUCT_ROLES, ...DESIGN_ROLES, ...MARKETING_ROLES, ...GROWTH_ROLES,
          ...COMMUNICATIONS_ROLES, ...SALES_ROLES, ...CUSTOMER_SUCCESS_ROLES,
          ...FINANCE_ROLES, ...HR_ROLES, ...LEGAL_ROLES, ...DATA_ROLES,
          ...SECURITY_ROLES, ...IT_ROLES, ...OPERATIONS_ROLES, ...EXECUTIVE_ROLES,
        ];

        const memberRoleIds: Id<"roles">[] = [];
        for (const teamIndex of selectedTeamIndices) {
          const teamId = teamIds[teamIndex];
          const randomTemplate = allRoleTemplates[Math.floor(Math.random() * allRoleTemplates.length)];

          const roleId = await ctx.db.insert("roles", {
            orgaId,
            teamId,
            title: randomTemplate.title,
            mission: randomTemplate.mission,
            duties: randomTemplate.duties,
            memberId,
            iconKey: getRandomIconKey(),
          });

          memberRoleIds.push(roleId);
          totalRoleCount++;
        }

        await ctx.db.patch(memberId, {
          roleIds: memberRoleIds,
        });
      }
      // If member has fewer than target roles (1-5), optionally add more
      else if (currentRoleCount < 3 && Math.random() > 0.5) {
        const numRolesToAdd = 1 + Math.floor(Math.random() * 2);
        const selectedTeamIndices = new Set<number>();

        while (selectedTeamIndices.size < numRolesToAdd && selectedTeamIndices.size < teamIds.length) {
          selectedTeamIndices.add(Math.floor(Math.random() * teamIds.length));
        }

        const allRoleTemplates: RoleTemplate[] = [
          ...ENGINEERING_ROLES, ...FRONTEND_ROLES, ...BACKEND_ROLES, ...PLATFORM_ROLES,
          ...PRODUCT_ROLES, ...DESIGN_ROLES, ...MARKETING_ROLES, ...GROWTH_ROLES,
          ...COMMUNICATIONS_ROLES, ...SALES_ROLES, ...CUSTOMER_SUCCESS_ROLES,
          ...FINANCE_ROLES, ...HR_ROLES, ...LEGAL_ROLES, ...DATA_ROLES,
          ...SECURITY_ROLES, ...IT_ROLES, ...OPERATIONS_ROLES, ...EXECUTIVE_ROLES,
        ];

        const newRoleIds: Id<"roles">[] = [];
        for (const teamIndex of selectedTeamIndices) {
          const teamId = teamIds[teamIndex];
          const randomTemplate = allRoleTemplates[Math.floor(Math.random() * allRoleTemplates.length)];

          const roleId = await ctx.db.insert("roles", {
            orgaId,
            teamId,
            title: randomTemplate.title,
            mission: randomTemplate.mission,
            duties: randomTemplate.duties,
            memberId,
            iconKey: getRandomIconKey(),
          });

          newRoleIds.push(roleId);
          totalRoleCount++;
        }

        await ctx.db.patch(memberId, {
          roleIds: [...member.roleIds, ...newRoleIds],
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
      storageFiles: v.number(),
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
            storageFiles: 0,
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
    
    // Delete avatar files from Convex storage
    let storageFileCount = 0;
    for (const member of members) {
      if (member.pictureURL) {
        // Extract storage ID from URL (format: https://xxx.convex.cloud/api/storage/{storageId})
        const match = member.pictureURL.match(/\/api\/storage\/([a-f0-9-]+)$/);
        if (match) {
          const storageId = match[1] as Id<"_storage">;
          try {
            await ctx.storage.delete(storageId);
            storageFileCount++;
          } catch (error) {
            // Storage file may already be deleted or URL is from external source
            console.warn(`Failed to delete storage file for member ${member._id}:`, error);
          }
        }
      }
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
        storageFiles: storageFileCount,
      },
    };
  },
});

/**
 * Create a test organization with avatars stored in Convex storage.
 * This action wraps createTestOrganization and then populates avatars.
 */
export const createTestOrganizationWithAvatars = internalAction({
  args: {},
  returns: v.object({
    orgaId: v.id("orgas"),
    memberCount: v.number(),
    teamCount: v.number(),
    roleCount: v.number(),
    avatarsPopulated: v.number(),
    avatarsFailed: v.number(),
  }),
  handler: async (ctx): Promise<{
    orgaId: Id<"orgas">;
    memberCount: number;
    teamCount: number;
    roleCount: number;
    avatarsPopulated: number;
    avatarsFailed: number;
  }> => {
    // First, create the organization
    const result = await ctx.runMutation(internal.dataTest.orga.createTestOrganization, {});

    // Then, populate avatars
    const avatarResult = await ctx.runAction(internal.dataTest.users.populateMemberAvatarsInternal, {
      orgaId: result.orgaId,
    });

    return {
      ...result,
      avatarsPopulated: avatarResult.updatedCount,
      avatarsFailed: avatarResult.failedCount,
    };
  },
});
