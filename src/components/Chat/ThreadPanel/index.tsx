import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { MessageItem } from "../MessageList/MessageItem";
import { MentionAutocomplete } from "../MessageInput/MentionAutocomplete";
import { useMentionInput, extractMentionIds } from "../MessageInput/useMentionInput";

type ThreadPanelProps = {
  messageId: Id<"messages">;
  channelId: Id<"channels">;
  orgaId: Id<"orgas">;
  onClose: () => void;
};

export const ThreadPanel = ({ messageId, channelId, orgaId, onClose }: ThreadPanelProps) => {
  const { t } = useTranslation("chat");
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const myMember = useQuery(api.members.functions.getMyMember, { orgaId });
  const currentMemberId = myMember?._id;

  const parentMessage = useQuery(api.chat.functions.getMessageById, { messageId });
  const replies = useQuery(api.chat.functions.getThreadReplies, { messageId });
  const sendThreadReply = useMutation(api.chat.functions.sendThreadReply);

  // Fetch org members for @mention autocomplete
  const members = useQuery(api.members.functions.listMembers, { orgaId });

  // Mention autocomplete hook
  const {
    showMentionAutocomplete,
    mentionFilter,
    mentionPosition,
    handleTextChange,
    handleMentionSelect,
    closeMentionAutocomplete,
    resolveText,
  } = useMentionInput();

  // Collect all message IDs (parent + replies) for batch reaction query
  const allMessageIds = [
    messageId,
    ...(replies ?? []).map((r) => r._id),
  ];
  const reactionsData = useQuery(
    api.chat.functions.getReactionsForMessages,
    allMessageIds.length > 0 ? { messageIds: allMessageIds } : "skip"
  );

  const getReactions = (msgId: Id<"messages">) => {
    return reactionsData?.find((r) => r.messageId === msgId)?.reactions ?? [];
  };

  // Focus reply input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Scroll to bottom when new replies arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [replies?.length]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Resolve @Name display text to @[Name](id) storage syntax
    const resolvedText = resolveText(trimmed);
    const mentions = extractMentionIds(resolvedText);

    void sendThreadReply({
      channelId,
      threadParentId: messageId,
      text: resolvedText,
      mentions: mentions.length > 0 ? mentions : undefined,
    })
      .then(() => {
        setText("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      })
      .catch((error) => {
        console.error("Failed to send thread reply:", error);
      });
  }, [text, channelId, messageId, sendThreadReply, resolveText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // When mention autocomplete is open, let it handle Enter/Tab/Arrow keys
      if (showMentionAutocomplete) {
        if (e.key === "Enter" || e.key === "Tab" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Escape") {
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, showMentionAutocomplete]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    // Notify mention hook about text change
    handleTextChange(newText, e.target);

    const textarea = e.target;
    textarea.style.height = "auto";
    const maxHeight = 80;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [handleTextChange]);

  // Close mention autocomplete when clicking outside
  useEffect(() => {
    if (!showMentionAutocomplete) return;
    const handleClick = () => {
      closeMentionAutocomplete();
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [showMentionAutocomplete, closeMentionAutocomplete]);

  // Map members to autocomplete options
  const memberOptions = (members ?? []).map((m) => ({
    _id: m._id,
    firstname: m.firstname,
    surname: m.surname,
    pictureURL: m.pictureURL,
  }));

  return (
    <div className="flex flex-col h-full bg-surface-primary">
      {/* Thread header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default shrink-0">
        <span className="text-sm font-semibold text-dark dark:text-light">{t("thread")}</span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-surface-hover-strong transition-colors text-text-secondary"
          aria-label={t("closeThread")}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Parent message */}
      <div className="border-b border-border-default bg-surface-secondary">
        {parentMessage ? (
          <MessageItem message={parentMessage} isCompact={false} currentMemberId={currentMemberId} reactions={getReactions(parentMessage._id)} />
        ) : (
          <div className="p-3 text-sm text-text-secondary text-center">
            {t("loadingMessages")}
          </div>
        )}
      </div>

      {/* Replies */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {replies === undefined ? (
          <div className="p-3 text-sm text-text-secondary text-center">
            {t("loadingMessages")}
          </div>
        ) : replies.length === 0 ? (
          <div className="p-3 text-sm text-text-secondary text-center">
            {t("noReplies")}
          </div>
        ) : (
          replies.map((reply, idx) => {
            const prevReply = idx > 0 ? replies[idx - 1] : null;
            const isCompact =
              prevReply !== null &&
              prevReply.authorId === reply.authorId &&
              reply._creationTime - prevReply._creationTime < 5 * 60 * 1000;
            return <MessageItem key={reply._id} message={reply} isCompact={isCompact} currentMemberId={currentMemberId} reactions={getReactions(reply._id)} />;
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="p-3 border-t border-border-default shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t("reply")}
            rows={1}
            className="flex-1 resize-none bg-surface-secondary text-dark dark:text-light rounded-lg px-3 py-2 text-sm placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            style={{ maxHeight: "80px" }}
          />
          {text.trim().length > 0 && (
            <button
              onClick={handleSend}
              className="shrink-0 p-2 rounded-lg bg-highlight text-dark hover:bg-highlight-hover transition-colors focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1"
              aria-label={t("sendMessage")}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mention autocomplete dropdown */}
      {showMentionAutocomplete && textareaRef.current && (
        <MentionAutocomplete
          members={memberOptions}
          filter={mentionFilter}
          position={mentionPosition}
          onSelect={(member) => {
            if (textareaRef.current) {
              handleMentionSelect(member, setText, textareaRef.current);
            }
          }}
          onClose={closeMentionAutocomplete}
        />
      )}
    </div>
  );
};
