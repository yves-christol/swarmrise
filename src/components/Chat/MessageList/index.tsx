import { useRef, useEffect, useCallback, useState } from "react";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useChatStore } from "../../../tools/chatStore/hooks";
import { MessageItem } from "./MessageItem";

type MessageListProps = {
  channelId: Id<"channels">;
};

const GROUPING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function formatDateSeparator(timestamp: number, todayLabel: string, yesterdayLabel: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return todayLabel;
  if (date.toDateString() === yesterday.toDateString()) return yesterdayLabel;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

export const MessageList = ({ channelId }: MessageListProps) => {
  const { t } = useTranslation("chat");
  const { openThread } = useChatStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewIndicator, setShowNewIndicator] = useState(false);
  const prevPageLengthRef = useRef(0);

  const markAsRead = useMutation(api.chat.functions.markAsRead);

  const { results, status, loadMore } = usePaginatedQuery(
    api.chat.functions.getMessages,
    { channelId },
    { initialNumItems: 30 }
  );

  // Messages come newest-first from Convex, reverse for chronological display
  const messages = [...(results ?? [])].reverse();

  // Get thread reply counts for visible messages
  const messageIds = messages.map((m) => m._id);
  const threadCounts = useQuery(
    api.chat.functions.getThreadCounts,
    messageIds.length > 0 ? { channelId, messageIds } : "skip"
  );

  const getReplyCount = (messageId: Id<"messages">) => {
    return threadCounts?.find((tc) => tc.messageId === messageId)?.replyCount ?? 0;
  };

  // Mark channel as read when viewing it
  useEffect(() => {
    markAsRead({ channelId }).catch(() => {});
  }, [channelId, markAsRead]);

  // Also mark as read when new messages arrive and user is at bottom
  useEffect(() => {
    if (isAtBottom && messages.length > prevPageLengthRef.current) {
      markAsRead({ channelId }).catch(() => {});
    }
    prevPageLengthRef.current = messages.length;
  }, [messages.length, isAtBottom, channelId, markAsRead]);

  // Scroll to bottom on initial load and new messages (if at bottom)
  useEffect(() => {
    if (isAtBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    } else if (!isAtBottom && messages.length > prevPageLengthRef.current) {
      setShowNewIndicator(true);
    }
  }, [messages.length, isAtBottom]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsAtBottom(atBottom);

    if (atBottom) {
      setShowNewIndicator(false);
    }

    // Load more when scrolling near the top
    if (scrollTop < 100 && status === "CanLoadMore") {
      loadMore(20);
    }
  }, [status, loadMore]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewIndicator(false);
  }, []);

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        {t("loadingMessages")}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 px-4 text-center">
        {t("noMessages")}
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto"
      >
        {status === "LoadingMore" && (
          <div className="py-2 text-center text-xs text-gray-400 dark:text-gray-500">
            {t("loadingMessages")}
          </div>
        )}
        {messages.map((msg, idx) => {
          const prevMsg = idx > 0 ? messages[idx - 1] : null;

          // Date separator
          const showDateSeparator = !prevMsg || !isSameDay(prevMsg._creationTime, msg._creationTime);

          // Message grouping: same author within 5 minutes
          const isCompact =
            !showDateSeparator &&
            prevMsg !== null &&
            prevMsg.authorId === msg.authorId &&
            msg._creationTime - prevMsg._creationTime < GROUPING_THRESHOLD_MS;

          return (
            <div key={msg._id}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {formatDateSeparator(msg._creationTime, t("today"), t("yesterday"))}
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>
              )}
              <MessageItem
                message={msg}
                isCompact={isCompact}
                replyCount={getReplyCount(msg._id)}
                onReply={openThread}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* New messages indicator */}
      {showNewIndicator && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs font-medium bg-[#eac840] text-dark rounded-full shadow-md hover:bg-[#d4b435] transition-colors"
        >
          {t("newMessages")}
        </button>
      )}
    </div>
  );
};
