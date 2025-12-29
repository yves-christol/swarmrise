import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  requireAuthAndMembership,
  getAuthenticatedUserEmail,
  getRoleAndTeamInfo,
  getOrgaFromTeam,
} from "./utils";

/**
 * Get a meeting by ID
 */
export const getMeetingById = query({
  args: {
    meetingId: v.id("meetings"),
  },
  returns: v.union(
    v.object({
      _id: v.id("meetings"),
      _creationTime: v.number(),
      teamId: v.id("teams"),
      title: v.string(),
      scheduledDate: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      return null;
    }
    const orgaId = await getOrgaFromTeam(ctx, meeting.teamId);
    await requireAuthAndMembership(ctx, orgaId);
    return meeting;
  },
});

/**
 * List all meetings in a team
 */
export const listMeetingsInTeam = query({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.array(
    v.object({
      _id: v.id("meetings"),
      _creationTime: v.number(),
      teamId: v.id("teams"),
      title: v.string(),
      scheduledDate: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    await requireAuthAndMembership(ctx, orgaId);
    return await ctx.db
      .query("meetings")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

/**
 * List meetings in a team ordered by scheduled date
 */
export const listMeetingsInTeamByDate = query({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.array(
    v.object({
      _id: v.id("meetings"),
      _creationTime: v.number(),
      teamId: v.id("teams"),
      title: v.string(),
      scheduledDate: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    await requireAuthAndMembership(ctx, orgaId);
    return await ctx.db
      .query("meetings")
      .withIndex("by_team_and_date", (q) => q.eq("teamId", args.teamId))
      .order("asc")
      .collect();
  },
});

/**
 * Create a new meeting
 */
export const createMeeting = mutation({
  args: {
    teamId: v.id("teams"),
    title: v.string(),
    scheduledDate: v.number(),
  },
  returns: v.id("meetings"),
  handler: async (ctx, args) => {
    const orgaId = await getOrgaFromTeam(ctx, args.teamId);
    const member = await requireAuthAndMembership(ctx, orgaId);
    
    // Create meeting
    const meetingId = await ctx.db.insert("meetings", {
      teamId: args.teamId,
      title: args.title,
      scheduledDate: args.scheduledDate,
    });
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: meetingId,
      targetType: "meetings",
      diff: {
        type: "Meeting",
        before: {
          teamId: args.teamId,
          title: "",
          scheduledDate: 0,
        },
        after: {
          teamId: args.teamId,
          title: args.title,
          scheduledDate: args.scheduledDate,
        },
      },
    });
    
    return meetingId;
  },
});

/**
 * Update a meeting
 */
export const updateMeeting = mutation({
  args: {
    meetingId: v.id("meetings"),
    title: v.optional(v.string()),
    scheduledDate: v.optional(v.number()),
  },
  returns: v.id("meetings"),
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }
    
    const orgaId = await getOrgaFromTeam(ctx, meeting.teamId);
    const member = await requireAuthAndMembership(ctx, orgaId);
    
    // Store before state
    const before = {
      teamId: meeting.teamId,
      title: meeting.title,
      scheduledDate: meeting.scheduledDate,
    };
    
    // Update meeting
    const updates: {
      title?: string;
      scheduledDate?: number;
    } = {};
    
    if (args.title !== undefined) updates.title = args.title;
    if (args.scheduledDate !== undefined) updates.scheduledDate = args.scheduledDate;
    
    await ctx.db.patch(args.meetingId, updates);
    
    // Get updated meeting for after state
    const updatedMeeting = await ctx.db.get(args.meetingId);
    if (!updatedMeeting) {
      throw new Error("Failed to retrieve updated meeting");
    }
    
    const after = {
      teamId: updatedMeeting.teamId,
      title: updatedMeeting.title,
      scheduledDate: updatedMeeting.scheduledDate,
    };
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.meetingId,
      targetType: "meetings",
      diff: {
        type: "Meeting",
        before,
        after,
      },
    });
    
    return args.meetingId;
  },
});

/**
 * Delete a meeting
 */
export const deleteMeeting = mutation({
  args: {
    meetingId: v.id("meetings"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }
    
    const orgaId = await getOrgaFromTeam(ctx, meeting.teamId);
    const member = await requireAuthAndMembership(ctx, orgaId);
    
    // Store before state
    const before = {
      teamId: meeting.teamId,
      title: meeting.title,
      scheduledDate: meeting.scheduledDate,
    };
    
    // Delete meeting
    await ctx.db.delete(args.meetingId);
    
    // Create decision record
    const email = await getAuthenticatedUserEmail(ctx);
    const { roleName, teamName } = await getRoleAndTeamInfo(ctx, member._id, orgaId);
    
    await ctx.db.insert("decisions", {
      orgaId,
      timestamp: Date.now(),
      authorEmail: email,
      roleName,
      teamName,
      targetId: args.meetingId,
      targetType: "meetings",
      diff: {
        type: "Meeting",
        before,
        after: {
          teamId: meeting.teamId,
          title: "",
          scheduledDate: 0,
        },
      },
    });
    
    return null;
  },
});

