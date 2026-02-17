import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { getMemberInOrga, getAuthenticatedUserEmail, getRoleAndTeamInfo } from "../utils";
import { requireChannelAccess, requireNotArchived } from "./access";
import { canFacilitateElection, requireElectionPhase } from "./electionHelpers";
import {
  buildToolEventNotification,
  getChannelDisplayName,
  getChannelRecipients,
} from "../notifications/helpers";

/**
 * Create a new message with an embedded election tool in the nomination phase.
 * The election is for a role in a specific team.
 */
export const createElectionMessage = mutation({
  args: {
    channelId: v.id("channels"),
    roleTitle: v.string(),
    roleId: v.optional(v.id("roles")),
    teamId: v.id("teams"),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const { channel, member } = await requireChannelAccess(ctx, args.channelId);
    requireNotArchived(channel);

    const trimmedTitle = args.roleTitle.trim();
    if (!trimmedTitle) throw new Error("Role title cannot be empty");

    // Verify team exists and belongs to same orga
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.orgaId !== channel.orgaId) throw new Error("Team does not belong to this organization");

    // Verify role if provided
    if (args.roleId) {
      const role = await ctx.db.get(args.roleId);
      if (!role) throw new Error("Role not found");
      if (role.teamId !== args.teamId) throw new Error("Role does not belong to specified team");
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      orgaId: channel.orgaId,
      authorId: member._id,
      text: trimmedTitle,
      isEdited: false,
      embeddedTool: {
        type: "election",
        roleTitle: trimmedTitle,
        roleId: args.roleId,
        teamId: args.teamId,
        phase: "nomination",
      },
    });

    // Notify channel members about new election
    const recipients = await getChannelRecipients(ctx, channel, member._id);
    const channelName = await getChannelDisplayName(ctx, channel, member._id);
    const notifications = recipients.map((r) =>
      buildToolEventNotification({
        userId: r.userId,
        orgaId: channel.orgaId,
        memberId: r.memberId,
        messageId,
        channelId: args.channelId,
        channelName,
        toolType: "election",
        eventDescription: `Election opened for "${trimmedTitle}"`,
        priority: "high",
      })
    );
    if (notifications.length > 0) {
      await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
        notifications,
      });
    }

    return messageId;
  },
});

/**
 * Submit a nomination for an election. Each member can nominate exactly one person.
 * Nominations are secret during the nomination phase (only count is visible).
 */
export const submitNomination = mutation({
  args: {
    messageId: v.id("messages"),
    nomineeId: v.id("members"),
    reason: v.string(),
  },
  returns: v.id("electionNominations"),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);
    requireElectionPhase(message, "nomination");

    const trimmedReason = args.reason.trim();
    if (!trimmedReason) throw new Error("A reason for your nomination is required");

    // Verify nominee is a valid member in the same orga
    const nominee = await ctx.db.get(args.nomineeId);
    if (!nominee) throw new Error("Nominee not found");
    if (nominee.orgaId !== message.orgaId) throw new Error("Nominee is not in this organization");

    // Check uniqueness: one nomination per member per election
    const existing = await ctx.db
      .query("electionNominations")
      .withIndex("by_message_and_nominator", (q) =>
        q.eq("messageId", args.messageId).eq("nominatorId", member._id)
      )
      .unique();

    if (existing) throw new Error("You have already nominated someone. Wait for the change round to modify your nomination.");

    const nominationId = await ctx.db.insert("electionNominations", {
      messageId: args.messageId,
      orgaId: message.orgaId,
      nominatorId: member._id,
      nomineeId: args.nomineeId,
      reason: trimmedReason,
    });

    return nominationId;
  },
});

/**
 * Advance the election phase. Facilitator-only.
 * Valid transitions:
 *   nomination -> discussion (reveals nominations, facilitator proposes candidate)
 *   discussion -> change_round
 *   change_round -> consent (requires proposedCandidateId)
 *   consent -> discussion (go back if objections need addressing)
 */
