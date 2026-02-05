import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

const TEST_ORGA_NAME_PREFIX = "INFOMAX DEMO";

// Realistic organizational structure as a tree
// Each node has: name, childTeams, and roleTemplates for that team
interface TeamTemplate {
  name: string;
  children: TeamTemplate[];
  roles: RoleTemplate[];
}

interface RoleTemplate {
  title: string;
  mission: string;
  duties: string[];
}

// Define realistic role templates for each department type
const EXECUTIVE_ROLES: RoleTemplate[] = [
  { title: "Chief of Staff", mission: "Coordinate executive operations and strategic initiatives", duties: ["Manage executive calendar", "Coordinate cross-functional projects", "Prepare board materials"] },
  { title: "Executive Assistant", mission: "Provide high-level administrative support to executives", duties: ["Schedule management", "Travel coordination", "Meeting preparation"] },
  { title: "Strategy Analyst", mission: "Analyze market trends and support strategic decision-making", duties: ["Market research", "Competitive analysis", "Strategic recommendations"] },
];

const ENGINEERING_ROLES: RoleTemplate[] = [
  { title: "Software Engineer", mission: "Design and implement software solutions", duties: ["Write clean, maintainable code", "Participate in code reviews", "Debug and troubleshoot issues"] },
  { title: "Senior Software Engineer", mission: "Lead technical initiatives and mentor junior developers", duties: ["Architect solutions", "Mentor team members", "Drive technical excellence"] },
  { title: "Staff Engineer", mission: "Drive technical strategy across engineering teams", duties: ["Technical leadership", "Cross-team coordination", "Architecture decisions"] },
  { title: "Engineering Manager", mission: "Lead and grow engineering teams", duties: ["Team management", "Project planning", "Performance reviews"] },
  { title: "DevOps Engineer", mission: "Maintain and improve CI/CD infrastructure", duties: ["Pipeline maintenance", "Infrastructure automation", "Monitoring setup"] },
  { title: "QA Engineer", mission: "Ensure software quality through comprehensive testing", duties: ["Test planning", "Automated testing", "Bug reporting"] },
  { title: "Site Reliability Engineer", mission: "Ensure system reliability and performance", duties: ["Incident response", "Capacity planning", "Performance optimization"] },
  { title: "Technical Writer", mission: "Create and maintain technical documentation", duties: ["API documentation", "User guides", "Internal documentation"] },
];

const FRONTEND_ROLES: RoleTemplate[] = [
  { title: "Frontend Developer", mission: "Build responsive and accessible user interfaces", duties: ["Implement UI components", "Optimize performance", "Ensure accessibility"] },
  { title: "Senior Frontend Developer", mission: "Lead frontend architecture and best practices", duties: ["Architecture decisions", "Code review leadership", "Mentoring"] },
  { title: "UI Engineer", mission: "Create pixel-perfect implementations of designs", duties: ["Component development", "Design system maintenance", "Animation implementation"] },
  { title: "React Specialist", mission: "Drive React best practices and patterns", duties: ["React architecture", "State management", "Performance optimization"] },
];

const BACKEND_ROLES: RoleTemplate[] = [
  { title: "Backend Developer", mission: "Build scalable server-side applications", duties: ["API development", "Database optimization", "Service integration"] },
  { title: "Senior Backend Developer", mission: "Lead backend architecture and system design", duties: ["System design", "Technical leadership", "Performance tuning"] },
  { title: "API Developer", mission: "Design and implement RESTful and GraphQL APIs", duties: ["API design", "Documentation", "Versioning strategy"] },
  { title: "Database Engineer", mission: "Optimize database performance and architecture", duties: ["Query optimization", "Schema design", "Data migration"] },
];

const PLATFORM_ROLES: RoleTemplate[] = [
  { title: "Platform Engineer", mission: "Build and maintain internal developer platforms", duties: ["Platform development", "Developer tooling", "Documentation"] },
  { title: "Infrastructure Engineer", mission: "Manage cloud infrastructure and resources", duties: ["Cloud management", "Cost optimization", "Security compliance"] },
  { title: "Cloud Architect", mission: "Design scalable cloud solutions", duties: ["Architecture design", "Cloud migration", "Best practices"] },
];

