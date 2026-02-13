import { useState, useCallback, useEffect, type ReactNode } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { ChatStoreContext } from "./context";
import { useOrgaStore } from "../orgaStore/hooks";

const CHAT_OPEN_KEY = "swarmrise_chat_open";
const CHAT_EXPANDED_KEY = "swarmrise_chat_expanded";

export const ChatStoreProvider = ({ children }: { children: ReactNode }) => {
  const { selectedOrgaId } = useOrgaStore();

  const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(CHAT_OPEN_KEY) === "true";
    }
    return false;
  });
  const [isChatExpanded, setIsChatExpanded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(CHAT_EXPANDED_KEY) === "true";
    }
    return false;
  });
  const [activeThreadMessageId, setActiveThreadMessageId] = useState<Id<"messages"> | null>(null);

  // Reset channel selection when orga changes
  useEffect(() => {
    setSelectedChannelId(null);
    setActiveThreadMessageId(null);
  }, [selectedOrgaId]);

  // Persist chat open state
  useEffect(() => {
    localStorage.setItem(CHAT_OPEN_KEY, String(isChatOpen));
  }, [isChatOpen]);

  // Persist chat expanded state
  useEffect(() => {
    localStorage.setItem(CHAT_EXPANDED_KEY, String(isChatExpanded));
  }, [isChatExpanded]);

  const selectChannel = useCallback((channelId: Id<"channels">) => {
    setSelectedChannelId(channelId);
    setActiveThreadMessageId(null);
  }, []);

  const openChat = useCallback(() => setIsChatOpen(true), []);
  const closeChat = useCallback(() => setIsChatOpen(false), []);
  const toggleChat = useCallback(() => setIsChatOpen((prev) => !prev), []);

  const toggleChatExpand = useCallback(() => setIsChatExpanded((prev) => !prev), []);

  const openThread = useCallback((messageId: Id<"messages">) => {
    setActiveThreadMessageId(messageId);
  }, []);
  const closeThread = useCallback(() => setActiveThreadMessageId(null), []);

  return (
    <ChatStoreContext.Provider
      value={{
        selectedChannelId,
        selectChannel,
        isChatOpen,
        openChat,
        closeChat,
        toggleChat,
        isChatExpanded,
        toggleChatExpand,
        activeThreadMessageId,
        openThread,
        closeThread,
      }}
    >
      {children}
    </ChatStoreContext.Provider>
  );
};