export const advanceElectionPhase = mutation({
  args: {
    messageId: v.id("messages"),
    newPhase: v.union(
      v.literal("nomination"),
      v.literal("discussion"),
      v.literal("change_round"),
      v.literal("consent"),
    ),
    proposedCandidateId: v.optional(v.id("members")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "election") {
      throw new Error("Message is not an election");
    }

    const currentPhase = message.embeddedTool.phase;

    // Validate phase transitions
    const validTransitions: Record<string, string[]> = {
      nomination: ["discussion"],
      discussion: ["change_round"],
      change_round: ["consent"],
      consent: ["nomination"],
    };

    if (!validTransitions[currentPhase]?.includes(args.newPhase)) {
      throw new Error(`Cannot transition from "${currentPhase}" to "${args.newPhase}"`);
    }

    const member = await getMemberInOrga(ctx, message.orgaId);
    const isFacilitator = await canFacilitateElection(ctx, args.messageId, member._id);
    if (!isFacilitator) throw new Error("Only facilitators can advance the election phase");

    // Pick up proposed candidate from args if provided, otherwise keep existing
    let proposedCandidateId = message.embeddedTool.proposedCandidateId;
    if (args.proposedCandidateId) {
      proposedCandidateId = args.proposedCandidateId;
    }

    // When advancing to consent, a proposed candidate is required
    if (args.newPhase === "consent" && !proposedCandidateId) {
      throw new Error("A proposed candidate is required to move to the consent phase");
    }

    // When restarting at nomination from consent, clear all nominations, responses, and proposed candidate
    if (args.newPhase === "nomination" && currentPhase === "consent") {
      const responses = await ctx.db
        .query("electionResponses")
        .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
        .collect();
      for (const r of responses) {
        await ctx.db.delete(r._id);
      }
      const nominations = await ctx.db
        .query("electionNominations")
        .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
        .collect();
      for (const n of nominations) {
        await ctx.db.delete(n._id);
      }
      proposedCandidateId = undefined;
    }

    await ctx.db.patch(args.messageId, {
      embeddedTool: {
        ...message.embeddedTool,
        phase: args.newPhase,
        proposedCandidateId,
      },
    });

    // Notify channel members for consent and discussion phases
    if (args.newPhase === "consent" || args.newPhase === "discussion") {
      const channel = await ctx.db.get(message.channelId);
      if (channel) {
        const recipients = await getChannelRecipients(ctx, channel, member._id);
        const channelName = await getChannelDisplayName(ctx, channel, member._id);
        const roleTitle = message.embeddedTool.roleTitle;
        const notifications = recipients.map((r) =>
          buildToolEventNotification({
            userId: r.userId,
            orgaId: message.orgaId,
            memberId: r.memberId,
            messageId: args.messageId,
            channelId: message.channelId,
            channelName,
            toolType: "election",
            eventDescription: `Election for "${roleTitle}" moved to ${args.newPhase} phase`,
            priority: "high",
          })
        );
        if (notifications.length > 0) {
          await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
            notifications,
          });
        }
      }
    }

    return null;
  },
});

/**
 * Change a nomination during the change_round phase.
 * Members can update their nomination to a different nominee with a new reason.
 */
export const changeNomination = mutation({
  args: {
    messageId: v.id("messages"),
    newNomineeId: v.id("members"),
    newReason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);
    requireElectionPhase(message, "change_round");

    const trimmedReason = args.newReason.trim();
    if (!trimmedReason) throw new Error("A reason for your nomination is required");

    // Verify new nominee
    const nominee = await ctx.db.get(args.newNomineeId);
    if (!nominee) throw new Error("Nominee not found");
    if (nominee.orgaId !== message.orgaId) throw new Error("Nominee is not in this organization");

    // Find existing nomination
    const existing = await ctx.db
      .query("electionNominations")
      .withIndex("by_message_and_nominator", (q) =>
        q.eq("messageId", args.messageId).eq("nominatorId", member._id)
      )
      .unique();

    if (!existing) throw new Error("You have not submitted a nomination to change");

    await ctx.db.patch(existing._id, {
      nomineeId: args.newNomineeId,
      reason: trimmedReason,
    });

    return null;
  },
});