const PRODUCT_ROLES: RoleTemplate[] = [
  { title: "Product Manager", mission: "Define product strategy and roadmap", duties: ["Roadmap planning", "Stakeholder management", "Feature prioritization"] },
  { title: "Senior Product Manager", mission: "Lead product initiatives and cross-functional teams", duties: ["Strategic planning", "Team leadership", "Market analysis"] },
  { title: "Product Analyst", mission: "Analyze product metrics and user behavior", duties: ["Data analysis", "User research insights", "A/B test analysis"] },
  { title: "Technical Product Manager", mission: "Bridge technical and product requirements", duties: ["Technical specifications", "API product management", "Developer experience"] },
  { title: "Product Owner", mission: "Manage product backlog and sprint priorities", duties: ["Backlog management", "Sprint planning", "Stakeholder communication"] },
];

const DESIGN_ROLES: RoleTemplate[] = [
  { title: "UX Designer", mission: "Create intuitive user experiences", duties: ["User research", "Wireframing", "Usability testing"] },
  { title: "Senior UX Designer", mission: "Lead UX strategy and design systems", duties: ["Design system leadership", "UX strategy", "Mentoring"] },
  { title: "UI Designer", mission: "Create visually appealing interfaces", duties: ["Visual design", "Icon design", "Brand consistency"] },
  { title: "Product Designer", mission: "End-to-end product design from concept to launch", duties: ["Product design", "Prototyping", "Design handoff"] },
  { title: "UX Researcher", mission: "Conduct user research and synthesize insights", duties: ["User interviews", "Usability studies", "Research synthesis"] },
  { title: "Design Systems Lead", mission: "Maintain and evolve the design system", duties: ["Component library", "Design tokens", "Documentation"] },
];

const MARKETING_ROLES: RoleTemplate[] = [
  { title: "Marketing Manager", mission: "Lead marketing campaigns and brand strategy", duties: ["Campaign management", "Brand strategy", "Budget management"] },
  { title: "Content Marketing Specialist", mission: "Create compelling content that drives engagement", duties: ["Content creation", "SEO optimization", "Editorial calendar"] },
  { title: "Digital Marketing Specialist", mission: "Manage digital advertising and campaigns", duties: ["PPC campaigns", "Social media ads", "Analytics reporting"] },
  { title: "Brand Manager", mission: "Maintain and evolve brand identity", duties: ["Brand guidelines", "Creative direction", "Brand partnerships"] },
  { title: "Marketing Analyst", mission: "Analyze marketing performance and ROI", duties: ["Campaign analytics", "Attribution modeling", "Report generation"] },
  { title: "SEO Specialist", mission: "Optimize organic search visibility", duties: ["Keyword research", "Technical SEO", "Link building strategy"] },
];

const GROWTH_ROLES: RoleTemplate[] = [
  { title: "Growth Manager", mission: "Drive user acquisition and retention", duties: ["Growth experiments", "Funnel optimization", "Retention strategies"] },
  { title: "Growth Analyst", mission: "Analyze growth metrics and identify opportunities", duties: ["Data analysis", "Experimentation design", "Reporting"] },
  { title: "Growth Engineer", mission: "Build tools and features to accelerate growth", duties: ["A/B testing infrastructure", "Analytics implementation", "Growth features"] },
];

const COMMUNICATIONS_ROLES: RoleTemplate[] = [
  { title: "Communications Manager", mission: "Manage external and internal communications", duties: ["Press relations", "Internal communications", "Crisis management"] },
  { title: "PR Specialist", mission: "Build media relationships and manage press coverage", duties: ["Media outreach", "Press releases", "Event coordination"] },
  { title: "Social Media Manager", mission: "Manage social media presence and engagement", duties: ["Content scheduling", "Community engagement", "Social analytics"] },
];

