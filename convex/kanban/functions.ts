import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { kanbanBoardValidator, kanbanColumnValidator, kanbanCardValidator, memberKanbanTeamGroupValidator, DEFAULT_COLUMNS } from ".";
import { getMemberInOrga, memberHasTeamAccess } from "../utils";
import { requireBoardAccess } from "./access";

// ============================================================
// Queries
// ============================================================

/**
 * Check if the authenticated user has access to a team's Kanban board.
 * Returns true if the user is a member of the team, false otherwise.
 * Used by the frontend to skip heavier queries when the user lacks access.
 */
export const checkTeamAccess = query({
  args: { teamId: v.id("teams") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return false;

    const member = await getMemberInOrga(ctx, team.orgaId);
    return await memberHasTeamAccess(ctx, member, args.teamId);
  },
});

/**
 * Get the Kanban board for a team.
 */
export const getBoard = query({
  args: { teamId: v.id("teams") },
  returns: v.union(kanbanBoardValidator, v.null()),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    const member = await getMemberInOrga(ctx, team.orgaId);
    const hasAccess = await memberHasTeamAccess(ctx, member, args.teamId);
    if (!hasAccess) return null;

    return await ctx.db
      .query("kanbanBoards")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .unique();
  },
});

/**
 * Get the full board data (board + columns + cards) in a single query.
 * This is the main loader for the Kanban UI.
 */
export const getBoardWithData = query({
  args: { teamId: v.id("teams") },
  returns: v.union(
    v.object({
      board: kanbanBoardValidator,
      columns: v.array(kanbanColumnValidator),
      cards: v.array(kanbanCardValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    const member = await getMemberInOrga(ctx, team.orgaId);
    const hasAccess = await memberHasTeamAccess(ctx, member, args.teamId);
    if (!hasAccess) return null;

    const board = await ctx.db
      .query("kanbanBoards")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .unique();

    if (!board) return null;

    const columns = await ctx.db
      .query("kanbanColumns")
      .withIndex("by_board_and_position", (q) => q.eq("boardId", board._id))
      .collect();

    const cards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_board", (q) => q.eq("boardId", board._id))
      .collect();

    return { board, columns, cards };
  },
});

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
 * Looks up all roles held by the member, then gathers cards for each role.
 * Used for the member profile view.
 */
export const getCardsByMember = query({
  args: { memberId: v.id("members") },
  returns: v.array(kanbanCardValidator),
  handler: async (ctx, args) => {
    const memberDoc = await ctx.db.get(args.memberId);
    if (!memberDoc) return [];

    await getMemberInOrga(ctx, memberDoc.orgaId);

    // Get all roles held by this member
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    // Gather cards for each role
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
 *
 * For each role held by the member, fetches all kanban cards assigned to
 * that role, resolves the column name and role metadata, then groups
 * everything by team with team name and color.
 */
export const getCardsByMemberWithContext = query({
  args: { memberId: v.id("members") },
  returns: v.array(memberKanbanTeamGroupValidator),
  handler: async (ctx, args) => {
    const memberDoc = await ctx.db.get(args.memberId);
    if (!memberDoc) return [];

    await getMemberInOrga(ctx, memberDoc.orgaId);

    // Get all roles held by this member
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    if (roles.length === 0) return [];

    // Build role lookup
    const roleById = new Map(roles.map((r) => [r._id, r]));

    // Gather all cards across all roles
    const allCards = [];
    for (const role of roles) {
      const cards = await ctx.db
        .query("kanbanCards")
        .withIndex("by_role", (q) => q.eq("roleId", role._id))
        .collect();
      allCards.push(...cards);
    }

    if (allCards.length === 0) return [];

    // Resolve column names (deduplicated)
    const columnIds = [...new Set(allCards.map((c) => c.columnId))];
    const columnById = new Map<Id<"kanbanColumns">, { name: string }>();
    for (const colId of columnIds) {
      const col = await ctx.db.get(colId);
      if (col) columnById.set(colId, { name: col.name });
    }

    // Resolve board -> team mapping (deduplicated)
    const boardIds = [...new Set(allCards.map((c) => c.boardId))];
    const boardById = new Map<Id<"kanbanBoards">, { teamId: Id<"teams"> }>();
    for (const boardId of boardIds) {
      const board = await ctx.db.get(boardId);
      if (board) boardById.set(boardId, { teamId: board.teamId });
    }

    // Resolve team names (deduplicated)
    const teamIds = [...new Set([...boardById.values()].map((b) => b.teamId))];
    const teamById = new Map<Id<"teams">, { name: string; color?: string }>();
    for (const teamId of teamIds) {
      const team = await ctx.db.get(teamId);
      if (team) teamById.set(teamId, { name: team.name, color: team.color });
    }

    // Group cards by team
    const teamGroups = new Map<Id<"teams">, typeof allCards>();
    for (const card of allCards) {
      const board = boardById.get(card.boardId);
      if (!board) continue;
      const group = teamGroups.get(board.teamId) ?? [];
      group.push(card);
      teamGroups.set(board.teamId, group);
    }

    // Build result
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

      // Sort cards by column position, then card position within column
      enrichedCards.sort((a, b) => a.position - b.position);

      result.push({
        teamId,
        teamName: team.name,
        teamColor: team.color,
        cards: enrichedCards,
      });
    }

    // Sort teams alphabetically
    result.sort((a, b) => a.teamName.localeCompare(b.teamName));

    return result;
  },
});

// ============================================================
// Mutations
// ============================================================

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
  },
  returns: v.id("kanbanCards"),
  handler: async (ctx, args) => {
    const { board } = await requireBoardAccess(ctx, args.boardId);

    // Verify column belongs to this board
    const column = await ctx.db.get(args.columnId);
    if (!column || column.boardId !== args.boardId) {
      throw new Error("Column not found on this board");
    }

    // Verify role belongs to the board's team
    const role = await ctx.db.get(args.roleId);
    if (!role || role.orgaId !== board.orgaId) {
      throw new Error("Role must belong to the same organization");
    }
    if (role.teamId !== board.teamId) {
      throw new Error("Role must belong to the board's team");
    }

    // Calculate position: place at end of column
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
    });
  },
});

