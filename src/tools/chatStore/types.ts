import { Id } from "../../../convex/_generated/dataModel";

export type ChatStoreContextType = {
  selectedChannelId: Id<"channels"> | null;
  selectChannel: (channelId: Id<"channels">) => void;
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  // Expanded (full-width) mode
  isChatExpanded: boolean;
  toggleChatExpand: () => void;
  // Thread panel state (Phase 2)
  activeThreadMessageId: Id<"messages"> | null;
  openThread: (messageId: Id<"messages">) => void;
  closeThread: () => void;
  // Search panel state (Phase 7)
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};
