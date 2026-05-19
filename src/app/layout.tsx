import type { Metadata } from 'next';
import { Inter, IBM_Plex_Mono, Noto_Sans_TC } from 'next/font/google';
import './globals.css';
import '../styles/tokens.css';
import '../styles/glitch.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const notoTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-tc',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cookie',
  description: 'A mirror made from your own words.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-Hant"
      className={`${inter.variable} ${plexMono.variable} ${notoTC.variable}`}
    >
      <body className="min-h-screen bg-cookie-bg text-cookie-ink antialiased">
        {children}
      </body>
    </html>
  );
}
