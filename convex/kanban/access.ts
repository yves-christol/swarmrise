import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getMemberInOrga } from "../utils";
import { memberHasTeamAccess } from "../chat/access";
import type { KanbanBoard } from ".";
import type { Member } from "../members";

/**
 * Verify that the authenticated user has access to a Kanban board.
 * Returns the board and the member document.
 * Throws if access is denied.
 */
export async function requireBoardAccess(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<"kanbanBoards">,
): Promise<{ board: KanbanBoard; member: Member }> {
  const board = await ctx.db.get(boardId);
  if (!board) throw new Error("Board not found");

  const member = await getMemberInOrga(ctx, board.orgaId);

  const hasAccess = await memberHasTeamAccess(ctx, member, board.teamId);
  if (!hasAccess) throw new Error("Not a member of this team");

  return { board, member };
}