const SALES_ROLES: RoleTemplate[] = [
  { title: "Sales Manager", mission: "Lead sales team and drive revenue growth", duties: ["Team leadership", "Pipeline management", "Sales strategy"] },
  { title: "Account Executive", mission: "Close deals and manage client relationships", duties: ["Prospecting", "Negotiations", "Contract management"] },
  { title: "Sales Development Representative", mission: "Generate and qualify sales leads", duties: ["Lead generation", "Cold outreach", "Lead qualification"] },
  { title: "Enterprise Account Manager", mission: "Manage strategic enterprise accounts", duties: ["Account strategy", "Relationship management", "Upselling"] },
  { title: "Sales Engineer", mission: "Provide technical expertise during sales process", duties: ["Product demos", "Technical consultation", "Proof of concepts"] },
  { title: "Sales Operations Analyst", mission: "Optimize sales processes and tools", duties: ["CRM management", "Sales analytics", "Process improvement"] },
];

const CUSTOMER_SUCCESS_ROLES: RoleTemplate[] = [
  { title: "Customer Success Manager", mission: "Ensure customer satisfaction and retention", duties: ["Onboarding", "Health monitoring", "Renewal management"] },
  { title: "Senior Customer Success Manager", mission: "Lead strategic customer relationships", duties: ["Strategic accounts", "Escalation management", "Best practices"] },
  { title: "Customer Support Specialist", mission: "Resolve customer issues and inquiries", duties: ["Ticket resolution", "Product guidance", "Documentation"] },
  { title: "Technical Support Engineer", mission: "Provide technical troubleshooting support", duties: ["Technical debugging", "Issue escalation", "Knowledge base"] },
  { title: "Implementation Specialist", mission: "Guide customers through product implementation", duties: ["Implementation planning", "Configuration", "Training"] },
];

const FINANCE_ROLES: RoleTemplate[] = [
  { title: "Financial Analyst", mission: "Analyze financial performance and forecasts", duties: ["Financial modeling", "Variance analysis", "Budget forecasting"] },
  { title: "Senior Financial Analyst", mission: "Lead financial planning and strategic analysis", duties: ["Strategic planning", "Investment analysis", "Board reporting"] },
  { title: "Accountant", mission: "Manage accounting operations and compliance", duties: ["Bookkeeping", "Reconciliation", "Compliance"] },
  { title: "Controller", mission: "Oversee accounting operations and financial controls", duties: ["Financial controls", "Audit management", "Policy compliance"] },
  { title: "Treasury Analyst", mission: "Manage cash flow and banking relationships", duties: ["Cash management", "Banking relationships", "Liquidity planning"] },
];

const HR_ROLES: RoleTemplate[] = [
  { title: "HR Manager", mission: "Lead human resources operations and strategy", duties: ["HR policy", "Employee relations", "Compliance"] },
  { title: "Recruiter", mission: "Attract and hire top talent", duties: ["Sourcing", "Interviewing", "Offer management"] },
  { title: "Senior Recruiter", mission: "Lead recruiting strategy and mentor team", duties: ["Recruiting strategy", "Employer branding", "Team mentorship"] },
  { title: "HR Business Partner", mission: "Support business units with HR expertise", duties: ["Performance management", "Organizational development", "Employee engagement"] },
  { title: "Compensation Analyst", mission: "Design and analyze compensation programs", duties: ["Market analysis", "Pay equity", "Benefits administration"] },
  { title: "Learning & Development Specialist", mission: "Create training and development programs", duties: ["Training design", "Program delivery", "Impact measurement"] },
];

const LEGAL_ROLES: RoleTemplate[] = [
  { title: "Legal Counsel", mission: "Provide legal guidance and contract support", duties: ["Contract review", "Legal advice", "Compliance guidance"] },
  { title: "Senior Legal Counsel", mission: "Lead legal strategy and complex matters", duties: ["Strategic legal advice", "Litigation management", "Policy development"] },
  { title: "Paralegal", mission: "Support legal team with research and documentation", duties: ["Legal research", "Document preparation", "File management"] },
  { title: "Compliance Officer", mission: "Ensure regulatory compliance across the organization", duties: ["Compliance monitoring", "Policy development", "Risk assessment"] },
];

