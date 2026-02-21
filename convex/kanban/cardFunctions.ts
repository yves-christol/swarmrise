import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import {
  kanbanCardValidator,
  memberKanbanTeamGroupValidator,
  checklistItemValidator,
  priorityValidator,
} from ".";
import { getMemberInOrga } from "../utils";
import { requireBoardAccess } from "./access";

/**
 * Get all cards assigned to a specific role.
 */
export const getCardsByRole = query({
  args: { roleId: v.id("roles") },
  returns: v.array(kanbanCardValidator),
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) return [];

    await getMemberInOrga(ctx, role.orgaId);

    return await ctx.db
      .query("kanbanCards")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();
  },
});

/**
 * Get all cards owned by a member across all boards.
 */
export const getCardsByMember = query({
  args: { memberId: v.id("members") },
  returns: v.array(kanbanCardValidator),
  handler: async (ctx, args) => {
    const memberDoc = await ctx.db.get(args.memberId);
    if (!memberDoc) return [];

    await getMemberInOrga(ctx, memberDoc.orgaId);

    const roles = await ctx.db
      .query("roles")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    const allCards = [];
    for (const role of roles) {
      const cards = await ctx.db
        .query("kanbanCards")
        .withIndex("by_role", (q) => q.eq("roleId", role._id))
        .collect();
      allCards.push(...cards);
    }

    return allCards;
  },
});

/**
 * Get all cards owned by a member, enriched with column/role/team context,
 * grouped by team. Used for the Member Kanban View.
 */
export const getCardsByMemberWithContext = query({
  args: { memberId: v.id("members") },
  returns: v.array(memberKanbanTeamGroupValidator),
  handler: async (ctx, args) => {
    const memberDoc = await ctx.db.get(args.memberId);
    if (!memberDoc) return [];

    await getMemberInOrga(ctx, memberDoc.orgaId);

    const roles = await ctx.db
      .query("roles")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    if (roles.length === 0) return [];

    const roleById = new Map(roles.map((r) => [r._id, r]));

    const allCards = [];
    for (const role of roles) {
      const cards = await ctx.db
        .query("kanbanCards")
        .withIndex("by_role", (q) => q.eq("roleId", role._id))
        .collect();
      allCards.push(...cards);
    }

    if (allCards.length === 0) return [];

    const columnIds = [...new Set(allCards.map((c) => c.columnId))];
    const columnById = new Map<Id<"kanbanColumns">, { name: string }>();
    for (const colId of columnIds) {
      const col = await ctx.db.get(colId);
      if (col) columnById.set(colId, { name: col.name });
    }

    const boardIds = [...new Set(allCards.map((c) => c.boardId))];
    const boardById = new Map<Id<"kanbanBoards">, { teamId: Id<"teams"> }>();
    for (const boardId of boardIds) {
      const board = await ctx.db.get(boardId);
      if (board) boardById.set(boardId, { teamId: board.teamId });
    }

    const teamIds = [...new Set([...boardById.values()].map((b) => b.teamId))];
    const teamById = new Map<Id<"teams">, { name: string; color?: string }>();
    for (const teamId of teamIds) {
      const team = await ctx.db.get(teamId);
      if (team) teamById.set(teamId, { name: team.name, color: team.color });
    }

    const teamGroups = new Map<Id<"teams">, typeof allCards>();
    for (const card of allCards) {
      const board = boardById.get(card.boardId);
      if (!board) continue;
      const group = teamGroups.get(board.teamId) ?? [];
      group.push(card);
      teamGroups.set(board.teamId, group);
    }

    const result = [];
    for (const [teamId, cards] of teamGroups) {
      const team = teamById.get(teamId);
      if (!team) continue;

      const enrichedCards = cards.map((card) => {
        const role = roleById.get(card.roleId);
        const column = columnById.get(card.columnId);
        return {
          ...card,
          columnName: column?.name ?? "Unknown",
          roleTitle: role?.title ?? "Unknown",
          roleIconKey: role?.iconKey,
          roleType: role?.roleType,
        };
      });

      enrichedCards.sort((a, b) => a.position - b.position);

      result.push({
        teamId,
        teamName: team.name,
        teamColor: team.color,
        cards: enrichedCards,
      });
    }

    result.sort((a, b) => a.teamName.localeCompare(b.teamName));

    return result;
  },
});

