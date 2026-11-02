import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const BOOT = `try{document.documentElement.dataset.booted='1'}catch(e){}`;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      {children}
    </>
  );
}