/**
 * Submit or update a consent response for the election in the consent phase.
 * Same pattern as topic consent responses.
 */
export const submitElectionResponse = mutation({
  args: {
    messageId: v.id("messages"),
    response: v.union(v.literal("consent"), v.literal("objection"), v.literal("stand_aside")),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const { member } = await requireChannelAccess(ctx, message.channelId);
    requireElectionPhase(message, "consent");

    if (args.response === "objection") {
      const trimmedReason = args.reason?.trim();
      if (!trimmedReason) throw new Error("Objections require a reason");
    }

    // Upsert: check for existing response
    const existing = await ctx.db
      .query("electionResponses")
      .withIndex("by_message_and_member", (q) =>
        q.eq("messageId", args.messageId).eq("memberId", member._id)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        response: args.response,
        reason: args.reason?.trim(),
      });
    } else {
      await ctx.db.insert("electionResponses", {
        messageId: args.messageId,
        orgaId: message.orgaId,
        memberId: member._id,
        response: args.response,
        reason: args.reason?.trim(),
      });
    }

    return null;
  },
});

/**
 * Resolve an election. Facilitator-only.
 * Sets the phase to "elected" with an outcome and creates a Decision record.
 */
export const resolveElection = mutation({
  args: {
    messageId: v.id("messages"),
    outcome: v.union(v.literal("elected"), v.literal("no_election")),
    electedMemberId: v.optional(v.id("members")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "election") {
      throw new Error("Message is not an election");
    }

    if (message.embeddedTool.phase !== "consent") {
      throw new Error("Can only resolve an election in the consent phase");
    }

    if (args.outcome === "elected" && !args.electedMemberId) {
      throw new Error("Must specify the elected member when outcome is 'elected'");
    }

    const member = await getMemberInOrga(ctx, message.orgaId);
    const isFacilitator = await canFacilitateElection(ctx, args.messageId, member._id);
    if (!isFacilitator) throw new Error("Only facilitators can resolve an election");

    const authorEmail = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, message.orgaId);

    // Find the team associated with the channel (if any)
    const channel = await ctx.db.get(message.channelId);
    const targetTeamId = channel?.teamId;

    // Create the Decision record
    const decisionId = await ctx.db.insert("decisions", {
      orgaId: message.orgaId,
      authorEmail,
      roleName,
      teamName,
      targetTeamId,
      targetId: args.messageId,
      targetType: "elections",
      diff: {
        type: "Election",
        before: {
          roleTitle: message.embeddedTool.roleTitle,
          teamId: message.embeddedTool.teamId,
          phase: "consent",
        },
        after: {
          roleTitle: message.embeddedTool.roleTitle,
          teamId: message.embeddedTool.teamId,
          phase: "elected",
          outcome: args.outcome,
          electedMemberId: args.electedMemberId,
        },
      },
    });

    // Update the message
    await ctx.db.patch(args.messageId, {
      embeddedTool: {
        ...message.embeddedTool,
        phase: "elected",
        outcome: args.outcome,
        electedMemberId: args.electedMemberId,
        decisionId,
      },
    });

    // Notify channel members about election resolution
    if (channel) {
      const recipients = await getChannelRecipients(ctx, channel, member._id);
      const channelName = await getChannelDisplayName(ctx, channel, member._id);
      const roleTitle = message.embeddedTool.roleTitle;
      const notifications = recipients.map((r) =>
        buildToolEventNotification({
          userId: r.userId,
          orgaId: message.orgaId,
          memberId: r.memberId,
          messageId: args.messageId,
          channelId: message.channelId,
          channelName,
          toolType: "election",
          eventDescription: `Election for "${roleTitle}" resolved: ${args.outcome}`,
        })
      );
      if (notifications.length > 0) {
        await ctx.scheduler.runAfter(0, internal.notifications.functions.createBatch, {
          notifications,
        });
      }
    }

    return null;
  },
});

/**
 * Cancel an election. Only the message author can cancel.
 * Cannot cancel once the election is already resolved (elected) or already cancelled.
 */
