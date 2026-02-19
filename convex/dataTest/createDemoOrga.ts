/**
 * createDemoOrga - Nightly sandbox reset for the "Infomax Demo" organization
 *
 * This module provides:
 *  1. deleteDemoOrga   - Finds the demo orga by name and deletes it with ALL dependencies
 *  2. seedDemoOrga     - Creates a fresh demo orga from the JSON-like config
 *  2b. seedKanbanData  - Populates Kanban boards, labels, cards, and comments for every team
 *  3. uploadDemoLogo   - Uploads the Infomax logo to Convex storage and updates the orga
 *  4. resetDemoOrga    - Orchestrating action: delete then create (called by the cron)
 *
 * Deletion order (respects referential dependencies):
 *   kanban (comments -> attachments -> cards -> labels -> columns -> boards) ->
 *   topics -> policies -> decisions -> invitations -> notifications ->
 *   notificationPreferences -> roles -> members (+ patch users) -> teams -> orga ->
 *   orphaned test users
 */
import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { DEMO_ORGA_CONFIG, TeamTemplate, RoleTemplate } from "./demoOrgaConfig";
import { getDefaultIconKey } from "../roles/iconDefaults";
import { ALL_ICON_KEYS } from "../roles/iconKeys";
import { DEFAULT_COLUMNS } from "../kanban";

// Email domain used for all synthetic demo users
const DEMO_EMAIL_DOMAIN = "@demo-infomax.test";

function getRandomIconKey(): string {
  return ALL_ICON_KEYS[Math.floor(Math.random() * ALL_ICON_KEYS.length)];
}

// ---------------------------------------------------------------------------
// Name pools for generating realistic fake users
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
  "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
  "Timothy", "Deborah", "Ronald", "Stephanie", "Jason", "Rebecca", "Edward", "Sharon",
  "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
  "Nicholas", "Angela", "Eric", "Shirley", "Jonathan", "Anna", "Stephen", "Brenda",
  "Larry", "Pamela", "Justin", "Emma", "Scott", "Nicole", "Brandon", "Helen",
  "Benjamin", "Samantha", "Samuel", "Katherine", "Frank", "Debra", "Gregory", "Rachel",
  "Raymond", "Carolyn", "Alexander", "Janet", "Patrick", "Virginia", "Jack", "Maria",
];

const SURNAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor",
  "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Sanchez",
  "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
  "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams",
  "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
  "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards",
  "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers",
  "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey", "Reed", "Kelly",
  "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson", "Watson", "Brooks",
  "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes",
  "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross",
  "Foster", "Jimenez", "Powell", "Jenkins", "Perry", "Russell", "Sullivan", "Bell",
];

const PHONE_PREFIXES = [
  "+1 (555)", "+1 (212)", "+1 (310)", "+1 (415)", "+1 (617)",
  "+44 20", "+44 161", "+33 1", "+33 6", "+49 30",
];

// ---------------------------------------------------------------------------
// Helpers for synthetic data
// ---------------------------------------------------------------------------

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1: number, g1: number, b1: number;
  if (h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`.toUpperCase();
}

function generateTeamColor(hue: number): string {
  // Use saturation 65% and lightness 42% (within the 25-75% L and >= 30% S bounds)
  return hslToHex(hue, 0.65, 0.42);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  const prefix = pickRandom(PHONE_PREFIXES);
  const a = Math.floor(Math.random() * 900 + 100);
  const b = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix} ${a}-${b}`;
}

function generateLinkedIn(first: string, last: string, i: number): string {
  const f = first.toLowerCase().replace(/[^a-z]/g, "");
  const l = last.toLowerCase().replace(/[^a-z]/g, "");
  return `https://linkedin.com/in/${f}-${l}-${Math.floor(Math.random() * 900 + 100)}${i}`;
}

function generateContactInfos(
  first: string,
  last: string,
  idx: number
) {
  return [
    { type: "Mobile" as const, value: generatePhone() },
    { type: "LinkedIn" as const, value: generateLinkedIn(first, last, idx) },
  ];
}

function getRandomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

// ---------------------------------------------------------------------------
// 1. DELETE the existing demo orga and ALL its data
// ---------------------------------------------------------------------------

