import { createContext, useContext } from "react";

export const AppContext = createContext(null);

/**
 * useAppContext — convenience hook so pages don't need to import useContext + AppContext separately.
 */
export const useAppContext = () => useContext(AppContext);