import { createContext } from "react";
import type { OrgaStoreContextType } from "./types";

export const OrgaStoreContext = createContext<OrgaStoreContextType | undefined>(undefined);