export const deleteDemoOrga = internalMutation({
  args: {},
  returns: v.object({
    deleted: v.boolean(),
    deletedCounts: v.object({
      topics: v.number(),
      policies: v.number(),
      decisions: v.number(),
      invitations: v.number(),
      notifications: v.number(),
      notificationPreferences: v.number(),
      roles: v.number(),
      members: v.number(),
      teams: v.number(),
      users: v.number(),
      storageFiles: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const counts = {
      topics: 0,
      policies: 0,
      decisions: 0,
      invitations: 0,
      notifications: 0,
      notificationPreferences: 0,
      roles: 0,
      members: 0,
      teams: 0,
      users: 0,
      storageFiles: 0,
    };

    // --- Find the demo orga by exact name ---
    const orga = await ctx.db
      .query("orgas")
      .withIndex("by_name", (q) => q.eq("name", DEMO_ORGA_CONFIG.orgaName))
      .unique();

    if (!orga) {
      console.log(`[deleteDemoOrga] No orga named "${DEMO_ORGA_CONFIG.orgaName}" found. Nothing to delete.`);
      return { deleted: false, deletedCounts: counts };
    }

    const orgaId = orga._id;
    console.log(`[deleteDemoOrga] Deleting orga "${orga.name}" (${orgaId})...`);

    // 0a. Kanban data (comments, attachments, cards, labels, columns, boards)
    const kanbanBoards = await ctx.db
      .query("kanbanBoards")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();
    for (const board of kanbanBoards) {
      // Delete comments
      const kanbanComments = await ctx.db
        .query("kanbanComments")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const kc of kanbanComments) {
        await ctx.db.delete(kc._id);
      }
      // Delete attachments (including storage files)
      const kanbanAttachments = await ctx.db
        .query("kanbanAttachments")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const ka of kanbanAttachments) {
        try {
          await ctx.storage.delete(ka.storageId);
          counts.storageFiles++;
        } catch {
          // Storage file may already be deleted
        }
        await ctx.db.delete(ka._id);
      }
      // Delete cards
      const kanbanCards = await ctx.db
        .query("kanbanCards")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const card of kanbanCards) {
        await ctx.db.delete(card._id);
      }
      // Delete labels
      const kanbanLabels = await ctx.db
        .query("kanbanLabels")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const kl of kanbanLabels) {
        await ctx.db.delete(kl._id);
      }
      // Delete columns
      const kanbanColumns = await ctx.db
        .query("kanbanColumns")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      for (const col of kanbanColumns) {
        await ctx.db.delete(col._id);
      }
      // Delete the board itself
      await ctx.db.delete(board._id);
    }

    // 0b. Chat data (channels, messages, read positions)
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();
    for (const channel of channels) {
      const msgs = await ctx.db
        .query("messages")
        .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
        .collect();
      for (const msg of msgs) {
        await ctx.db.delete(msg._id);
      }
      const readPositions = await ctx.db
        .query("channelReadPositions")
        .withIndex("by_channel_and_member", (q) => q.eq("channelId", channel._id))
        .collect();
      for (const rp of readPositions) {
        await ctx.db.delete(rp._id);
      }
      await ctx.db.delete(channel._id);
    }

    // 1. Topics (queried via teams since topics lack an orgaId index)
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();

    for (const team of teams) {
      const topics = await ctx.db
        .query("topics")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();
      for (const t of topics) {
        await ctx.db.delete(t._id);
        counts.topics++;
      }
    }

    // 2. Policies
    const policies = await ctx.db
      .query("policies")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();
    for (const p of policies) {
      await ctx.db.delete(p._id);
      counts.policies++;
    }

    // 3. Decisions
    const decisions = await ctx.db
      .query("decisions")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();
    for (const d of decisions) {
      await ctx.db.delete(d._id);
      counts.decisions++;
    }

    // 4. Invitations
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();
    for (const inv of invitations) {
      await ctx.db.delete(inv._id);
      counts.invitations++;
    }

    // 5. Notifications (by orga)
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();
    for (const n of notifications) {
      await ctx.db.delete(n._id);
      counts.notifications++;
    }

    // 6. Roles (by orga)
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();
    for (const r of roles) {
      await ctx.db.delete(r._id);
      counts.roles++;
    }

    // 7. Members + patch users + notification preferences + storage cleanup
    const members = await ctx.db
      .query("members")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();

    for (const member of members) {
      // Delete notification preferences for this user+orga
      const prefs = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_user_and_orga", (q) =>
          q.eq("userId", member.personId).eq("orgaId", orgaId)
        )
        .collect();
      for (const pref of prefs) {
        await ctx.db.delete(pref._id);
        counts.notificationPreferences++;
      }

      // Delete avatar from storage if present
      if (member.pictureURL) {
        const match = member.pictureURL.match(/\/api\/storage\/([a-f0-9-]+)$/);
        if (match) {
          try {
            await ctx.storage.delete(match[1] as Id<"_storage">);
            counts.storageFiles++;
          } catch {
            // Storage file may already be deleted
          }
        }
      }

      // Remove orgaId from the user's orgaIds array
      const user = await ctx.db.get(member.personId);
      if (user) {
        await ctx.db.patch(member.personId, {
          orgaIds: user.orgaIds.filter((id) => id !== orgaId),
        });
      }

      await ctx.db.delete(member._id);
      counts.members++;
    }

    // 8. Teams
    for (const team of teams) {
      await ctx.db.delete(team._id);
      counts.teams++;
    }

    // 9. Delete the orga logo from storage if present
    if (orga.logoUrl) {
      const match = orga.logoUrl.match(/\/api\/storage\/([a-f0-9-]+)$/);
      if (match) {
        try {
          await ctx.storage.delete(match[1] as Id<"_storage">);
          counts.storageFiles++;
        } catch {
          // Storage file may already be deleted
        }
      }
    }

    // 10. Delete the orga itself
    await ctx.db.delete(orgaId);

    // 11. Delete orphaned demo test users
    //     Use the personIds from members we already collected (no full table scan).
    const checkedUserIds = new Set<string>();
    for (const member of members) {
      const uid = member.personId;
      if (checkedUserIds.has(uid)) continue;
      checkedUserIds.add(uid);

      const u = await ctx.db.get(uid);
      if (!u) continue;
      if (!u.email.endsWith(DEMO_EMAIL_DOMAIN) || u.orgaIds.length > 0) continue;

      // Clean up leftover notification preferences
      const globalPrefs = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .collect();
      for (const gp of globalPrefs) {
        await ctx.db.delete(gp._id);
        counts.notificationPreferences++;
      }

      // Clean up leftover notifications
      const userNotifs = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .collect();
      for (const n of userNotifs) {
        await ctx.db.delete(n._id);
        counts.notifications++;
      }

      await ctx.db.delete(u._id);
      counts.users++;
    }

    console.log(`[deleteDemoOrga] Done. Counts: ${JSON.stringify(counts)}`);
    return { deleted: true, deletedCounts: counts };
  },
});

// ---------------------------------------------------------------------------
// 2. SEED the demo orga from the config
// ---------------------------------------------------------------------------

