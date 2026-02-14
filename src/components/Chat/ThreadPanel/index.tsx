import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { MessageItem } from "../MessageList/MessageItem";

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

  // Scroll to bottom when new replies arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [replies?.length]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    void sendThreadReply({ channelId, threadParentId: messageId, text: trimmed })
      .then(() => {
        setText("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      })
      .catch((error) => {
        console.error("Failed to send thread reply:", error);
      });
  }, [text, channelId, messageId, sendThreadReply]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    const maxHeight = 80;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, []);

  return (
    <div className="flex flex-col h-full bg-light dark:bg-dark">
      {/* Thread header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <span className="text-sm font-semibold text-dark dark:text-light">{t("thread")}</span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-gray-400"
          aria-label={t("closeThread")}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Parent message */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
        {parentMessage ? (
          <MessageItem message={parentMessage} isCompact={false} currentMemberId={currentMemberId} reactions={getReactions(parentMessage._id)} />
        ) : (
          <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
            {t("loadingMessages")}
          </div>
        )}
      </div>

      {/* Replies */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {replies === undefined ? (
          <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
            {t("loadingMessages")}
          </div>
        ) : replies.length === 0 ? (
          <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
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
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t("reply")}
            rows={1}
            className="flex-1 resize-none bg-slate-100 dark:bg-slate-800 text-dark dark:text-light rounded-lg px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            style={{ maxHeight: "80px" }}
          />
          {text.trim().length > 0 && (
            <button
              onClick={handleSend}
              className="shrink-0 p-2 rounded-lg bg-[#eac840] text-dark hover:bg-[#d4b435] transition-colors focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:ring-offset-1"
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
    </div>
  );
};
