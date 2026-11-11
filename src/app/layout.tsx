import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';

/* Interface text. latin-ext carries the Turkish letters (ğ, ı, İ, ş). */
const sans = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' });
/* Instrument numerals and labels: tabular, with a slashed zero. */
const mono = JetBrains_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-mono', display: 'swap' });
/* Long-form reading in the dossier. */
const serif = Source_Serif_4({ subsets: ['latin', 'latin-ext'], variable: '--font-serif', display: 'swap' });

const title = 'Life of a Photon — özel göreliliğin birinci şahıs görünümü';
const description =
  'Einstein’ın 16 yaşındaki düşünce deneyi, hakemli literatüre dayanan gerçek zamanlı bir simülasyon olarak: durgun hâlden 0,99999c’ye, ışık sapıncı, Doppler kayması ve ışınım dönüşümü CIE 1931 gözlemcisi ve Planck yasasıyla hesaplanır.';

export const metadata: Metadata = {
  metadataBase: new URL('https://life-of-photon.vercel.app'),
  title,
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
    images: [{ url: '/opengraph-image.png', width: 1600, height: 900, alt: 'Life of a Photon' }],
    locale: 'tr_TR',
    alternateLocale: ['en_US'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/opengraph-image.png'],
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