export const seedDemoOrga = internalMutation({
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
    const config = DEMO_ORGA_CONFIG;

    // --- Resolve the admin user (owner of the demo orga) ---
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      throw new Error(
        "[seedDemoOrga] ADMIN_EMAIL env var is not set."
      );
    }
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", adminEmail))
      .unique();
    if (!adminUser) {
      throw new Error(
        "[seedDemoOrga] Admin user not found for email: " + adminEmail
      );
    }

    // --- Safety: ensure no orga with this name already exists ---
    const existing = await ctx.db
      .query("orgas")
      .withIndex("by_name", (q) => q.eq("name", config.orgaName))
      .unique();
    if (existing) {
      throw new Error(
        `[seedDemoOrga] Orga "${config.orgaName}" already exists (${existing._id}). ` +
        "Run deleteDemoOrga first."
      );
    }

    // --- Create the organization ---
    const orgaId = await ctx.db.insert("orgas", {
      name: config.orgaName,
      logoUrl: undefined,
      accentColor: config.accentColor,
      surfaceColorLight: config.surfaceColorLight,
      surfaceColorDark: config.surfaceColorDark,
      owner: adminUser._id,
      authorizedEmailDomains: config.authorizedEmailDomains,
    });

    // --- Create admin member ---
    const adminMemberId = await ctx.db.insert("members", {
      orgaId,
      personId: adminUser._id,
      firstname: adminUser.firstname,
      surname: adminUser.surname,
      email: adminUser.email,
      pictureURL: adminUser.pictureURL,
      contactInfos: adminUser.contactInfos,
      roleIds: [],
    });

    // Add orgaId to admin user if not already present
    if (!adminUser.orgaIds.includes(orgaId)) {
      await ctx.db.patch(adminUser._id, {
        orgaIds: [...adminUser.orgaIds, orgaId],
      });
    }

    // --- Create synthetic demo users ---
    const memberIds: Id<"members">[] = [adminMemberId];
    const userCount = config.userCount;

    for (let i = 0; i < userCount; i++) {
      const firstname = pickRandom(FIRST_NAMES);
      const surname = pickRandom(SURNAMES);
      const email = `${firstname.toLowerCase()}.${surname.toLowerCase()}.${i}${DEMO_EMAIL_DOMAIN}`;

      const userId = await ctx.db.insert("users", {
        firstname,
        surname,
        email,
        pictureURL: undefined,
        contactInfos: generateContactInfos(firstname, surname, i),
        orgaIds: [orgaId],
      });

      const memberId = await ctx.db.insert("members", {
        orgaId,
        personId: userId,
        firstname,
        surname,
        email,
        pictureURL: undefined,
        contactInfos: generateContactInfos(firstname, surname, i),
        roleIds: [],
      });

      memberIds.push(memberId);
    }

    // --- Build the team/role hierarchy from config ---
    const teamIds: Id<"teams">[] = [];
    let totalRoleCount = 0;

    const getRandomMember = (): Id<"members"> =>
      memberIds[Math.floor(Math.random() * memberIds.length)];

    const assignRoleToMember = async (
      memberId: Id<"members">,
      roleId: Id<"roles">
    ) => {
      const member = await ctx.db.get(memberId);
      if (member) {
        await ctx.db.patch(memberId, {
          roleIds: [...member.roleIds, roleId],
        });
      }
    };

    const createTeamFromTemplate = async (
      template: TeamTemplate,
      parentTeamId: Id<"teams"> | undefined,
      hue: number,
    ): Promise<{ teamId: Id<"teams">; sourceRoleId: Id<"roles"> | undefined }> => {
      // Create the team with a color derived from its hue
      const color = generateTeamColor(hue);
      const teamId = await ctx.db.insert("teams", {
        orgaId,
        name: template.name,
        color,
      });
      teamIds.push(teamId);

      // Determine leader info
      // Rule (b): leader role name = daughter team name
      // Rule (c): leader mission describes the team's purpose, not "lead the team..."
      const leaderMemberId =
        parentTeamId === undefined ? adminMemberId : getRandomMember();
      const leaderTitle =
        parentTeamId === undefined
          ? "Core Team"
          : template.name;
      const leaderMission =
        parentTeamId === undefined
          ? "Set the strategic direction and ensure the organization fulfills its mission"
          : `Deliver on the ${template.name} mission and ensure the team's contributions create lasting value`;
      const leaderDuties =
        parentTeamId === undefined
          ? ["Define and communicate company vision and strategy", "Align teams around shared goals and priorities", "Represent the organization to external stakeholders"]
          : [`Define and pursue the ${template.name} objectives`, "Allocate resources and remove blockers for the team", "Ensure alignment with the broader organizational strategy"];

      // For non-root teams: create the SOURCE role in the PARENT team (double role pattern)
      let sourceRoleId: Id<"roles"> | undefined = undefined;
      if (parentTeamId !== undefined) {
        sourceRoleId = await ctx.db.insert("roles", {
          orgaId,
          teamId: parentTeamId,
          title: leaderTitle,
          mission: leaderMission,
          duties: leaderDuties,
          memberId: leaderMemberId,
          iconKey: getRandomIconKey(),
        });
        totalRoleCount++;
        await assignRoleToMember(leaderMemberId, sourceRoleId);
      }

      // Create Leader role in this team
      const leaderRoleId = await ctx.db.insert("roles", {
        orgaId,
        teamId,
        parentTeamId,
        linkedRoleId: sourceRoleId,
        title: leaderTitle,
        roleType: "leader",
        mission: leaderMission,
        duties: leaderDuties,
        memberId: leaderMemberId,
        iconKey: getDefaultIconKey("leader"),
      });
      totalRoleCount++;
      await assignRoleToMember(leaderMemberId, leaderRoleId);

      // Secretary
      // Rule (d): standardized secretary mission and duties
      let secretaryMemberId = getRandomMember();
      while (secretaryMemberId === leaderMemberId && memberIds.length > 1) {
        secretaryMemberId = getRandomMember();
      }
      const secretaryRoleId = await ctx.db.insert("roles", {
        orgaId,
        teamId,
        title: "Secretary",
        roleType: "secretary",
        mission: "Define and organize the rituals, meetings and documentation of the team",
        duties: ["Plan and facilitate recurring team rituals and meetings", "Maintain and organize team documentation and decision records", "Ensure meeting outcomes are captured, shared, and followed up on"],
        memberId: secretaryMemberId,
        iconKey: getDefaultIconKey("secretary"),
      });
      totalRoleCount++;
      await assignRoleToMember(secretaryMemberId, secretaryRoleId);

      // Referee
      // Rule (e): standardized referee mission and duties
      let refereeMemberId = getRandomMember();
      while (
        (refereeMemberId === leaderMemberId ||
          refereeMemberId === secretaryMemberId) &&
        memberIds.length > 2
      ) {
        refereeMemberId = getRandomMember();
      }
      const refereeRoleId = await ctx.db.insert("roles", {
        orgaId,
        teamId,
        title: "Referee",
        roleType: "referee",
        mission: "Remind the governance rules, ensure every role can exert its duties and settle decisions when needed",
        duties: ["Remind and uphold governance rules and processes during team interactions", "Ensure every role holder has the space and resources to exert their duties", "Settle decisions and mediate disagreements when the team cannot reach consensus"],
        memberId: refereeMemberId,
        iconKey: getDefaultIconKey("referee"),
      });
      totalRoleCount++;
      await assignRoleToMember(refereeMemberId, refereeRoleId);

      // Additional roles from template (randomly select 2-5)
      const selectedRoles = getRandomSubset(template.roles, 2, 5);

      // Give special role holders a 50% chance to pick up extra roles
      const specialMembersForExtras: Id<"members">[] = [];
      if (Math.random() < 0.5) specialMembersForExtras.push(leaderMemberId);
      if (Math.random() < 0.5) specialMembersForExtras.push(secretaryMemberId);
      if (Math.random() < 0.5) specialMembersForExtras.push(refereeMemberId);

      let roleIdx = 0;

      // Assign extras to special members first
      for (const specialId of specialMembersForExtras) {
        if (roleIdx >= selectedRoles.length) break;
        const rt = selectedRoles[roleIdx++];
        const roleId = await ctx.db.insert("roles", {
          orgaId,
          teamId,
          title: rt.title,
          mission: rt.mission,
          duties: rt.duties,
          memberId: specialId,
          iconKey: getRandomIconKey(),
        });
        totalRoleCount++;
        await assignRoleToMember(specialId, roleId);
      }

      // Remaining roles go to random members
      for (; roleIdx < selectedRoles.length; roleIdx++) {
        const rt = selectedRoles[roleIdx];
        const memberId = getRandomMember();
        const roleId = await ctx.db.insert("roles", {
          orgaId,
          teamId,
          title: rt.title,
          mission: rt.mission,
          duties: rt.duties,
          memberId,
          iconKey: getRandomIconKey(),
        });
        totalRoleCount++;
        await assignRoleToMember(memberId, roleId);
      }

      // Recurse into children with nearby hues
      const childCount = template.children.length;
      for (let i = 0; i < childCount; i++) {
        let childHue: number;
        if (parentTeamId === undefined) {
          // Root's children: distribute evenly across the full color wheel
          childHue = (360 / childCount) * i + 15;
        } else if (childCount === 1) {
          // Single child: slight offset from parent
          childHue = hue + 10;
        } else {
          // Multiple children: spread within ±15° of parent hue
          childHue = hue - 15 + (i / (childCount - 1)) * 30;
        }
        await createTeamFromTemplate(template.children[i], teamId, childHue);
      }

      return { teamId, sourceRoleId };
    };

    await createTeamFromTemplate(config.organizationTree, undefined, 220);

    // --- Create channels for the demo orga ---
    // Orga channel
    const orgaChannelId = await ctx.db.insert("channels", {
      orgaId,
      kind: "orga" as const,
      isArchived: false,
    });

    // Team channels
    for (const teamId of teamIds) {
      await ctx.db.insert("channels", {
        orgaId,
        kind: "team" as const,
        teamId,
        isArchived: false,
      });
    }

    // Seed a few messages in the orga channel
    await ctx.db.insert("messages", {
      channelId: orgaChannelId,
      orgaId,
      authorId: adminMemberId,
      text: "Welcome to the organization channel! This is the place for org-wide announcements and discussions.",
      isEdited: false,
    });

    if (memberIds.length > 1) {
      await ctx.db.insert("messages", {
        channelId: orgaChannelId,
        orgaId,
        authorId: memberIds[1],
        text: "Thanks for setting this up! Looking forward to collaborating with everyone.",
        isEdited: false,
      });
    }

    if (memberIds.length > 2) {
      await ctx.db.insert("messages", {
        channelId: orgaChannelId,
        orgaId,
        authorId: memberIds[2],
        text: "Great to be here. Let's make this organization thrive!",
        isEdited: false,
      });
    }

    // --- Ensure every member has at least 1 role (assign extras to unassigned) ---
    // Collect all role templates for fallback assignment
    const allRoleTemplates: RoleTemplate[] = [];
    const collectRoles = (t: TeamTemplate) => {
      allRoleTemplates.push(...t.roles);
      for (const c of t.children) collectRoles(c);
    };
    collectRoles(config.organizationTree);

    for (const memberId of memberIds) {
      const member = await ctx.db.get(memberId);
      if (!member) continue;

      if (member.roleIds.length === 0) {
        // Assign 1-3 random roles in random teams
        const numToAssign = 1 + Math.floor(Math.random() * 3);
        const teamIndices = new Set<number>();
        while (teamIndices.size < numToAssign && teamIndices.size < teamIds.length) {
          teamIndices.add(Math.floor(Math.random() * teamIds.length));
        }

        const newRoleIds: Id<"roles">[] = [];
        for (const ti of teamIndices) {
          const teamId = teamIds[ti];
          const rt = pickRandom(allRoleTemplates);
          const roleId = await ctx.db.insert("roles", {
            orgaId,
            teamId,
            title: rt.title,
            mission: rt.mission,
            duties: rt.duties,
            memberId,
            iconKey: getRandomIconKey(),
          });
          totalRoleCount++;
          newRoleIds.push(roleId);
        }

        await ctx.db.patch(memberId, { roleIds: newRoleIds });
      } else if (member.roleIds.length < 3 && Math.random() > 0.5) {
        // Optionally add 1-2 more roles
        const numToAdd = 1 + Math.floor(Math.random() * 2);
        const teamIndices = new Set<number>();
        while (teamIndices.size < numToAdd && teamIndices.size < teamIds.length) {
          teamIndices.add(Math.floor(Math.random() * teamIds.length));
        }

        const extraRoleIds: Id<"roles">[] = [];
        for (const ti of teamIndices) {
          const teamId = teamIds[ti];
          const rt = pickRandom(allRoleTemplates);
          const roleId = await ctx.db.insert("roles", {
            orgaId,
            teamId,
            title: rt.title,
            mission: rt.mission,
            duties: rt.duties,
            memberId,
            iconKey: getRandomIconKey(),
          });
          totalRoleCount++;
          extraRoleIds.push(roleId);
        }

        await ctx.db.patch(memberId, {
          roleIds: [...member.roleIds, ...extraRoleIds],
        });
      }
    }

    console.log(
      `[seedDemoOrga] Created "${config.orgaName}" with ` +
      `${memberIds.length} members, ${teamIds.length} teams, ${totalRoleCount} roles.`
    );

    return {
      orgaId,
      memberCount: memberIds.length,
      teamCount: teamIds.length,
      roleCount: totalRoleCount,
    };
  },
});

