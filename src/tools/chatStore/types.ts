import { Id } from "../../../convex/_generated/dataModel";

export type ChatStoreContextType = {
  selectedChannelId: Id<"channels"> | null;
  selectChannel: (channelId: Id<"channels">) => void;
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  // Thread panel state (Phase 2)
  activeThreadMessageId: Id<"messages"> | null;
  openThread: (messageId: Id<"messages">) => void;
  closeThread: () => void;
};
