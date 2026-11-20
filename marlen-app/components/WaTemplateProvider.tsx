'use client';

import { createContext, useContext, type ReactNode } from 'react';

const WaTemplateContext = createContext<string | null>(null);

export function WaTemplateProvider({
  template,
  children,
}: {
  template: string | null;
  children: ReactNode;
}) {
  return (
    <WaTemplateContext.Provider value={template}>
      {children}
    </WaTemplateContext.Provider>
  );
}

export function useWaConfirmTemplate() {
  return useContext(WaTemplateContext);
}
