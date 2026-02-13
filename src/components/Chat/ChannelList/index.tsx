import { useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useOrgaStore } from "../../../tools/orgaStore/hooks";
import { useChatStore } from "../../../tools/chatStore/hooks";
import { useEffect } from "react";

export const ChannelList = () => {
  const { t } = useTranslation("chat");
  const { isSignedIn } = useAuth();
  const { selectedOrgaId, selectedOrga } = useOrgaStore();
  const { selectedChannelId, selectChannel } = useChatStore();

  const channels = useQuery(
    api.chat.functions.getChannelsForMember,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  );

  const unreadCounts = useQuery(
    api.chat.functions.getUnreadCounts,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  );

  // Auto-select the orga channel if no channel is selected
  useEffect(() => {
    if (!selectedChannelId && channels && channels.length > 0) {
      selectChannel(channels[0]._id);
    }
  }, [selectedChannelId, channels, selectChannel]);

  const getUnreadCount = (channelId: Id<"channels">) => {
    return unreadCounts?.find((c) => c.channelId === channelId)?.unreadCount ?? 0;
  };

  if (!channels) {
    return (
      <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
        {t("loadingMessages")}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
        {t("channels")}
      </div>
      {channels.map((channel) => {
        const isSelected = selectedChannelId === channel._id;
        const unread = getUnreadCount(channel._id);
        const displayName = channel.kind === "orga" ? t("orgaChannel") : channel.name;

        return (
          <button
            key={channel._id}
            onClick={() => selectChannel(channel._id)}
            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
              isSelected
                ? "bg-slate-200 dark:bg-slate-700 text-dark dark:text-light font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            } ${channel.isArchived ? "italic opacity-60" : ""}`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-gray-400 dark:text-gray-500 shrink-0">
                {channel.kind === "orga" ? "#" : channel.kind === "team" ? "#" : "@"}
              </span>
              <span className="truncate">{displayName}</span>
            </span>
            {unread > 0 && (
              <span className="shrink-0 ml-2 min-w-5 h-5 flex items-center justify-center text-xs font-bold bg-[#eac840] text-dark rounded-full px-1.5">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