// ---------------------------------------------------------------------------
// 2b. SEED Kanban boards, labels, cards, and comments for every team
// ---------------------------------------------------------------------------

/**
 * Label template: name + Tailwind color key.
 */
interface LabelDef {
  name: string;
  color: string;
}

const LABEL_POOL: LabelDef[] = [
  { name: "urgent", color: "red" },
  { name: "blocked", color: "orange" },
  { name: "discussion", color: "blue" },
  { name: "improvement", color: "green" },
  { name: "documentation", color: "teal" },
  { name: "research", color: "indigo" },
  { name: "recurring", color: "gray" },
];

/**
 * A card template defining all attributes for a seeded kanban card.
 * `column` is the index into DEFAULT_COLUMNS (0=New Topics, 1=Actions, 2=Done, 3=Archived).
 * `labels` refers to label names from LABEL_POOL.
 * `dueDaysFromNow` can be negative (past) or positive (future).
 */
interface CardTemplate {
  title: string;
  priority?: "low" | "medium" | "high" | "critical";
  labels: string[];
  column: number; // index into DEFAULT_COLUMNS
  dueDaysFromNow: number;
  checklist?: { text: string; completed: boolean }[];
  commentTexts?: string[];
}

// --- Card template sets keyed by team archetype ---

const ENGINEERING_CARDS: CardTemplate[] = [
  {
    title: "Migrate authentication flow to new SDK",
    priority: "critical",
    labels: ["urgent"],
    column: 1,
    dueDaysFromNow: 3,
    checklist: [
      { text: "Audit current auth flow and document endpoints", completed: true },
      { text: "Set up new SDK in staging environment", completed: true },
      { text: "Migrate login and signup routes", completed: false },
      { text: "Migrate token refresh logic", completed: false },
      { text: "Update integration tests", completed: false },
    ],
    commentTexts: [
      "The new SDK has a breaking change in the token refresh API. We need to handle the migration carefully.",
      "I have started documenting the current endpoints. Will share the audit by EOD.",
    ],
  },
  {
    title: "Fix memory leak in dashboard component",
    priority: "high",
    labels: ["urgent", "improvement"],
    column: 1,
    dueDaysFromNow: 2,
    checklist: [
      { text: "Reproduce the leak in local dev", completed: true },
      { text: "Profile with Chrome DevTools", completed: true },
      { text: "Fix event listener cleanup", completed: false },
      { text: "Verify fix with load test", completed: false },
    ],
  },
  {
    title: "Evaluate server-side rendering for SEO",
    priority: "low",
    labels: ["research", "discussion"],
    column: 0,
    dueDaysFromNow: 21,
  },
  {
    title: "Define error handling strategy",
    priority: "medium",
    labels: ["discussion"],
    column: 0,
    dueDaysFromNow: 14,
  },
  {
    title: "Write unit tests for processing module",
    priority: "medium",
    labels: ["improvement"],
    column: 1,
    dueDaysFromNow: 7,
    checklist: [
      { text: "Identify untested edge cases", completed: true },
      { text: "Write tests for input validation", completed: false },
      { text: "Write tests for error paths", completed: false },
      { text: "Reach 80% coverage target", completed: false },
    ],
  },
  {
    title: "Set up CI pipeline for automated testing",
    priority: "medium",
    labels: ["improvement"],
    column: 2,
    dueDaysFromNow: -5,
    checklist: [
      { text: "Configure GitHub Actions workflow", completed: true },
      { text: "Add lint and type-check steps", completed: true },
      { text: "Add unit test step", completed: true },
      { text: "Set up Slack notifications on failure", completed: true },
    ],
  },
  {
    title: "Onboard new team member to codebase",
    labels: ["documentation"],
    column: 3,
    dueDaysFromNow: -14,
    checklist: [
      { text: "Pair on architecture overview", completed: true },
      { text: "Walk through deployment process", completed: true },
      { text: "Assign first starter task", completed: true },
    ],
  },
  {
    title: "Investigate performance regression",
    priority: "high",
    labels: ["urgent", "research"],
    column: 0,
    dueDaysFromNow: 5,
    commentTexts: [
      "Users are reporting 2-3s load times on the main dashboard since last Thursday's deploy.",
    ],
  },
];