/**
 * Update card details (title, role, due date, comments).
 */
export const updateCard = mutation({
  args: {
    cardId: v.id("kanbanCards"),
    title: v.optional(v.string()),
    roleId: v.optional(v.id("roles")),
    dueDate: v.optional(v.number()),
    comments: v.optional(v.string()),
  },
  returns: v.id("kanbanCards"),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const { board } = await requireBoardAccess(ctx, card.boardId);

    // Verify new role if provided
    if (args.roleId !== undefined) {
      const role = await ctx.db.get(args.roleId);
      if (!role || role.orgaId !== board.orgaId) {
        throw new Error("Role must belong to the same organization");
      }
      if (role.teamId !== board.teamId) {
        throw new Error("Role must belong to the board's team");
      }
    }

    const updates: Partial<{
      title: string;
      roleId: Id<"roles">;
      dueDate: number;
      comments: string;
    }> = {};

    if (args.title !== undefined) updates.title = args.title;
    if (args.roleId !== undefined) updates.roleId = args.roleId;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.comments !== undefined) updates.comments = args.comments;

    await ctx.db.patch(args.cardId, updates);
    return args.cardId;
  },
});

/**
 * Move a card to a different column and/or position (drag and drop).
 * Uses fractional indexing: position is the midpoint between neighbors.
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

    // Verify target column belongs to the same board
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
 * Delete a card permanently.
 */
