import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChiguiGreeting } from '@/components/mascot/ChiguiGreeting';
import { FolderKanban } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-6 overflow-hidden bg-surface p-4 animate-in fade-in duration-500 lg:gap-10 lg:p-8">
      <div className="hidden w-[min(38vw,28rem)] shrink-0 flex-col items-center text-center lg:flex">
        <div className="relative mb-3 h-[min(62vh,38rem)] w-full">
          <ChiguiGreeting
            priority
            className="h-full w-full origin-center object-contain transition-transform duration-500 hover:scale-[1.03] motion-safe:animate-[chigui-float_4s_ease-in-out_infinite]"
          />
        </div>
        <p className="max-w-56 text-sm leading-6 text-on-surface-variant">
          Chigüi está listo para acompañarte en tu próximo momento de estudio.
        </p>
      </div>

      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <ChiguiGreeting
            priority
            className="mb-3 h-28 w-28 object-contain motion-safe:animate-[chigui-float_4s_ease-in-out_infinite] lg:hidden"
          />
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

          <Button variant="secondary" className="w-full mt-3 flex items-center justify-center gap-2.5">
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuar con Google</span>
          </Button>
        </div>

        <div className="mt-8 text-center text-xs text-on-surface-variant">
          ¿No tienes una cuenta?{' '}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Regístrate
          </Link>
        </div>
      </Card>
    </div>
  );
}