const PRODUCT_CARDS: CardTemplate[] = [
  {
    title: "Finalize Q2 roadmap priorities",
    priority: "critical",
    labels: ["urgent"],
    column: 1,
    dueDaysFromNow: 4,
    checklist: [
      { text: "Gather input from all team leads", completed: true },
      { text: "Score initiatives with RICE framework", completed: true },
      { text: "Draft roadmap document", completed: false },
      { text: "Review with leadership", completed: false },
      { text: "Publish to all-hands", completed: false },
    ],
  },
  {
    title: "Write PRD for notifications feature",
    priority: "high",
    labels: ["documentation"],
    column: 1,
    dueDaysFromNow: 10,
    checklist: [
      { text: "Define user stories and acceptance criteria", completed: true },
      { text: "Document notification channels and priorities", completed: false },
      { text: "Get sign-off from engineering lead", completed: false },
    ],
  },
  {
    title: "Review competitor product launch",
    priority: "medium",
    labels: ["research"],
    column: 0,
    dueDaysFromNow: 7,
  },
  {
    title: "Define KPIs for new onboarding flow",
    priority: "medium",
    labels: ["discussion"],
    column: 0,
    dueDaysFromNow: 12,
  },
  {
    title: "Conduct user interviews for dashboard redesign",
    priority: "medium",
    labels: ["research"],
    column: 1,
    dueDaysFromNow: 9,
    checklist: [
      { text: "Recruit 8 participants", completed: true },
      { text: "Prepare interview script", completed: true },
      { text: "Conduct interviews (4/8 done)", completed: false },
      { text: "Synthesize findings", completed: false },
    ],
  },
  {
    title: "Prioritize backlog for Sprint 14",
    priority: "low",
    labels: ["recurring"],
    column: 2,
    dueDaysFromNow: -3,
    checklist: [
      { text: "Review all new tickets", completed: true },
      { text: "Estimate story points", completed: true },
      { text: "Assign top-priority items", completed: true },
    ],
  },
];

