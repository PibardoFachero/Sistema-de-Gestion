import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Plus_Jakarta_Sans, Caveat } from 'next/font/google';

import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-handwriting',
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Komorebi - Sistema de Gestión de Calendarios con Google OAuth',
    template: '%s | Komorebi',
  },
  description:
    'Komorebi es un sistema de gestión de calendarios con Google OAuth y productividad académica para organizar sesiones de estudio y sincronizar eventos.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${plusJakartaSans.variable} ${caveat.variable}`}>
      <body className="min-h-screen antialiased bg-background text-on-background font-sans selection:bg-accent-amber/20 selection:text-primary">
        <a
          href="#contenido"
          className="sr-only rounded bg-white p-3 focus:not-sr-only focus:absolute focus:z-10"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
