import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { TopicTool } from "../TopicTool";
import { VotingTool } from "../VotingTool";
import { ElectionTool } from "../ElectionTool";
import { ReactionBar, ReactionButton } from "../Reactions";
import { MessageText } from "./MessageText";
import { extractMentionIds } from "../MessageInput/useMentionInput";
import type { EmbeddedVoting } from "../VotingTool";
import type { EmbeddedElection } from "../ElectionTool";

type EmbeddedTool = {
  type: "topic";
  title: string;
  description: string;
  phase: "proposition" | "clarification" | "consent" | "resolved";
  outcome?: "accepted" | "modified" | "withdrawn";
  decisionId?: Id<"decisions">;
} | {
  type: "voting";
  question: string;
  options: { id: string; label: string }[];
  mode: "single" | "approval" | "ranked";
  isAnonymous: boolean;
  deadline?: number;
  isClosed: boolean;
} | {
  type: "election";
  roleTitle: string;
  roleId?: Id<"roles">;
  teamId: Id<"teams">;
  phase: "nomination" | "discussion" | "change_round" | "consent" | "elected" | "cancelled";
  proposedCandidateId?: Id<"members">;
  electedMemberId?: Id<"members">;
  outcome?: "elected" | "no_election";
  decisionId?: Id<"decisions">;
};

type ReactionGroup = {
  emoji: string;
  count: number;
  reacted: boolean;
  memberNames: string[];
};