const DESIGN_CARDS: CardTemplate[] = [
  {
    title: "Design mobile-responsive dashboard layout",
    priority: "high",
    labels: ["urgent"],
    column: 1,
    dueDaysFromNow: 6,
    checklist: [
      { text: "Audit current breakpoints", completed: true },
      { text: "Wireframe mobile layout", completed: true },
      { text: "Design tablet variant", completed: false },
      { text: "Create interactive prototype", completed: false },
    ],
  },
  {
    title: "Update design system color tokens for dark mode",
    priority: "medium",
    labels: ["improvement"],
    column: 1,
    dueDaysFromNow: 11,
    checklist: [
      { text: "Audit all existing color tokens", completed: true },
      { text: "Define dark mode palette", completed: false },
      { text: "Update Figma library", completed: false },
      { text: "Coordinate with frontend for implementation", completed: false },
    ],
  },
  {
    title: "Plan usability study for new search",
    priority: "medium",
    labels: ["research"],
    column: 0,
    dueDaysFromNow: 15,
  },
  {
    title: "Discuss icon consistency across product",
    priority: "low",
    labels: ["discussion", "improvement"],
    column: 0,
    dueDaysFromNow: 20,
  },
  {
    title: "Deliver settings page redesign mockups",
    labels: ["documentation"],
    column: 2,
    dueDaysFromNow: -7,
    checklist: [
      { text: "Explore 3 layout options", completed: true },
      { text: "Validate with stakeholders", completed: true },
      { text: "Finalize high-fidelity mockups", completed: true },
      { text: "Hand off to engineering", completed: true },
    ],
  },
];

const MARKETING_CARDS: CardTemplate[] = [
  {
    title: "Launch Q1 email campaign",
    priority: "critical",
    labels: ["urgent"],
    column: 1,
    dueDaysFromNow: 2,
    checklist: [
      { text: "Finalize email copy and subject lines", completed: true },
      { text: "Design email templates", completed: true },
      { text: "Set up audience segments", completed: true },
      { text: "Schedule sends", completed: false },
      { text: "Configure tracking and UTM params", completed: false },
    ],
  },
  {
    title: "Analyze February ad spend performance",
    priority: "medium",
    labels: ["recurring"],
    column: 1,
    dueDaysFromNow: 5,
    checklist: [
      { text: "Pull data from all ad platforms", completed: true },
      { text: "Calculate ROAS by channel", completed: false },
      { text: "Draft executive summary", completed: false },
    ],
  },
  {
    title: "Explore TikTok advertising for Gen Z",
    priority: "low",
    labels: ["research", "discussion"],
    column: 0,
    dueDaysFromNow: 30,
  },
  {
    title: "Review SEO strategy for new pages",
    priority: "medium",
    labels: ["improvement"],
    column: 0,
    dueDaysFromNow: 14,
  },
  {
    title: "Prepare board presentation on growth metrics",
    priority: "high",
    labels: ["urgent"],
    column: 1,
    dueDaysFromNow: 3,
    checklist: [
      { text: "Compile Q1 metrics", completed: true },
      { text: "Build slide deck", completed: false },
      { text: "Add competitive benchmarks", completed: false },
      { text: "Rehearse presentation", completed: false },
    ],
    commentTexts: [
      "Board meeting moved up to Friday -- need to finalize by Thursday EOD.",
    ],
  },
];

const SALES_CARDS: CardTemplate[] = [
  {
    title: "Close Enterprise deal with Acme Corp",
    priority: "critical",
    labels: ["urgent"],
    column: 1,
    dueDaysFromNow: 4,
    checklist: [
      { text: "Finalize pricing proposal", completed: true },
      { text: "Legal review of contract terms", completed: true },
      { text: "Schedule executive sponsor call", completed: false },
      { text: "Obtain signed MSA", completed: false },
    ],
    commentTexts: [
      "Acme's legal team has requested a custom DPA. Looping in our legal counsel.",
      "Call with their VP of Engineering went well. They are ready to move forward pending legal.",
    ],
  },
  {
    title: "Build QBR deck for top 5 accounts",
    priority: "high",
    labels: ["recurring"],
    column: 1,
    dueDaysFromNow: 8,
    checklist: [
      { text: "Pull usage data for each account", completed: true },
      { text: "Document expansion opportunities", completed: false },
      { text: "Create individual account slides", completed: false },
    ],
  },
  {
    title: "Define upsell playbook for mid-market",
    priority: "medium",
    labels: ["improvement", "documentation"],
    column: 0,
    dueDaysFromNow: 18,
  },
  {
    title: "Review customer churn signals",
    priority: "high",
    labels: ["discussion"],
    column: 0,
    dueDaysFromNow: 7,
    commentTexts: [
      "Three mid-market accounts have gone quiet in the last 2 weeks. We should set up health check calls.",
    ],
  },
  {
    title: "Deliver monthly sales report",
    priority: "medium",
    labels: ["recurring"],
    column: 2,
    dueDaysFromNow: -2,
    checklist: [
      { text: "Compile pipeline data from CRM", completed: true },
      { text: "Calculate win/loss ratios", completed: true },
      { text: "Draft commentary", completed: true },
      { text: "Submit to VP of Sales", completed: true },
    ],
  },
];

const HR_CARDS: CardTemplate[] = [
  {
    title: "Conduct annual compensation benchmarking",
    priority: "high",
    labels: ["recurring", "urgent"],
    column: 1,
    dueDaysFromNow: 6,
    checklist: [
      { text: "Obtain latest salary survey data", completed: true },
      { text: "Analyze pay bands vs. market", completed: false },
      { text: "Draft adjustment recommendations", completed: false },
      { text: "Present to leadership", completed: false },
    ],
  },
  {
    title: "Roll out updated employee handbook",
    priority: "medium",
    labels: ["documentation"],
    column: 1,
    dueDaysFromNow: 12,
    checklist: [
      { text: "Review legal compliance updates", completed: true },
      { text: "Revise remote work policy section", completed: true },
      { text: "Get legal sign-off", completed: false },
      { text: "Distribute to all employees", completed: false },
    ],
  },
  {
    title: "Design manager training program",
    priority: "medium",
    labels: ["improvement", "discussion"],
    column: 0,
    dueDaysFromNow: 25,
  },
  {
    title: "Complete Q4 performance review cycle",
    priority: "high",
    labels: ["recurring"],
    column: 2,
    dueDaysFromNow: -10,
    checklist: [
      { text: "Send review forms to all managers", completed: true },
      { text: "Collect completed reviews", completed: true },
      { text: "Run calibration sessions", completed: true },
      { text: "Deliver feedback to employees", completed: true },
    ],
  },
  {
    title: "Plan company all-hands meeting",
    priority: "medium",
    labels: ["recurring"],
    column: 1,
    dueDaysFromNow: 9,
    checklist: [
      { text: "Book venue / set up virtual link", completed: true },
      { text: "Collect department updates", completed: false },
      { text: "Prepare CEO talking points", completed: false },
      { text: "Send calendar invite to all-company", completed: false },
    ],
  },
];

