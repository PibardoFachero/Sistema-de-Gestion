import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChiguiGreeting } from '@/components/mascot/ChiguiGreeting';
import { FolderKanban, Target, Flame, Leaf } from 'lucide-react';
import Link from 'next/link';

import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-surface">
      {/* Lado Izquierdo: Marca, Mascota y Propuesta de Valor */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-12 text-on-primary lg:flex xl:w-[45%]">
        {/* Fondo Animado de Aurora Exclusivo del Panel Izquierdo */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-noise mix-blend-overlay opacity-30" />
        <div className="pointer-events-none absolute -left-[20%] -top-[10%] h-[40vw] w-[40vw] rounded-full bg-accent-amber/30 blur-[120px] animate-blob" />
        <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[50vw] w-[50vw] rounded-full bg-secondary/40 blur-[120px] animate-blob animation-delay-2000" />
        <div className="pointer-events-none absolute top-[40%] left-[20%] h-[30vw] w-[30vw] rounded-full bg-accent-umber/20 blur-[100px] animate-blob animation-delay-4000" />

        {/* Logo superior */}
        <div className="relative z-10 flex items-center gap-3">
          <Image 
            src="/images/mascot/chigui-focus.png" 
            alt="Logo Komorebi" 
            width={36} 
            height={36} 
            className="object-contain drop-shadow-sm"
          />
          <span className="text-xl font-bold tracking-tight">Komorebi Studio</span>
        </div>

        {/* Contenido Central: Mascota y Features */}
        <div className="relative z-10 flex flex-col items-center text-center mt-8">
          <div className="relative mb-8 h-64 w-full max-w-xs">
            <ChiguiGreeting
              priority
              className="h-full w-full origin-bottom object-contain transition-transform duration-500 hover:scale-[1.05] motion-safe:animate-[chigui-float_4s_ease-in-out_infinite]"
            />
          </div>
          
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Tu zona de estudio te espera.</h2>
          <p className="text-primary-container-lowest/80 text-on-primary/80 max-w-sm mb-10 leading-relaxed font-medium">
            Chigüi te estaba esperando. Prepara tu café, silencia las notificaciones y prepárate para una sesión productiva.
          </p>

          <div className="grid grid-cols-1 gap-6 w-full max-w-sm text-left">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="bg-accent-amber/20 p-2.5 rounded-xl">
                <Target className="size-5 text-accent-amber" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Retoma tus proyectos</h3>
                <p className="text-xs text-white/60 font-medium">Continúa justo donde lo dejaste ayer</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="bg-accent-umber/20 p-2.5 rounded-xl">
                <Flame className="size-5 text-accent-umber" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Mantén tu racha</h3>
                <p className="text-xs text-white/60 font-medium">Cada día de enfoque cuenta para tus metas</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="bg-secondary/30 p-2.5 rounded-xl">
                <Leaf className="size-5 text-accent-amber" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Estudio sin distracciones</h3>
                <p className="text-xs text-white/60 font-medium">Un entorno libre de notificaciones</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer del panel izquierdo */}
        <div className="relative z-10 text-xs text-white/50 font-medium mt-8 text-center">
          © {new Date().getFullYear()} Komorebi Study Studio. Todos los derechos reservados.
        </div>
      </div>

      {/* Lado Derecho: Formulario de Login */}
      <div className="relative flex w-full items-center justify-center p-6 lg:w-1/2 xl:w-[55%] animate-in fade-in slide-in-from-right-8 duration-700">
        <div className="w-full max-w-md">
          <Card className="w-full p-8 sm:p-10 bg-surface-container-lowest border-outline-variant/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex flex-col items-center text-center mb-8">
              <ChiguiGreeting
                priority
                className="mb-4 h-24 w-24 object-contain motion-safe:animate-[chigui-float_4s_ease-in-out_infinite] lg:hidden"
              />
              <h1 className="text-2xl font-bold text-primary mb-1.5 tracking-tight">Bienvenido de vuelta</h1>
              <p className="text-sm text-on-surface-variant font-medium">
                Inicia sesión en tu cuenta
              </p>
            </div>

            <div className="space-y-4.5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-on-surface ml-1">Correo electrónico</label>
                <input 
                  type="email" 
                  placeholder="tu@correo.universidad.edu"
                  className="w-full rounded-xl border border-outline-variant/50 bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  disabled
                />
              </div>
              
              <div className="space-y-1.5 mt-4">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-sm font-bold text-on-surface">Contraseña</label>
                  <span className="text-xs text-accent-amber font-bold cursor-pointer hover:text-accent-amber/80 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </span>
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-outline-variant/50 bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  disabled
                />
              </div>

              <Link href="/" className="block mt-8">
                <Button variant="primary" className="w-full h-12 shadow-md hover:shadow-lg transition-all rounded-xl font-bold text-sm">
                  Iniciar Sesión
                </Button>
              </Link>

              <div className="relative my-6 flex items-center justify-center">
                <div className="border-t border-outline-variant/40 w-full" />
                <span className="bg-surface-container-lowest px-3 text-xs text-on-surface-variant uppercase tracking-wider absolute font-bold">
                  o
                </span>
              </div>

              <Button variant="secondary" className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl bg-surface hover:bg-surface-dim border border-outline-variant/60 shadow-sm transition-all text-on-surface font-bold text-sm">
                <svg className="size-5 shrink-0" viewBox="0 0 24 24">
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

            <div className="relative z-10 mt-8 text-center text-sm text-on-surface-variant font-medium">
              ¿No tienes una cuenta?{' '}
              <Link href="/register" className="text-primary font-bold hover:text-primary/80 transition-colors">
                Regístrate
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

