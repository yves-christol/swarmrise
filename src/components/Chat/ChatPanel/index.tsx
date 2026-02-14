import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { useChatStore } from "../../../tools/chatStore/hooks";
import { useOrgaStore } from "../../../tools/orgaStore/hooks";
import { ChannelList } from "../ChannelList";
import { MessageList } from "../MessageList";
import { MessageInput } from "../MessageInput";
import { ThreadPanel } from "../ThreadPanel";

export const ChatPanel = () => {
  const { t } = useTranslation("chat");
  const { isSignedIn } = useAuth();
  const { selectedOrgaId, selectedOrga } = useOrgaStore();
  const { isChatOpen, closeChat, selectedChannelId, activeThreadMessageId, closeThread, isChatExpanded, toggleChatExpand } = useChatStore();

  const channels = useQuery(
    api.chat.functions.getChannelsForMember,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  );

  // Handle Escape key: close thread first, then close chat
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeThreadMessageId) {
          closeThread();
        } else {
          closeChat();
        }
      }
    },
    [activeThreadMessageId, closeThread, closeChat]
  );

  useEffect(() => {
    if (isChatOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isChatOpen, handleKeyDown]);

  if (!isChatOpen || !isSignedIn || !selectedOrga) {
    return null;
  }

  // Find the selected channel to get its info
  const selectedChannel = channels?.find((c) => c._id === selectedChannelId);
  const channelName = selectedChannel
    ? selectedChannel.kind === "orga"
      ? t("orgaChannel")
      : selectedChannel.name
    : "";

  const panelWidthClass = isChatExpanded
    ? "w-full"
    : "w-full sm:w-[400px]";

  const panel = (
    <div
      className={`fixed top-0 right-0 h-full ${panelWidthClass} z-40 flex flex-col bg-light dark:bg-dark border-l border-slate-200 dark:border-slate-700 shadow-xl animate-slide-in-right`}
      role="complementary"
      aria-label={t("chat")}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <h2 className="text-sm font-semibold text-dark dark:text-light truncate">
          {activeThreadMessageId ? t("inThread") : selectedChannelId ? channelName : t("chat")}
        </h2>
        <div className="flex items-center gap-1">
          {/* Expand / Collapse toggle (hidden on mobile where panel is always full-width) */}
          <button
            onClick={toggleChatExpand}
            className="hidden sm:inline-flex p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-gray-400"
            aria-label={isChatExpanded ? t("collapseChat") : t("expandChat")}
            title={isChatExpanded ? t("collapseChat") : t("expandChat")}
          >
            {isChatExpanded ? (
              /* Collapse icon: arrows pointing inward */
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              /* Expand icon: arrows pointing outward */
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
          <button
            onClick={closeChat}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-gray-400"
            aria-label={t("closeChat")}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body: Channel list + Messages */}
      <div className="flex-1 flex min-h-0">
        {/* Channel sidebar */}
        <div className={`${isChatExpanded ? "w-[220px]" : "w-[160px]"} shrink-0 border-r border-slate-200 dark:border-slate-700 overflow-y-auto hidden sm:block`}>
          <ChannelList />
        </div>

        {/* Message area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {selectedChannelId && activeThreadMessageId ? (
            <ThreadPanel
              messageId={activeThreadMessageId}
              channelId={selectedChannelId}
              orgaId={selectedOrgaId!}
              onClose={closeThread}
            />
          ) : selectedChannelId ? (
            <>
              <MessageList channelId={selectedChannelId} orgaId={selectedOrgaId!} />
              <MessageInput
                channelId={selectedChannelId}
                orgaId={selectedOrgaId!}
                isArchived={selectedChannel?.isArchived ?? false}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              {t("channels")}
            </div>
          )}
        </div>
      </div>

      {/* Mobile channel list (shown when no channel selected on small screens) */}
      <div className="sm:hidden">
        {!selectedChannelId && (
          <div className="absolute inset-0 top-[49px] bg-light dark:bg-dark overflow-y-auto">
            <ChannelList />
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
};
