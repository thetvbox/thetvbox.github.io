import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface MembersContextValue {
  query: string;
  setQuery: (query: string) => void;
}

const MembersContext = createContext<MembersContextValue | null>(null);

/** Shares the People directory's search query between the Tabs header's native search bar and the screen body. */
export function MembersProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  return <MembersContext.Provider value={{ query, setQuery }}>{children}</MembersContext.Provider>;
}

export function useMembers(): MembersContextValue {
  const ctx = useContext(MembersContext);
  if (!ctx) throw new Error('useMembers must be used within a MembersProvider');
  return ctx;
}
