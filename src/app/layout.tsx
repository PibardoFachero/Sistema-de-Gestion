import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppHeader } from '@/components/layout/AppHeader';

import './globals.css';

export const metadata: Metadata = {
  title: 'Aula — Aprendizaje y productividad',
  description: 'Proyecto universitario colaborativo de aprendizaje y productividad académica.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <a
          href="#contenido"
          className="sr-only rounded bg-white p-3 focus:not-sr-only focus:absolute focus:z-10"
        >
          Saltar al contenido
        </a>
        <AppHeader />
        <main id="contenido" className="mx-auto max-w-5xl px-6 py-16">
          {children}
        </main>
      </body>
    </html>
  );
}