export const deleteCard = mutation({
  args: { cardId: v.id("kanbanCards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    await requireBoardAccess(ctx, card.boardId);

    await ctx.db.delete(args.cardId);
    return null;
  },
});

/**
 * Reorder columns on a board.
 */
export const reorderColumns = mutation({
  args: {
    boardId: v.id("kanbanBoards"),
    columnOrder: v.array(v.id("kanbanColumns")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireBoardAccess(ctx, args.boardId);

    // Update board column order
    await ctx.db.patch(args.boardId, { columnOrder: args.columnOrder });

    // Update individual column positions to match the order
    for (let i = 0; i < args.columnOrder.length; i++) {
      await ctx.db.patch(args.columnOrder[i], { position: i });
    }

    return null;
  },
});

// ============================================================
// Column Management (A1: Custom Columns)
// ============================================================

/**
 * Add a new column to a board.
 * Appends it at the end of the column order.
 */
export const addColumn = mutation({
  args: {
    boardId: v.id("kanbanBoards"),
    name: v.string(),
  },
  returns: v.id("kanbanColumns"),
  handler: async (ctx, args) => {
    const { board } = await requireBoardAccess(ctx, args.boardId);

    if (!args.name.trim()) {
      throw new Error("Column name cannot be empty");
    }

    // Calculate next position
    const existingColumns = await ctx.db
      .query("kanbanColumns")
      .withIndex("by_board_and_position", (q) => q.eq("boardId", args.boardId))
      .collect();

    const maxPosition =
      existingColumns.length > 0
        ? Math.max(...existingColumns.map((c) => c.position))
        : -1;

    const columnId = await ctx.db.insert("kanbanColumns", {
      boardId: args.boardId,
      orgaId: board.orgaId,
      name: args.name.trim(),
      position: maxPosition + 1,
    });

    // Update board column order
    await ctx.db.patch(args.boardId, {
      columnOrder: [...board.columnOrder, columnId],
    });

    return columnId;
  },
});

/**
 * Rename a column.
 */
export const renameColumn = mutation({
  args: {
    columnId: v.id("kanbanColumns"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) throw new Error("Column not found");

    await requireBoardAccess(ctx, column.boardId);

    if (!args.name.trim()) {
      throw new Error("Column name cannot be empty");
    }

    await ctx.db.patch(args.columnId, { name: args.name.trim() });
    return null;
  },
});

/**
 * Delete a column and all its cards.
 * Removes the column from the board's columnOrder array.
 */
export const deleteColumn = mutation({
  args: {
    columnId: v.id("kanbanColumns"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) throw new Error("Column not found");

    const { board } = await requireBoardAccess(ctx, column.boardId);

    // Delete all cards in this column
    const cards = await ctx.db
      .query("kanbanCards")
      .withIndex("by_column", (q) => q.eq("columnId", args.columnId))
      .collect();

    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    // Remove column from board's columnOrder
    const newOrder = board.columnOrder.filter((id) => id !== args.columnId);
    await ctx.db.patch(board._id, { columnOrder: newOrder });

    // Delete the column itself
    await ctx.db.delete(args.columnId);

    return null;
  },
});

// ============================================================
// Column WIP Limits (A2)
// ============================================================

/**
 * Set or clear the WIP limit for a column.
 * Pass null or 0 to clear the limit.
 */
export const setColumnWipLimit = mutation({
  args: {
    columnId: v.id("kanbanColumns"),
    wipLimit: v.union(v.number(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) throw new Error("Column not found");

    await requireBoardAccess(ctx, column.boardId);

    const limit = args.wipLimit && args.wipLimit > 0 ? args.wipLimit : undefined;
    await ctx.db.patch(args.columnId, { wipLimit: limit });

    return null;
  },
});

// ============================================================
// Bulk Card Actions (A5)
// ============================================================

/**
 * Move multiple cards to a target column at once.
 * Cards are appended to the end of the target column in order.
 */
export const bulkMoveCards = mutation({
  args: {
    cardIds: v.array(v.id("kanbanCards")),
    targetColumnId: v.id("kanbanColumns"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.cardIds.length === 0) return null;

    // Verify access via the first card's board
    const firstCard = await ctx.db.get(args.cardIds[0]);
    if (!firstCard) throw new Error("Card not found");

    await requireBoardAccess(ctx, firstCard.boardId);

    // Verify target column belongs to the same board
    const targetColumn = await ctx.db.get(args.targetColumnId);
    if (!targetColumn || targetColumn.boardId !== firstCard.boardId) {
      throw new Error("Target column not found on this board");
    }

    // Get the current max position in the target column
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

    // Verify access via the first card's board
    const firstCard = await ctx.db.get(args.cardIds[0]);
    if (!firstCard) throw new Error("Card not found");

    await requireBoardAccess(ctx, firstCard.boardId);

    for (const cardId of args.cardIds) {
      const card = await ctx.db.get(cardId);
      if (!card) continue;
      if (card.boardId !== firstCard.boardId) continue;

      await ctx.db.delete(cardId);
    }

    return null;
  },
});

/**
 * Ensure a Kanban board exists for a team, creating one with default columns if needed.
 * Called by the frontend when no board is found.
 */
export const ensureBoard = mutation({
  args: { teamId: v.id("teams") },
  returns: v.id("kanbanBoards"),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    await getMemberInOrga(ctx, team.orgaId);
    const member = await getMemberInOrga(ctx, team.orgaId);
    const hasAccess = await memberHasTeamAccess(ctx, member, args.teamId);
    if (!hasAccess) throw new Error("Not a member of this team");

    // Check if board already exists (race condition guard)
    const existing = await ctx.db
      .query("kanbanBoards")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .unique();

    if (existing) return existing._id;

    // Create board with default columns
    const boardId = await ctx.db.insert("kanbanBoards", {
      teamId: args.teamId,
      orgaId: team.orgaId,
      columnOrder: [],
    });

    const columnIds: Id<"kanbanColumns">[] = [];
    for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
      const columnId = await ctx.db.insert("kanbanColumns", {
        boardId,
        orgaId: team.orgaId,
        name: DEFAULT_COLUMNS[i],
        position: i,
      });
      columnIds.push(columnId);
    }

    await ctx.db.patch(boardId, { columnOrder: columnIds });
    return boardId;
  },
});

// ============================================================
// Internal mutations
// ============================================================

/**
 * Backfill Kanban boards for existing teams that don't have one yet.
 * Run once after initial deployment via the Convex dashboard.
 */
export const backfillBoards = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    let created = 0;

    for (const team of teams) {
      const existing = await ctx.db
        .query("kanbanBoards")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .unique();

      if (!existing) {
        const boardId = await ctx.db.insert("kanbanBoards", {
          teamId: team._id,
          orgaId: team.orgaId,
          columnOrder: [],
        });

        const columnIds: Id<"kanbanColumns">[] = [];
        for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
          const columnId = await ctx.db.insert("kanbanColumns", {
            boardId,
            orgaId: team.orgaId,
            name: DEFAULT_COLUMNS[i],
            position: i,
          });
          columnIds.push(columnId);
        }

        await ctx.db.patch(boardId, { columnOrder: columnIds });
        created++;
      }
    }

    return created;
  },
});

