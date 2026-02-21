import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Migrate existing kanban cards from ownerId (member) to roleId (role).
 * Run once via the Convex dashboard after deploying the schema change.
 */
export const migrateOwnerToRole = internalMutation({
  args: {},
  returns: v.object({
    migrated: v.number(),
    flagged: v.number(),
  }),
  handler: async (ctx) => {
    const allCards = await ctx.db.query("kanbanCards").collect();
    let migrated = 0;
    let flagged = 0;

    for (const card of allCards) {
      if ((card as Record<string, unknown>).roleId) continue;

      const ownerId = (card as Record<string, unknown>).ownerId as Id<"members"> | undefined;
      if (!ownerId) {
        flagged++;
        continue;
      }

      const board = await ctx.db.get(card.boardId);
      if (!board) {
        flagged++;
        continue;
      }

      const memberRoles = await ctx.db
        .query("roles")
        .withIndex("by_member", (q) => q.eq("memberId", ownerId))
        .collect();

      const teamRoles = memberRoles.filter((r) => r.teamId === board.teamId);

      if (teamRoles.length === 0) {
        const anyTeamRole = await ctx.db
          .query("roles")
          .withIndex("by_team", (q) => q.eq("teamId", board.teamId))
          .first();
        if (anyTeamRole) {
          await ctx.db.patch(card._id, {
            roleId: anyTeamRole._id,
          } as Record<string, unknown>);
          migrated++;
        } else {
          await ctx.db.delete(card._id);
          flagged++;
        }
        continue;
      }

      const targetRole =
        teamRoles.find((r) => !r.roleType) ?? teamRoles[0];

      await ctx.db.patch(card._id, {
        roleId: targetRole._id,
      } as Record<string, unknown>);

      migrated++;
    }

    return { migrated, flagged };
  },
});
