import type { Metadata } from 'next';
import 'katex/dist/katex.min.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Life of a Photon | Special Relativity 3D Urban Simulation',
  description:
    'Interactive 3D WebGL & GLSL Shader simulation of Einstein’s Special Theory of Relativity: Lorentz Contraction, Terrell-Penrose Aberration, Relativistic Doppler Shift, and Proper Time Dilation from v = 0 to v = 0.99999c.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-[#040711] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