/**
 * Create a new card in a column.
 */
export const createCard = mutation({
  args: {
    boardId: v.id("kanbanBoards"),
    columnId: v.id("kanbanColumns"),
    title: v.string(),
    roleId: v.id("roles"),
    dueDate: v.number(),
    comments: v.optional(v.string()),
    labelIds: v.optional(v.array(v.id("kanbanLabels"))),
    checklist: v.optional(v.array(checklistItemValidator)),
    priority: v.optional(priorityValidator),
  },
  returns: v.id("kanbanCards"),
  handler: async (ctx, args) => {
    const { board } = await requireBoardAccess(ctx, args.boardId);

    const column = await ctx.db.get(args.columnId);
    if (!column || column.boardId !== args.boardId) {
      throw new Error("Column not found on this board");
    }

    const role = await ctx.db.get(args.roleId);
    if (!role || role.orgaId !== board.orgaId) {
      throw new Error("Role must belong to the same organization");
    }
    if (role.teamId !== board.teamId) {
      throw new Error("Role must belong to the board's team");
    }

    const existingCards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_column_and_position", (q) => q.eq("columnId", args.columnId))
      .collect();

    const maxPosition =
      existingCards.length > 0
        ? Math.max(...existingCards.map((c) => c.position))
        : 0;

    return await ctx.db.insert("kanbanCards", {
      columnId: args.columnId,
      boardId: args.boardId,
      orgaId: board.orgaId,
      roleId: args.roleId,
      title: args.title,
      dueDate: args.dueDate,
      comments: args.comments ?? "",
      position: maxPosition + 1024,
      labelIds: args.labelIds,
      checklist: args.checklist,
      priority: args.priority,
    });
  },
});

/**
 * Update card details.
 */
export const updateCard = mutation({
  args: {
    cardId: v.id("kanbanCards"),
    title: v.optional(v.string()),
    roleId: v.optional(v.id("roles")),
    dueDate: v.optional(v.number()),
    comments: v.optional(v.string()),
    labelIds: v.optional(v.array(v.id("kanbanLabels"))),
    checklist: v.optional(v.array(checklistItemValidator)),
    priority: v.optional(priorityValidator),
  },
  returns: v.id("kanbanCards"),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const { board } = await requireBoardAccess(ctx, card.boardId);

    if (args.roleId !== undefined) {
      const role = await ctx.db.get(args.roleId);
      if (!role || role.orgaId !== board.orgaId) {
        throw new Error("Role must belong to the same organization");
      }
      if (role.teamId !== board.teamId) {
        throw new Error("Role must belong to the board's team");
      }
    }

    const updates: Record<string, unknown> = {};

    if (args.title !== undefined) updates.title = args.title;
    if (args.roleId !== undefined) updates.roleId = args.roleId;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.comments !== undefined) updates.comments = args.comments;
    if (args.labelIds !== undefined) updates.labelIds = args.labelIds;
    if (args.checklist !== undefined) updates.checklist = args.checklist;
    if (args.priority !== undefined) updates.priority = args.priority;

    await ctx.db.patch(args.cardId, updates);
    return args.cardId;
  },
});

/**
 * Move a card to a different column and/or position (drag and drop).
 */
export const moveCard = mutation({
  args: {
    cardId: v.id("kanbanCards"),
    targetColumnId: v.id("kanbanColumns"),
    targetPosition: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    await requireBoardAccess(ctx, card.boardId);

    const targetColumn = await ctx.db.get(args.targetColumnId);
    if (!targetColumn || targetColumn.boardId !== card.boardId) {
      throw new Error("Target column not found on this board");
    }

    await ctx.db.patch(args.cardId, {
      columnId: args.targetColumnId,
      position: args.targetPosition,
    });

    return null;
  },
});

/**
 * Delete a card permanently. Cascade-deletes comments and attachments.
 */