export const cancelElection = mutation({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "election") {
      throw new Error("Message is not an election");
    }

    if (message.embeddedTool.phase === "elected" || message.embeddedTool.phase === "cancelled") {
      throw new Error("Cannot cancel an election that is already resolved or cancelled");
    }

    const member = await getMemberInOrga(ctx, message.orgaId);
    if (message.authorId !== member._id) {
      throw new Error("Only the election creator can cancel it");
    }

    await ctx.db.patch(args.messageId, {
      embeddedTool: {
        ...message.embeddedTool,
        phase: "cancelled",
      },
    });

    return null;
  },
});

/**
 * Get nominations for an election message.
 * During nomination phase: returns only nomination count and whether current member has nominated.
 * After nomination phase: returns full nomination details with denormalized member data.
 */
export const getElectionNominations = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      phase: v.literal("secret"),
      totalNominations: v.number(),
      hasNominated: v.boolean(),
    }),
    v.object({
      phase: v.literal("revealed"),
      nominations: v.array(v.object({
        _id: v.id("electionNominations"),
        _creationTime: v.number(),
        nomineeId: v.id("members"),
        reason: v.string(),
        nominator: v.object({
          _id: v.id("members"),
          firstname: v.string(),
          surname: v.string(),
        }),
        nominee: v.object({
          _id: v.id("members"),
          firstname: v.string(),
          surname: v.string(),
        }),
      })),
      // Tally: how many nominations each person received
      tally: v.array(v.object({
        memberId: v.id("members"),
        firstname: v.string(),
        surname: v.string(),
        count: v.number(),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const { member } = await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "election") return null;

    const nominations = await ctx.db
      .query("electionNominations")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .order("asc")
      .collect();

    // During nomination phase, keep nominations secret
    if (message.embeddedTool.phase === "nomination") {
      const hasNominated = nominations.some((n) => n.nominatorId === member._id);
      return {
        phase: "secret" as const,
        totalNominations: nominations.length,
        hasNominated,
      };
    }

    // After nomination phase, reveal all nominations
    const memberCache = new Map<string, { _id: Id<"members">; firstname: string; surname: string }>();
    const getMember = async (memberId: Id<"members">) => {
      let cached = memberCache.get(memberId);
      if (!cached) {
        const doc = await ctx.db.get(memberId);
        cached = doc
          ? { _id: doc._id, firstname: doc.firstname, surname: doc.surname }
          : { _id: memberId, firstname: "Unknown", surname: "User" };
        memberCache.set(memberId, cached);
      }
      return cached;
    };

    const enrichedNominations = await Promise.all(
      nominations.map(async (n) => {
        const nominator = await getMember(n.nominatorId);
        const nominee = await getMember(n.nomineeId);
        return {
          _id: n._id,
          _creationTime: n._creationTime,
          nomineeId: n.nomineeId,
          reason: n.reason,
          nominator,
          nominee,
        };
      })
    );

    // Build tally
    const tallyMap = new Map<string, { memberId: Id<"members">; count: number }>();
    for (const n of nominations) {
      const key = n.nomineeId;
      const existing = tallyMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        tallyMap.set(key, { memberId: n.nomineeId, count: 1 });
      }
    }

    const tally = await Promise.all(
      Array.from(tallyMap.values())
        .sort((a, b) => b.count - a.count)
        .map(async (entry) => {
          const m = await getMember(entry.memberId);
          return {
            memberId: entry.memberId,
            firstname: m.firstname,
            surname: m.surname,
            count: entry.count,
          };
        })
    );

    return {
      phase: "revealed" as const,
      nominations: enrichedNominations,
      tally,
    };
  },
});

/**
 * Get consent responses for an election message (same pattern as topic responses).
 */