type MessageItemProps = {
  message: {
    _id: Id<"messages">;
    _creationTime: number;
    authorId: Id<"members">;
    text: string;
    isEdited: boolean;
    embeddedTool?: EmbeddedTool;
    author: {
      firstname: string;
      surname: string;
      pictureURL?: string;
    };
  };
  isCompact: boolean;
  replyCount?: number;
  onReply?: (messageId: Id<"messages">) => void;
  currentMemberId?: Id<"members">;
  reactions?: ReactionGroup[];
  isLastOwnMessage?: boolean;
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Portaled delete confirmation dialog.
 */
const DeleteConfirmDialog = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation("chat");

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-4 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-dark dark:text-light mb-4">
          {t("deleteMessageConfirm")}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {t("deleteMessageCancel")}
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
          >
            {t("deleteMessageYes")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const MessageItem = ({ message, isCompact, replyCount, onReply, currentMemberId, reactions, isLastOwnMessage }: MessageItemProps) => {
  const { t } = useTranslation("chat");
  const initials = `${message.author.firstname[0] ?? ""}${message.author.surname[0] ?? ""}`.toUpperCase();
  const messageReactions = reactions ?? [];

  const isAuthor = currentMemberId === message.authorId;
  const topicTool = message.embeddedTool?.type === "topic" ? message.embeddedTool : null;
  const votingTool = message.embeddedTool?.type === "voting" ? (message.embeddedTool as EmbeddedVoting) : null;
  const electionTool = message.embeddedTool?.type === "election" ? (message.embeddedTool as EmbeddedElection) : null;
  const hasEmbeddedTool = topicTool || votingTool || electionTool;

  // Edit/Delete state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editMessage = useMutation(api.chat.functions.editMessage);
  const deleteMessage = useMutation(api.chat.functions.deleteMessage);

  // Focus and size textarea when entering edit mode
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = "auto";
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
      // Move cursor to end
      const len = editTextareaRef.current.value.length;
      editTextareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    setEditText(message.text);
    setIsEditing(true);
  }, [message.text]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText(message.text);
  }, [message.text]);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.text) {
      handleCancelEdit();
      return;
    }
    const mentions = extractMentionIds(trimmed);
    void editMessage({
      messageId: message._id,
      text: trimmed,
      mentions: mentions.length > 0 ? mentions : undefined,
    })
      .then(() => setIsEditing(false))
      .catch((error) => {
        console.error("Failed to edit message:", error);
      });
  }, [editText, message._id, message.text, editMessage, handleCancelEdit]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
      }
      if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  const handleEditChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    void deleteMessage({ messageId: message._id })
      .then(() => setShowDeleteConfirm(false))
      .catch((error) => {
        console.error("Failed to delete message:", error);
        setShowDeleteConfirm(false);
      });
  }, [message._id, deleteMessage]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Can edit/delete: is author AND no embedded tool
  const canEditOrDelete = isAuthor && !hasEmbeddedTool;

  // Listen for Up Arrow edit shortcut (only on the last own message)
  useEffect(() => {
    if (!isLastOwnMessage || !canEditOrDelete) return;
    const handler = () => {
      setEditText(message.text);
      setIsEditing(true);
    };
    document.addEventListener("chat:edit-last-message", handler);
    return () => document.removeEventListener("chat:edit-last-message", handler);
  }, [isLastOwnMessage, canEditOrDelete, message.text]);

  // Inline edit area (replaces text when editing)
  const editArea = (
    <div className="mt-0.5">
      <textarea
        ref={editTextareaRef}
        value={editText}
        onChange={handleEditChange}
        onKeyDown={handleEditKeyDown}
        rows={1}
        className="w-full resize-none bg-slate-100 dark:bg-slate-800 text-dark dark:text-light rounded-lg px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
        style={{ maxHeight: "160px" }}
      />
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={handleSaveEdit}
          className="px-2.5 py-1 text-xs font-medium bg-[#eac840] text-dark rounded-md hover:bg-[#d4b435] transition-colors"
        >
          {t("editMessageSave")}
        </button>
        <button
          onClick={handleCancelEdit}
          className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {t("editMessageCancel")}
        </button>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {t("editMessageHint")}
        </span>
      </div>
    </div>
  );

  // Author action buttons (edit/delete) - shown on hover in the action row
  const authorActions = canEditOrDelete && !isEditing && (
    <>
      <button
        onClick={handleStartEdit}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {t("editMessage")}
      </button>
      <button
        onClick={handleDelete}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {t("deleteMessage")}
      </button>
    </>
  );

  const threadIndicator = onReply && (
    <div className="flex items-center gap-2 mt-1">
      {replyCount !== undefined && replyCount > 0 && (
        <button
          onClick={() => onReply(message._id)}
          className="text-xs text-[#996800] dark:text-[#eac840] hover:underline"
        >
          {t("replies", { count: replyCount })}
        </button>
      )}
      <button
        onClick={() => onReply(message._id)}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {t("reply")}
      </button>
      <ReactionButton messageId={message._id} />
      {authorActions}
    </div>
  );

  // For messages without an onReply (i.e. thread replies), show edit/delete actions inline
  const standaloneActions = !onReply && canEditOrDelete && !isEditing && (
    <div className="flex items-center gap-2 mt-1">
      {authorActions}
    </div>
  );

  // Reaction bar shown below content when there are existing reactions,
  // or on hover to allow adding a first reaction.
  const reactionBar = (
    <ReactionBar
      messageId={message._id}
      reactions={messageReactions}
      showAddButton={!onReply}
    />
  );

  // Edited indicator
  const editedIndicator = message.isEdited && (
    <span className="text-xs text-gray-400 dark:text-gray-500 italic">
      ({t("edited")})
    </span>
  );

  if (isCompact) {
    return (
      <div className="group flex items-start gap-3 px-3 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <div className="w-8 shrink-0 flex items-center justify-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message._creationTime)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          {!hasEmbeddedTool && !isEditing && (
            <p className="text-sm text-dark dark:text-light whitespace-pre-wrap break-words">
              <MessageText text={message.text} />
              {message.isEdited && (
                <> <span className="text-xs text-gray-400 dark:text-gray-500 italic">({t("edited")})</span></>
              )}
            </p>
          )}
          {!hasEmbeddedTool && isEditing && editArea}
          {topicTool && <TopicTool messageId={message._id} tool={topicTool} />}
          {votingTool && <VotingTool messageId={message._id} tool={votingTool} />}
          {electionTool && <ElectionTool messageId={message._id} tool={electionTool} isAuthor={isAuthor} />}
          {reactionBar}
          {threadIndicator}
          {standaloneActions}
        </div>
        {showDeleteConfirm && (
          <DeleteConfirmDialog onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />
        )}
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div className="w-8 h-8 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center overflow-hidden">
        {message.author.pictureURL ? (
          <img
            src={message.author.pictureURL}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {initials}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-dark dark:text-light">
            {message.author.firstname} {message.author.surname}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatTime(message._creationTime)}
          </span>
          {editedIndicator}
        </div>
        {!hasEmbeddedTool && !isEditing && (
          <p className="text-sm text-dark dark:text-light whitespace-pre-wrap break-words">
            <MessageText text={message.text} />
          </p>
        )}
        {!hasEmbeddedTool && isEditing && editArea}
        {topicTool && <TopicTool messageId={message._id} tool={topicTool} />}
        {votingTool && <VotingTool messageId={message._id} tool={votingTool} />}
        {electionTool && <ElectionTool messageId={message._id} tool={electionTool} isAuthor={isAuthor} />}
        {reactionBar}
        {threadIndicator}
        {standaloneActions}
      </div>
      {showDeleteConfirm && (
        <DeleteConfirmDialog onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />
      )}
    </div>
  );
};
