import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import 'katex/dist/katex.min.css';
import { MESSAGES } from '@/i18n/messages';
import './globals.css';

/* Interface text. latin-ext carries the Turkish letters (ğ, ı, İ, ş). */
const sans = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' });
/* Instrument numerals and labels: tabular, with a slashed zero. */
const mono = JetBrains_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-mono', display: 'swap' });
/* Long-form reading in the dossier. */
const serif = Source_Serif_4({ subsets: ['latin', 'latin-ext'], variable: '--font-serif', display: 'swap' });

/*
 * The page is served in Turkish. The document title is not part of the metadata: App.tsx renders it, in Turkish on the
 * server and in the language of the visit once that is known. (Next.js hydrates its metadata after the page's effects
 * and would put a title given here back over the visit's.) The social cards below keep the Turkish title.
 */
const title = MESSAGES.tr.app.title;
const description =
  'Einstein’ın 16 yaşındaki düşünce deneyi, hakemli literatüre dayanan gerçek zamanlı bir simülasyon olarak: durgun hâlden 0,99999 c’ye, ışık sapıncı, Doppler kayması ve ışınım parlaklığının dönüşümü CIE 1931 gözlemcisi ve Planck yasasıyla hesaplanır.';

export const metadata: Metadata = {
  metadataBase: new URL('https://life-of-photon.vercel.app'),
  description,
  applicationName: 'Life of a Photon',
  keywords: [
    'özel görelilik',
    'special relativity',
    'relativistic aberration',
    'Terrell rotation',
    'Doppler shift',
    'Lorentz contraction',
    'WebGL',
  ],
  openGraph: {
    title,
    description,
    url: '/',
    siteName: 'Life of a Photon',
    images: [
      {
        url: '/opengraph-image.jpg',
        width: 1600,
        height: 900,
        type: 'image/jpeg',
        alt: 'Life of a Photon: 0,866 c hızında (γ = 2) bir gece caddesi; binalar öne doğru eğilmiş, sokak ışığı Doppler halkasına dönmüş, ileride ortamın ısıl ışıması parlıyor.',
      },
    ],
    locale: 'tr_TR',
    alternateLocale: ['en_US'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/opengraph-image.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#05070a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
