import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import SplashScreen from '@/components/SplashScreen';
import { BRAND_NAME, BRAND_UI, SPLASH_SEEN_KEY } from '@/lib/brand';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const SPLASH_BOOT_SCRIPT = `try{if(sessionStorage.getItem('${SPLASH_SEEN_KEY}'))document.documentElement.dataset.booted='1'}catch(e){}`;

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: 'Agenda del centro de estética',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: BRAND_NAME,
    statusBarStyle: 'black-translucent',
    startupImage: [
      {
        url: '/splash-1290x2796.png',
        media:
          '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/splash-1179x2556.png',
        media:
          '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/splash-1170x2532.png',
        media:
          '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/splash-2048x2732.png',
        media:
          '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BRAND_UI.theme },
    { media: '(prefers-color-scheme: dark)', color: '#121024' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body className="font-sans font-medium text-ink">
        <script dangerouslySetInnerHTML={{ __html: SPLASH_BOOT_SCRIPT }} />
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
