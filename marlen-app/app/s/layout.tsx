import type { ReactNode } from 'react';

/** Web pública del centro: sin splash de la PWA. */
const BOOT = `try{document.documentElement.dataset.booted='1'}catch(e){}`;

export default function PublicSiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      {children}
    </>
  );
}