const DATA_ROLES: RoleTemplate[] = [
  { title: "Data Analyst", mission: "Analyze data to drive business decisions", duties: ["Data analysis", "Dashboard creation", "Stakeholder reporting"] },
  { title: "Senior Data Analyst", mission: "Lead analytics initiatives and mentor analysts", duties: ["Analytics strategy", "Complex analysis", "Team mentorship"] },
  { title: "Data Scientist", mission: "Build predictive models and extract insights", duties: ["Model development", "Statistical analysis", "Experimentation"] },
  { title: "Data Engineer", mission: "Build and maintain data infrastructure", duties: ["ETL pipelines", "Data warehousing", "Data quality"] },
  { title: "Machine Learning Engineer", mission: "Deploy and optimize ML models in production", duties: ["Model deployment", "MLOps", "Performance monitoring"] },
  { title: "Analytics Engineer", mission: "Build data models and transform raw data", duties: ["Data modeling", "SQL development", "Documentation"] },
];

const SECURITY_ROLES: RoleTemplate[] = [
  { title: "Security Engineer", mission: "Implement and maintain security controls", duties: ["Security implementation", "Vulnerability management", "Incident response"] },
  { title: "Security Analyst", mission: "Monitor and analyze security threats", duties: ["Threat monitoring", "Security assessments", "Compliance audits"] },
  { title: "Application Security Engineer", mission: "Secure applications throughout the SDLC", duties: ["Code review", "Security testing", "Developer training"] },
];

const IT_ROLES: RoleTemplate[] = [
  { title: "IT Manager", mission: "Lead IT operations and infrastructure", duties: ["IT strategy", "Vendor management", "Team leadership"] },
  { title: "Systems Administrator", mission: "Manage and maintain IT systems", duties: ["System maintenance", "User support", "Security patches"] },
  { title: "IT Support Specialist", mission: "Provide technical support to employees", duties: ["Helpdesk support", "Equipment setup", "Troubleshooting"] },
  { title: "Network Administrator", mission: "Manage network infrastructure and security", duties: ["Network management", "Firewall configuration", "VPN management"] },
];

const OPERATIONS_ROLES: RoleTemplate[] = [
  { title: "Operations Manager", mission: "Oversee daily operations and process efficiency", duties: ["Process management", "Resource allocation", "Performance monitoring"] },
  { title: "Project Manager", mission: "Lead project planning and execution", duties: ["Project planning", "Stakeholder management", "Risk mitigation"] },
  { title: "Business Analyst", mission: "Analyze business requirements and processes", duties: ["Requirements gathering", "Process analysis", "Solution design"] },
  { title: "Program Manager", mission: "Coordinate multiple related projects", duties: ["Program coordination", "Strategic alignment", "Cross-project dependencies"] },
];

