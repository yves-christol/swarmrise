import { createContext } from "react";
import type { ChatStoreContextType } from "./types";

export const ChatStoreContext = createContext<ChatStoreContextType | undefined>(undefined);
