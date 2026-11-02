import type { ReactNode } from 'react';
import '../booking.css';

/** Booking público: sin splash de la PWA + scroll libre. */
const BOOT = `try{document.documentElement.dataset.booted='1'}catch(e){}`;

export default function BookingRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      {children}
    </>
  );
}
