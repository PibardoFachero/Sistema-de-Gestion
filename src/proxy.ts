import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas de la aplicación excepto archivos estáticos:
     * - _next/static (archivos estáticos compilados)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (ícono de la aplicación)
     * - extensiones de imágenes, fuentes y medios públicos
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm|mp3|wav|ogg|woff|woff2|ttf|otf)$).*)',
  ],
};
