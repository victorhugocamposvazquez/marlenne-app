import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import './globals.css';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });

export const metadata: Metadata = {
  title: 'Marlén · Próximamente',
  description: 'Agenda, clientas y voz para salones y clínicas estéticas. Web corporativa en camino.',
  icons: {
    icon: '/favicon-192.png',
    apple: '/favicon-192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={sora.variable}>
      <body className="font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