const GENERIC_CARDS: CardTemplate[] = [
  {
    title: "Review team governance rules",
    priority: "low",
    labels: ["discussion"],
    column: 0,
    dueDaysFromNow: 14,
  },
  {
    title: "Prepare monthly status report",
    priority: "medium",
    labels: ["recurring"],
    column: 1,
    dueDaysFromNow: 5,
  },
  {
    title: "Follow up on pending decisions",
    priority: "high",
    labels: ["urgent"],
    column: 1,
    dueDaysFromNow: 3,
    commentTexts: [
      "Two governance decisions have been pending for over a week. Let's resolve them in the next meeting.",
    ],
  },
  {
    title: "Complete team retrospective",
    priority: "low",
    labels: ["recurring"],
    column: 2,
    dueDaysFromNow: -4,
  },
  {
    title: "Update team documentation",
    labels: ["documentation"],
    column: 3,
    dueDaysFromNow: -21,
  },
];

/**
 * Classify a team name into an archetype and return the matching card set.
 */
function getCardsForTeam(teamName: string): CardTemplate[] {
  const lower = teamName.toLowerCase();

  if (
    lower.includes("engineering") ||
    lower.includes("devops") ||
    lower.includes("infrastructure") ||
    lower.includes("platform") ||
    lower.includes("quality") ||
    lower.includes("security") ||
    lower.includes("frontend") ||
    lower.includes("backend")
  ) {
    return ENGINEERING_CARDS;
  }
  if (lower.includes("product") || lower.includes("data") || lower.includes("analytics")) {
    return PRODUCT_CARDS;
  }
  if (lower.includes("design")) {
    return DESIGN_CARDS;
  }
  if (
    lower.includes("marketing") ||
    lower.includes("growth") ||
    lower.includes("content") ||
    lower.includes("brand") ||
    lower.includes("communications")
  ) {
    return MARKETING_CARDS;
  }
  if (
    lower.includes("sales") ||
    lower.includes("customer") ||
    lower.includes("enterprise")
  ) {
    return SALES_CARDS;
  }
  if (
    lower.includes("people") ||
    lower.includes("hr") ||
    lower.includes("talent") ||
    lower.includes("operations")
  ) {
    return HR_CARDS;
  }
  if (lower.includes("finance") || lower.includes("legal")) {
    return GENERIC_CARDS;
  }
  if (lower.includes("it")) {
    return ENGINEERING_CARDS;
  }
  return GENERIC_CARDS;
}

/**
 * Seeds Kanban boards, labels, cards, and comments for every team in the demo orga.
 *
 * For each team:
 *  1. Creates a board with the 4 default columns
 *  2. Creates 4-6 labels from the LABEL_POOL
 *  3. Creates 3-10 cards (randomly selected from the team-archetype template set)
 *  4. Optionally creates threaded comments on some cards
 */
export const seedKanbanData = internalMutation({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.object({
    boardCount: v.number(),
    cardCount: v.number(),
    labelCount: v.number(),
    commentCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const { orgaId } = args;

    // Fetch all teams in this orga
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();

    // Fetch all members in this orga (for comment authors)
    const members = await ctx.db
      .query("members")
      .withIndex("by_orga", (q) => q.eq("orgaId", orgaId))
      .collect();

    let boardCount = 0;
    let cardCount = 0;
    let labelCount = 0;
    let commentCount = 0;

    const DAY_MS = 24 * 60 * 60 * 1000;

    for (const team of teams) {
      // 1. Create the board
      const boardId = await ctx.db.insert("kanbanBoards", {
        teamId: team._id,
        orgaId,
        columnOrder: [],
      });

      // 2. Create default columns
      const columnIds: Id<"kanbanColumns">[] = [];
      for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
        const columnId = await ctx.db.insert("kanbanColumns", {
          boardId,
          orgaId,
          name: DEFAULT_COLUMNS[i],
          position: i,
        });
        columnIds.push(columnId);
      }

      await ctx.db.patch(boardId, { columnOrder: columnIds });
      boardCount++;

      // 3. Create labels (pick 4-6 random labels from the pool)
      const labelSubset = getRandomSubset(LABEL_POOL, 4, 6);
      const labelMap = new Map<string, Id<"kanbanLabels">>();
      for (const labelDef of labelSubset) {
        const labelId = await ctx.db.insert("kanbanLabels", {
          boardId,
          orgaId,
          name: labelDef.name,
          color: labelDef.color,
        });
        labelMap.set(labelDef.name, labelId);
        labelCount++;
      }

      // 4. Fetch roles in this team (for card assignment)
      const teamRoles = await ctx.db
        .query("roles")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();

      if (teamRoles.length === 0) continue;

      // 5. Select card templates for this team's archetype
      const allTemplates = getCardsForTeam(team.name);
      // Pick 3-10 cards (but no more than available templates)
      const min = Math.min(3, allTemplates.length);
      const max = Math.min(10, allTemplates.length);
      const selectedCards = getRandomSubset(allTemplates, min, max);

      // Track positions per column
      const columnPositions = new Map<number, number>();

      for (const cardTmpl of selectedCards) {
        // Resolve role: pick a random role from this team
        const role = pickRandom(teamRoles);

        // Resolve column
        const columnIdx = Math.min(cardTmpl.column, columnIds.length - 1);
        const columnId = columnIds[columnIdx];

        // Calculate position (1024, 2048, 3072, ...)
        const currentPos = columnPositions.get(columnIdx) ?? 0;
        const newPos = currentPos + 1024;
        columnPositions.set(columnIdx, newPos);

        // Resolve label IDs (only use labels that exist on this board)
        const resolvedLabelIds: Id<"kanbanLabels">[] = [];
        for (const labelName of cardTmpl.labels) {
          const labelId = labelMap.get(labelName);
          if (labelId) {
            resolvedLabelIds.push(labelId);
          }
        }

        // Build checklist with unique IDs
        const checklist = cardTmpl.checklist?.map((item, idx) => ({
          id: `chk_${Date.now()}_${cardCount}_${idx}`,
          text: item.text,
          completed: item.completed,
        }));

        // Calculate due date
        const dueDate = Date.now() + cardTmpl.dueDaysFromNow * DAY_MS;

        const cardId = await ctx.db.insert("kanbanCards", {
          columnId,
          boardId,
          orgaId,
          roleId: role._id,
          title: cardTmpl.title,
          dueDate,
          comments: "",
          position: newPos,
          labelIds: resolvedLabelIds.length > 0 ? resolvedLabelIds : undefined,
          checklist: checklist,
          priority: cardTmpl.priority,
        });
        cardCount++;

        // 6. Create threaded comments (if template defines them)
        if (cardTmpl.commentTexts && cardTmpl.commentTexts.length > 0) {
          for (const text of cardTmpl.commentTexts) {
            const author = pickRandom(members);
            await ctx.db.insert("kanbanComments", {
              cardId,
              boardId,
              orgaId,
              authorId: author._id,
              text,
            });
            commentCount++;
          }
        }
      }
    }

    console.log(
      `[seedKanbanData] Created ${boardCount} boards, ${cardCount} cards, ` +
      `${labelCount} labels, ${commentCount} comments.`
    );

    return { boardCount, cardCount, labelCount, commentCount };
  },
});