/**
 * Migrate existing kanban cards from ownerId (member) to roleId (role).
 * For each card with an ownerId, finds a matching role in the board's team
 * held by that member. Flags cards where no matching role is found.
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
      // Skip cards that already have roleId (already migrated)
      if ((card as Record<string, unknown>).roleId) continue;

      const ownerId = (card as Record<string, unknown>).ownerId as Id<"members"> | undefined;
      if (!ownerId) {
        flagged++;
        continue;
      }

      // Get the board to find the team
      const board = await ctx.db.get(card.boardId);
      if (!board) {
        flagged++;
        continue;
      }

      // Find roles in this team held by the card's owner
      const memberRoles = await ctx.db
        .query("roles")
        .withIndex("by_member", (q) => q.eq("memberId", ownerId))
        .collect();

      const teamRoles = memberRoles.filter((r) => r.teamId === board.teamId);

      if (teamRoles.length === 0) {
        // Fallback: assign any role in the team
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
          // No roles in the team at all — delete orphaned card
          await ctx.db.delete(card._id);
          flagged++;
        }
        continue;
      }

      // Pick a non-special role first, fall back to the first available
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

// ============================================================
// Due Date Notifications (E1)
// ============================================================

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Check all kanban cards for approaching or overdue due dates and
 * send notifications to the role holders. Called periodically by a cron job.
 *
 * For each card:
 * - If due date is within 24 hours from now and not yet notified -> "approaching"
 * - If due date has passed and not yet notified -> "overdue"
 *
 * Deduplication uses the notification `groupKey` field:
 *   "kanban_due:{cardId}:approaching" or "kanban_due:{cardId}:overdue"
 * Before creating a notification, we check if one already exists with that key.
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

    // Get all kanban cards across all boards
    const allCards = await ctx.db.query("kanbanCards").collect();

    for (const card of allCards) {
      // Determine notification type
      let dueType: "approaching" | "overdue" | null = null;

      if (card.dueDate < now) {
        dueType = "overdue";
      } else if (card.dueDate <= oneDayFromNow) {
        dueType = "approaching";
      }

      if (!dueType) continue;

      // Check if we already sent this exact notification (dedup via groupKey)
      const groupKey = `kanban_due:${card._id}:${dueType}`;
      const existingNotification = await ctx.db
        .query("notifications")
        .withIndex("by_group_key", (q) => q.eq("groupKey", groupKey))
        .first();

      if (existingNotification) {
        skipped++;
        continue;
      }

      // Resolve role -> member -> user
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

      // Resolve team name for the notification message
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

      // Create the notification via the internal create mutation
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