export const getElectionResponses = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.array(v.object({
    _id: v.id("electionResponses"),
    _creationTime: v.number(),
    response: v.union(v.literal("consent"), v.literal("objection"), v.literal("stand_aside")),
    reason: v.optional(v.string()),
    member: v.object({
      _id: v.id("members"),
      firstname: v.string(),
      surname: v.string(),
    }),
  })),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    await requireChannelAccess(ctx, message.channelId);

    const responses = await ctx.db
      .query("electionResponses")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .order("asc")
      .collect();

    return Promise.all(
      responses.map(async (r) => {
        const doc = await ctx.db.get(r.memberId);
        const member = doc
          ? { _id: doc._id, firstname: doc.firstname, surname: doc.surname }
          : { _id: r.memberId, firstname: "Unknown", surname: "User" };

        return {
          _id: r._id,
          _creationTime: r._creationTime,
          response: r.response,
          reason: r.reason,
          member,
        };
      })
    );
  },
});

/**
 * Get the current user's nomination for an election message.
 */
export const getMyElectionNomination = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      _id: v.id("electionNominations"),
      nomineeId: v.id("members"),
      reason: v.string(),
      nominee: v.object({
        _id: v.id("members"),
        firstname: v.string(),
        surname: v.string(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const { member } = await requireChannelAccess(ctx, message.channelId);

    const existing = await ctx.db
      .query("electionNominations")
      .withIndex("by_message_and_nominator", (q) =>
        q.eq("messageId", args.messageId).eq("nominatorId", member._id)
      )
      .unique();

    if (!existing) return null;

    const nomineeDoc = await ctx.db.get(existing.nomineeId);
    const nominee = nomineeDoc
      ? { _id: nomineeDoc._id, firstname: nomineeDoc.firstname, surname: nomineeDoc.surname }
      : { _id: existing.nomineeId, firstname: "Unknown", surname: "User" };

    return {
      _id: existing._id,
      nomineeId: existing.nomineeId,
      reason: existing.reason,
      nominee,
    };
  },
});

/**
 * Get the current user's election response.
 */
export const getMyElectionResponse = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      _id: v.id("electionResponses"),
      response: v.union(v.literal("consent"), v.literal("objection"), v.literal("stand_aside")),
      reason: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const { member } = await requireChannelAccess(ctx, message.channelId);

    const existing = await ctx.db
      .query("electionResponses")
      .withIndex("by_message_and_member", (q) =>
        q.eq("messageId", args.messageId).eq("memberId", member._id)
      )
      .unique();

    if (!existing) return null;

    return {
      _id: existing._id,
      response: existing.response,
      reason: existing.reason,
    };
  },
});

/**
 * Get all members of the election's team who could be nominated.
 * Returns members who hold at least one role in the specified team.
 */
export const getEligibleNominees = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.array(v.object({
    _id: v.id("members"),
    firstname: v.string(),
    surname: v.string(),
    pictureURL: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    await requireChannelAccess(ctx, message.channelId);

    if (!message.embeddedTool || message.embeddedTool.type !== "election") return [];

    const teamId = message.embeddedTool.teamId;

    // Get all roles in the team
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();

    // Collect unique member IDs
    const memberIdSet = new Set<string>();
    for (const role of roles) {
      if (role.memberId) memberIdSet.add(role.memberId);
    }

    // Also include all orga members (any member can be nominated, not just team members)
    const allMembers = await ctx.db
      .query("members")
      .withIndex("by_orga", (q) => q.eq("orgaId", message.orgaId))
      .collect();

    const results: Array<{
      _id: Id<"members">;
      firstname: string;
      surname: string;
      pictureURL?: string;
    }> = [];

    for (const m of allMembers) {
      results.push({
        _id: m._id,
        firstname: m.firstname,
        surname: m.surname,
        pictureURL: m.pictureURL,
      });
    }

    // Sort alphabetically
    results.sort((a, b) =>
      `${a.firstname} ${a.surname}`.localeCompare(`${b.firstname} ${b.surname}`)
    );

    return results;
  },
});

/**
 * Check if the current user can facilitate an election (advance/resolve).
 */
export const canFacilitateElectionQuery = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return false;

    const { member } = await requireChannelAccess(ctx, message.channelId);
    return canFacilitateElection(ctx, args.messageId, member._id);
  },
});