// ---------------------------------------------------------------------------
// 3. UPLOAD the Infomax logo to Convex storage and update the orga
// ---------------------------------------------------------------------------

/**
 * Internal mutation to update an orga's logoUrl field.
 * Used by uploadDemoLogo after storing the logo in Convex storage.
 */
export const updateOrgaLogo = internalMutation({
  args: {
    orgaId: v.id("orgas"),
    logoUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orgaId, { logoUrl: args.logoUrl });
    return null;
  },
});

/**
 * Internal action that decodes the embedded Infomax logo from base64,
 * uploads it to Convex file storage, and patches the orga with the resulting URL.
 */
export const uploadDemoLogo = internalAction({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.object({
    logoUrl: v.string(),
  }),
  handler: async (ctx, args): Promise<{ logoUrl: string }> => {
    // Dynamically import the base64 logo data (keeps bundle impact minimal)
    const { INFOMAX_LOGO_BASE64 } = await import("./infomaxLogo");

    // Decode base64 to binary
    const binaryString = atob(INFOMAX_LOGO_BASE64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "image/svg+xml" });

    // Store in Convex storage
    const storageId = await ctx.storage.store(blob);
    const logoUrl = await ctx.storage.getUrl(storageId);
    if (!logoUrl) {
      throw new Error("[uploadDemoLogo] Failed to get storage URL for logo");
    }

    // Update the orga's logoUrl
    await ctx.runMutation(
      internal.dataTest.createDemoOrga.updateOrgaLogo,
      { orgaId: args.orgaId, logoUrl }
    );

    console.log(`[uploadDemoLogo] Logo uploaded and orga ${args.orgaId} updated.`);
    return { logoUrl };
  },
});

// ---------------------------------------------------------------------------
// 4. ORCHESTRATING ACTION: delete + create (called by cron)
// ---------------------------------------------------------------------------

export const resetDemoOrga = internalAction({
  args: {},
  returns: v.object({
    deleteResult: v.object({
      deleted: v.boolean(),
      deletedCounts: v.object({
        topics: v.number(),
        policies: v.number(),
        decisions: v.number(),
        invitations: v.number(),
        notifications: v.number(),
        notificationPreferences: v.number(),
        roles: v.number(),
        members: v.number(),
        teams: v.number(),
        users: v.number(),
        storageFiles: v.number(),
      }),
    }),
    createResult: v.object({
      orgaId: v.id("orgas"),
      memberCount: v.number(),
      teamCount: v.number(),
      roleCount: v.number(),
    }),
  }),
  handler: async (ctx): Promise<{
    deleteResult: {
      deleted: boolean;
      deletedCounts: {
        topics: number;
        policies: number;
        decisions: number;
        invitations: number;
        notifications: number;
        notificationPreferences: number;
        roles: number;
        members: number;
        teams: number;
        users: number;
        storageFiles: number;
      };
    };
    createResult: {
      orgaId: Id<"orgas">;
      memberCount: number;
      teamCount: number;
      roleCount: number;
    };
  }> => {
    console.log("[resetDemoOrga] Starting nightly demo orga reset...");

    // Step 1: Delete existing demo orga and all dependencies
    const deleteResult = await ctx.runMutation(
      internal.dataTest.createDemoOrga.deleteDemoOrga,
      {}
    );

    // Step 2: Seed fresh demo orga from config
    const createResult = await ctx.runMutation(
      internal.dataTest.createDemoOrga.seedDemoOrga,
      {}
    );

    // Step 3: Upload the Infomax logo and set it on the orga
    const logoResult = await ctx.runAction(
      internal.dataTest.createDemoOrga.uploadDemoLogo,
      { orgaId: createResult.orgaId }
    );

    // Step 4: Populate avatars for all members
    const avatarResult = await ctx.runAction(
      internal.dataTest.users.populateMemberAvatarsInternal,
      { orgaId: createResult.orgaId }
    );

    // Step 5: Seed Kanban boards, labels, cards, and comments
    const kanbanResult = await ctx.runMutation(
      internal.dataTest.createDemoOrga.seedKanbanData,
      { orgaId: createResult.orgaId }
    );

    console.log(
      `[resetDemoOrga] Reset complete. New orgaId: ${createResult.orgaId}, ` +
      `logo: ${logoResult.logoUrl}, ` +
      `avatars: ${avatarResult.updatedCount} ok / ${avatarResult.failedCount} failed, ` +
      `kanban: ${kanbanResult.boardCount} boards, ${kanbanResult.cardCount} cards`
    );

    return { deleteResult, createResult };
  },
});
