import type { Metadata } from 'next';
import 'katex/dist/katex.min.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Life of a Photon | Special Relativity 3D Simulation',
  description:
    'Interactive 3D WebGL & GLSL Shader simulation of Einstein’s Special Theory of Relativity: Lorentz Contraction, Terrell-Penrose Aberration, Relativistic Doppler Shift, and Proper Time Dilation from v = 0 to v = 0.99999c.',
  openGraph: {
    title: 'Life of a Photon | Special Relativity 3D Simulation',
    description:
      'Experience the universe from the reference frame of a photon: Terrell-Penrose aberration, relativistic Doppler rainbow iris, and Lorentz contraction.',
    url: 'https://life-of-photon.vercel.app',
    siteName: 'Life of a Photon',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1600,
        height: 900,
        alt: 'Life of a Photon - Relativistic 3D Urban Simulation',
      },
    ],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Life of a Photon | Special Relativity 3D Simulation',
    description:
      'Experience the universe from the reference frame of a photon: Terrell-Penrose aberration, relativistic Doppler rainbow iris, and Lorentz contraction.',
    images: ['/opengraph-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-[#05070a] text-zinc-100 antialiased selection:bg-cyan-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
