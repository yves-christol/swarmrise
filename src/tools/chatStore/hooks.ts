import { useContext } from "react";
import { ChatStoreContext } from "./context";

export const useChatStore = () => {
  const context = useContext(ChatStoreContext);
  if (!context) {
    throw new Error("useChatStore must be used within ChatStoreProvider");
  }
  return context;
};
