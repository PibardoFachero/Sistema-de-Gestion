'use client';

import { useEffect, useRef, useState } from 'react';

type AuthMascotVideoProps = {
  className?: string;
  framed?: boolean;
  objectFit?: 'contain' | 'cover';
  showControls?: boolean;
};

/**
 * Renders the self-hosted greeting video. If autoplay is blocked, the visitor
 * receives an explicit play control instead of a different mascot asset.
 */
export function AuthMascotVideo({
  className = '',
  framed = true,
  objectFit = 'cover',
  showControls = false,
}: AuthMascotVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsManualPlayback, setNeedsManualPlayback] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const startPlayback = async () => {
      try {
        video.muted = true;
        await video.play();
        if (!cancelled) setNeedsManualPlayback(false);
      } catch {
        if (!cancelled) setNeedsManualPlayback(true);
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      void startPlayback();
    } else {
      video.addEventListener('canplay', startPlayback, { once: true });
    }

    return () => {
      cancelled = true;
      video.removeEventListener('canplay', startPlayback);
    };
  }, []);

  const playManually = async () => {
    try {
      await videoRef.current?.play();
      setNeedsManualPlayback(false);
    } catch {
      setNeedsManualPlayback(true);
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${framed ? 'border-4 border-white/20 shadow-xl animate-morph-glow' : ''} ${className}`}
    >
      {hasPlaybackError ? (
        <p
          role="alert"
          className="px-6 text-center text-sm font-semibold leading-relaxed text-on-primary"
        >
          No se pudo cargar el video de saludo. Actualiza la página e inténtalo de nuevo.
        </p>
      ) : (
        <video
          ref={videoRef}
          width={256}
          height={256}
          autoPlay
          loop
          muted
          playsInline
          controls={showControls}
          preload="auto"
          onError={() => setHasPlaybackError(true)}
          className={`h-full w-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
          aria-label="Saludo animado de Chigüi"
        >
          <source src="/videos/saludo2.mp4" type="video/mp4" />
          Tu navegador no admite la reproducción de video.
        </video>
      )}

      {needsManualPlayback && !hasPlaybackError ? (
        <button
          type="button"
          onClick={() => void playManually()}
          className="absolute inset-0 flex items-center justify-center bg-primary/45 px-4 text-center text-sm font-bold text-on-primary transition-colors hover:bg-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
        >
          Reproducir saludo
        </button>
      ) : null}
    </div>
  );
}
