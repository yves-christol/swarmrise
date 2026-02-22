import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useOrgaStore } from "../../../tools/orgaStore/hooks";
import { useChatStore } from "../../../tools/chatStore/hooks";
import { useEffect, useState, useCallback, useRef } from "react";

export const ChannelList = () => {
  const { t } = useTranslation("chat");
  const { isSignedIn } = useAuth();
  const { selectedOrgaId, selectedOrga } = useOrgaStore();
  const { selectedChannelId, selectChannel } = useChatStore();
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const channels = useQuery(
    api.chat.functions.getChannelsForMember,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  );

  const unreadCounts = useQuery(
    api.chat.functions.getUnreadCounts,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  );

  const members = useQuery(
    api.members.functions.listMembers,
    isSignedIn && selectedOrga && showMemberPicker ? { orgaId: selectedOrgaId! } : "skip"
  );

  const myMember = useQuery(
    api.members.functions.getMyMember,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  );

  const getOrCreateDM = useMutation(api.chat.functions.getOrCreateDMChannel);

  // Auto-select the orga channel if no channel is selected (desktop only).
  // On mobile (<sm), users see the channel list overlay and pick manually.
  useEffect(() => {
    if (!selectedChannelId && channels && channels.length > 0) {
      const isDesktop = window.matchMedia("(min-width: 640px)").matches;
      if (isDesktop) {
        selectChannel(channels[0]._id);
      }
    }
  }, [selectedChannelId, channels, selectChannel]);

  const getUnreadCount = (channelId: Id<"channels">) => {
    return unreadCounts?.find((c) => c.channelId === channelId)?.unreadCount ?? 0;
  };

  const handleStartDM = useCallback(
    (otherMemberId: Id<"members">) => {
      if (!selectedOrgaId) return;
      setShowMemberPicker(false);
      setMemberSearch("");

      void getOrCreateDM({ orgaId: selectedOrgaId, otherMemberId })
        .then((channelId) => {
          selectChannel(channelId);
        })
        .catch((error) => {
          console.error("Failed to create DM:", error);
        });
    },
    [selectedOrgaId, getOrCreateDM, selectChannel]
  );

  if (!channels) {
    return (
      <div className="p-3 text-sm text-text-secondary">
        {t("loadingMessages")}
      </div>
    );
  }

  // Split channels by kind
  const orgaAndTeamChannels = channels.filter((c) => c.kind === "orga" || c.kind === "team");
  const dmChannels = channels.filter((c) => c.kind === "dm");

  // Filter members for the picker (exclude self)
  const filteredMembers = members?.filter((m) => {
    if (myMember && m._id === myMember._id) return false;
    if (!memberSearch) return true;
    const fullName = `${m.firstname} ${m.surname}`.toLowerCase();
    return fullName.includes(memberSearch.toLowerCase());
  });

  return (
    <div className="flex flex-col" role="listbox" aria-label={t("channels")}>
      {/* Channels section */}
      <div className="px-3 py-2 text-xs font-semibold uppercase text-text-secondary tracking-wider">
        {t("channels")}
      </div>
      {orgaAndTeamChannels.map((channel) => (
        <ChannelButton
          key={channel._id}
          channelId={channel._id}
          isSelected={selectedChannelId === channel._id}
          unread={getUnreadCount(channel._id)}
          displayName={channel.kind === "orga" ? t("orgaChannel") : channel.name}
          prefix="#"
          isArchived={channel.isArchived}
          onSelect={selectChannel}
        />
      ))}

      {/* DM section */}
      <div className="flex items-center justify-between px-3 py-2 mt-2">
        <span className="text-xs font-semibold uppercase text-text-secondary tracking-wider">
          {t("directMessages")}
        </span>
        <button
          onClick={() => setShowMemberPicker((v) => !v)}
          className="p-1.5 rounded hover:bg-surface-hover-strong text-text-secondary transition-colors"
          aria-label={t("newConversation")}
          title={t("newConversation")}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Member picker dropdown */}
      {showMemberPicker && (
        <MemberPicker
          search={memberSearch}
          onSearchChange={setMemberSearch}
          members={filteredMembers}
          onSelect={handleStartDM}
          onClose={() => {
            setShowMemberPicker(false);
            setMemberSearch("");
          }}
          searchPlaceholder={t("searchMembers")}
          selectLabel={t("selectMember")}
        />
      )}

      {dmChannels.map((channel) => (
        <ChannelButton
          key={channel._id}
          channelId={channel._id}
          isSelected={selectedChannelId === channel._id}
          unread={getUnreadCount(channel._id)}
          displayName={channel.name}
          prefix="@"
          isArchived={false}
          onSelect={selectChannel}
        />
      ))}
    </div>
  );
};

// ---- Sub-components ----

type ChannelButtonProps = {
  channelId: Id<"channels">;
  isSelected: boolean;
  unread: number;
  displayName: string;
  prefix: string;
  isArchived: boolean;
  onSelect: (channelId: Id<"channels">) => void;
};

const ChannelButton = ({
  channelId,
  isSelected,
  unread,
  displayName,
  prefix,
  isArchived,
  onSelect,
}: ChannelButtonProps) => (
  <button
    role="option"
    aria-selected={isSelected}
    onClick={() => onSelect(channelId)}
    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
      isSelected
        ? "bg-surface-tertiary text-dark dark:text-light font-medium"
        : "text-text-description hover:bg-surface-hover"
    } ${isArchived ? "italic opacity-60" : ""}`}
  >
    <span className="flex items-center gap-2 min-w-0">
      <span className="text-text-tertiary shrink-0">{prefix}</span>
      <span className="truncate">{displayName}</span>
    </span>
    {unread > 0 && (
      <span className="shrink-0 ml-2 min-w-5 h-5 flex items-center justify-center text-xs font-bold bg-highlight text-dark rounded-full px-1.5">
        {unread > 99 ? "99+" : unread}
      </span>
    )}
  </button>
);

type MemberPickerProps = {
  search: string;
  onSearchChange: (value: string) => void;
  members: Array<{ _id: Id<"members">; firstname: string; surname: string; pictureURL?: string }> | undefined;
  onSelect: (memberId: Id<"members">) => void;
  onClose: () => void;
  searchPlaceholder: string;
  selectLabel: string;
};

const MemberPicker = ({
  search,
  onSearchChange,
  members,
  onSelect,
  onClose,
  searchPlaceholder,
}: MemberPickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={containerRef} className="mx-2 mb-2 rounded-lg border border-border-default bg-surface-primary shadow-md overflow-hidden">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="w-full px-3 py-2 text-xs bg-transparent text-dark dark:text-light placeholder-text-tertiary focus:outline-none border-b border-border-default"
      />
      <div className="max-h-[120px] overflow-y-auto">
        {members === undefined ? (
          <div className="px-3 py-2 text-xs text-text-secondary">...</div>
        ) : members.length === 0 ? (
          <div className="px-3 py-2 text-xs text-text-secondary">-</div>
        ) : (
          members.map((m) => (
            <button
              key={m._id}
              onClick={() => onSelect(m._id)}
              className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-surface-hover transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                {m.pictureURL ? (
                  <img src={m.pictureURL} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-medium text-text-description">
                    {`${m.firstname[0] ?? ""}${m.surname[0] ?? ""}`.toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-dark dark:text-light truncate">
                {m.firstname} {m.surname}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
