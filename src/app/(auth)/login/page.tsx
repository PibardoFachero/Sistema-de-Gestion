import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FolderKanban } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-primary/10 p-3 rounded-xl text-primary mb-4">
            <FolderKanban className="size-8" />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-1">Bienvenido de vuelta</h1>
          <p className="text-sm text-on-surface-variant">
            Inicia sesión para continuar en Komorebi Study Studio
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">Correo electrónico</label>
            <input 
              type="email" 
              placeholder="tu@correo.universidad.edu"
              className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              disabled
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-on-surface">Contraseña</label>
              <span className="text-xs text-accent-amber font-medium cursor-pointer hover:underline">
                ¿Olvidaste tu contraseña?
              </span>
            </div>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              disabled
            />
          </div>

          <Link href="/" className="block mt-6">
            <Button variant="primary" className="w-full">
              Iniciar Sesión (Demo)
            </Button>
          </Link>

          <Button variant="secondary" className="w-full mt-3 disabled:opacity-50">
            Continuar con Google
          </Button>
        </div>

        <div className="mt-8 text-center text-xs text-on-surface-variant">
          ¿No tienes una cuenta? <span className="text-primary font-semibold cursor-pointer hover:underline">Regístrate</span>
        </div>
      </Card>
    </div>
  );
}