// Build the organizational tree structure
const ORGANIZATION_TREE: TeamTemplate = {
  name: "Core Team",
  roles: EXECUTIVE_ROLES,
  children: [
    {
      name: "Engineering",
      roles: ENGINEERING_ROLES.slice(0, 4),
      children: [
        {
          name: "Frontend Engineering",
          roles: FRONTEND_ROLES,
          children: [],
        },
        {
          name: "Backend Engineering",
          roles: BACKEND_ROLES,
          children: [],
        },
        {
          name: "Platform & Infrastructure",
          roles: PLATFORM_ROLES,
          children: [
            {
              name: "DevOps",
              roles: [ENGINEERING_ROLES[4], ENGINEERING_ROLES[6]], // DevOps Engineer, SRE
              children: [],
            },
            {
              name: "Security Engineering",
              roles: SECURITY_ROLES,
              children: [],
            },
          ],
        },
        {
          name: "Quality Assurance",
          roles: [ENGINEERING_ROLES[5], ENGINEERING_ROLES[7]], // QA Engineer, Technical Writer
          children: [],
        },
      ],
    },
    {
      name: "Product",
      roles: PRODUCT_ROLES,
      children: [
        {
          name: "Design",
          roles: DESIGN_ROLES,
          children: [],
        },
        {
          name: "Data & Analytics",
          roles: DATA_ROLES,
          children: [],
        },
      ],
    },
    {
      name: "Marketing",
      roles: MARKETING_ROLES.slice(0, 3),
      children: [
        {
          name: "Growth",
          roles: GROWTH_ROLES,
          children: [],
        },
        {
          name: "Content & Brand",
          roles: [MARKETING_ROLES[3], MARKETING_ROLES[4], MARKETING_ROLES[5]],
          children: [],
        },
        {
          name: "Communications",
          roles: COMMUNICATIONS_ROLES,
          children: [],
        },
      ],
    },
    {
      name: "Sales",
      roles: SALES_ROLES.slice(0, 3),
      children: [
        {
          name: "Enterprise Sales",
          roles: [SALES_ROLES[3], SALES_ROLES[4]],
          children: [],
        },
        {
          name: "Sales Operations",
          roles: [SALES_ROLES[5]],
          children: [],
        },
        {
          name: "Customer Success",
          roles: CUSTOMER_SUCCESS_ROLES,
          children: [],
        },
      ],
    },
    {
      name: "Finance",
      roles: FINANCE_ROLES,
      children: [
        {
          name: "Legal",
          roles: LEGAL_ROLES,
          children: [],
        },
      ],
    },
    {
      name: "People Operations",
      roles: HR_ROLES,
      children: [
        {
          name: "Talent Acquisition",
          roles: [HR_ROLES[1], HR_ROLES[2]],
          children: [],
        },
      ],
    },
    {
      name: "Operations",
      roles: OPERATIONS_ROLES,
      children: [
        {
          name: "IT",
          roles: IT_ROLES,
          children: [],
        },
      ],
    },
  ],
};

// Helper to count total teams in tree (useful for debugging/validation)
function _countTeamsInTree(template: TeamTemplate): number {
  let count = 1;
  for (const child of template.children) {
    count += _countTeamsInTree(child);
  }
  return count;
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
        primary: { r: 100, g: 150, b: 200 },
        secondary: { r: 200, g: 150, b: 100 },
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
      });
      totalRoleCount++;
      await assignRoleToMember(leaderMemberId, leaderRoleId);

      // Create Secretary role
      const secretaryMemberId = getRandomMember();
      const secretaryRoleId = await ctx.db.insert("roles", {
        orgaId,
        teamId,
        title: "Secretary",
        roleType: "secretary",
        mission: `Coordinate administrative functions for ${template.name}`,
        duties: ["Meeting coordination", "Documentation", "Communication management"],
        memberId: secretaryMemberId,
      });
      totalRoleCount++;
      await assignRoleToMember(secretaryMemberId, secretaryRoleId);

      // Create Referee role
      const refereeMemberId = getRandomMember();
      const refereeRoleId = await ctx.db.insert("roles", {
        orgaId,
        teamId,
        title: "Referee",
        roleType: "referee",
        mission: `Ensure fair processes and resolve conflicts within ${template.name}`,
        duties: ["Process facilitation", "Conflict resolution", "Decision support"],
        memberId: refereeMemberId,
      });
      totalRoleCount++;
      await assignRoleToMember(refereeMemberId, refereeRoleId);

      // Create additional roles from the template (select 2-5 roles randomly)
      const selectedRoles = getRandomRoles(template.roles, 2, 5);
      for (const roleTemplate of selectedRoles) {
        const roleMemberId = getRandomMember();
        const roleId = await ctx.db.insert("roles", {
          orgaId,
          teamId,
          title: roleTemplate.title,
          mission: roleTemplate.mission,
          duties: roleTemplate.duties,
          memberId: roleMemberId,
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
