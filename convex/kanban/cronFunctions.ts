import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Check all kanban cards for approaching or overdue due dates and
 * send notifications to the role holders. Called periodically by a cron job.
 */
export const checkDueDateNotifications = internalMutation({
  args: {},
  returns: v.object({
    approaching: v.number(),
    overdue: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayFromNow = now + ONE_DAY_MS;

    let approaching = 0;
    let overdue = 0;
    let skipped = 0;

    const allCards = await ctx.db.query("kanbanCards").collect();

    for (const card of allCards) {
      let dueType: "approaching" | "overdue" | null = null;

      if (card.dueDate < now) {
        dueType = "overdue";
      } else if (card.dueDate <= oneDayFromNow) {
        dueType = "approaching";
      }

      if (!dueType) continue;

      const groupKey = `kanban_due:${card._id}:${dueType}`;
      const existingNotification = await ctx.db
        .query("notifications")
        .withIndex("by_group_key", (q) => q.eq("groupKey", groupKey))
        .first();

      if (existingNotification) {
        skipped++;
        continue;
      }

      const role = await ctx.db.get(card.roleId);
      if (!role) {
        skipped++;
        continue;
      }

      const member = await ctx.db.get(role.memberId);
      if (!member) {
        skipped++;
        continue;
      }

      const board = await ctx.db.get(card.boardId);
      if (!board) {
        skipped++;
        continue;
      }

      const team = await ctx.db.get(board.teamId);
      if (!team) {
        skipped++;
        continue;
      }

      await ctx.runMutation(internal.notifications.functions.create, {
        userId: member.personId,
        orgaId: card.orgaId,
        memberId: role.memberId,
        payload: {
          category: "kanban_due" as const,
          cardId: card._id,
          cardTitle: card.title,
          teamId: board.teamId,
          teamName: team.name,
          dueDate: card.dueDate,
          dueType,
        },
        priority: dueType === "overdue" ? "high" : "normal",
        groupKey,
      });

      if (dueType === "approaching") {
        approaching++;
      } else {
        overdue++;
      }
    }

    return { approaching, overdue, skipped };
  },
});
