import { useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { useChatStore } from "../../tools/chatStore/hooks";
import { useOrgaStore } from "../../tools/orgaStore/hooks";

const ChatIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const ChatToggle = () => {
  const { t } = useTranslation("chat");
  const { isSignedIn } = useAuth();
  const { selectedOrgaId, selectedOrga } = useOrgaStore();
  const { isChatOpen, toggleChat } = useChatStore();

  const unreadCounts = useQuery(
    api.chat.functions.getUnreadCounts,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  );

  if (!isSignedIn || !selectedOrga) {
    return null;
  }

  const totalUnread = unreadCounts?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
  const displayCount = totalUnread > 9 ? "9+" : totalUnread.toString();
  const ariaLabel = totalUnread === 0
    ? t("noChatNotifications")
    : t("chatNotifications", { count: totalUnread });

  return (
    <button
      onClick={toggleChat}
      className={`relative p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-2 focus:ring-offset-light dark:focus:ring-offset-dark ${
        isChatOpen
          ? "bg-surface-tertiary"
          : "hover:bg-surface-hover-strong"
      }`}
      aria-label={ariaLabel}
      aria-pressed={isChatOpen}
    >
      <ChatIcon className="w-5 h-5 text-text-description" />
      {totalUnread > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center text-xs font-bold bg-highlight text-dark rounded-full px-1.5 ring-2 ring-white dark:ring-dark"
          aria-hidden="true"
        >
          {displayCount}
        </span>
      )}
    </button>
  );
};