export const deleteCard = mutation({
  args: { cardId: v.id("kanbanCards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    await requireBoardAccess(ctx, card.boardId);

    const comments = await ctx.db
      .query("kanbanComments")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    const attachments = await ctx.db
      .query("kanbanAttachments")
      .withIndex("by_card", (q) => q.eq("cardId", args.cardId))
      .collect();
    for (const attachment of attachments) {
      await ctx.storage.delete(attachment.storageId);
      const sfRecord = await ctx.db
        .query("storageFiles")
        .withIndex("by_storage_id", (q) => q.eq("storageId", attachment.storageId))
        .unique();
      if (sfRecord) await ctx.db.delete(sfRecord._id);
      await ctx.db.delete(attachment._id);
    }

    await ctx.db.delete(args.cardId);
    return null;
  },
});

/**
 * Move multiple cards to a target column at once.
 */
export const bulkMoveCards = mutation({
  args: {
    cardIds: v.array(v.id("kanbanCards")),
    targetColumnId: v.id("kanbanColumns"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.cardIds.length === 0) return null;

    const firstCard = await ctx.db.get(args.cardIds[0]);
    if (!firstCard) throw new Error("Card not found");

    await requireBoardAccess(ctx, firstCard.boardId);

    const targetColumn = await ctx.db.get(args.targetColumnId);
    if (!targetColumn || targetColumn.boardId !== firstCard.boardId) {
      throw new Error("Target column not found on this board");
    }

    const existingCards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_column_and_position", (q) => q.eq("columnId", args.targetColumnId))
      .collect();

    let nextPosition =
      existingCards.length > 0
        ? Math.max(...existingCards.map((c) => c.position)) + 1024
        : 1024;

    for (const cardId of args.cardIds) {
      const card = await ctx.db.get(cardId);
      if (!card) continue;
      if (card.boardId !== firstCard.boardId) continue;

      await ctx.db.patch(cardId, {
        columnId: args.targetColumnId,
        position: nextPosition,
      });
      nextPosition += 1024;
    }

    return null;
  },
});

/**
 * Delete multiple cards at once.
 */
export const bulkDeleteCards = mutation({
  args: {
    cardIds: v.array(v.id("kanbanCards")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.cardIds.length === 0) return null;

    const firstCard = await ctx.db.get(args.cardIds[0]);
    if (!firstCard) throw new Error("Card not found");

    await requireBoardAccess(ctx, firstCard.boardId);

    for (const cardId of args.cardIds) {
      const card = await ctx.db.get(cardId);
      if (!card) continue;
      if (card.boardId !== firstCard.boardId) continue;

      const comments = await ctx.db
        .query("kanbanComments")
        .withIndex("by_card", (q) => q.eq("cardId", cardId))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }
      const attachments = await ctx.db
        .query("kanbanAttachments")
        .withIndex("by_card", (q) => q.eq("cardId", cardId))
        .collect();
      for (const attachment of attachments) {
        await ctx.storage.delete(attachment.storageId);
        const sfRecord = await ctx.db
          .query("storageFiles")
          .withIndex("by_storage_id", (q) => q.eq("storageId", attachment.storageId))
          .unique();
        if (sfRecord) await ctx.db.delete(sfRecord._id);
        await ctx.db.delete(attachment._id);
      }

      await ctx.db.delete(cardId);
    }

    return null;
  },
});

/**
 * Update the entire checklist for a card.
 */
export const updateChecklist = mutation({
  args: {
    cardId: v.id("kanbanCards"),
    checklist: v.array(checklistItemValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    await requireBoardAccess(ctx, card.boardId);

    await ctx.db.patch(args.cardId, { checklist: args.checklist });
    return null;
  },
});

/**
 * Toggle a single checklist item's completed state.
 */
export const toggleChecklistItem = mutation({
  args: {
    cardId: v.id("kanbanCards"),
    itemId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    await requireBoardAccess(ctx, card.boardId);

    if (!card.checklist) return null;

    const updatedChecklist = card.checklist.map((item) =>
      item.id === args.itemId ? { ...item, completed: !item.completed } : item,
    );

    await ctx.db.patch(args.cardId, { checklist: updatedChecklist });
    return null;
  },
});
