import { createContext, useContext, useState } from "react";

interface PageResetContextType {
  pageKeys: Record<string, number>;
  resetPage: (path: string) => void;
}

const PageResetContext = createContext<PageResetContextType>({
  pageKeys: {},
  resetPage: () => {},
});

export function PageResetProvider({ children }: { children: React.ReactNode }) {
  const [pageKeys, setPageKeys] = useState<Record<string, number>>({});

  const resetPage = (path: string) => {
    setPageKeys((prev) => ({ ...prev, [path]: (prev[path] || 0) + 1 }));
  };

  return (
    <PageResetContext.Provider value={{ pageKeys, resetPage }}>
      {children}
    </PageResetContext.Provider>
  );
}

export function usePageReset() {
  return useContext(PageResetContext);
}
