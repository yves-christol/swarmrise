import { createContext } from "react";
import type { SelectionContextType, FocusContextType, ViewModeContextType } from "./types";

export const SelectionContext = createContext<SelectionContextType | undefined>(undefined);
export const FocusContext = createContext<FocusContextType | undefined>(undefined);
export const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);
