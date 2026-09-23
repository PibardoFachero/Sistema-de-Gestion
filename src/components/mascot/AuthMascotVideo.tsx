'use client';

import { useEffect, useRef, useState } from 'react';

type AuthMascotVideoProps = {
  className?: string;
  framed?: boolean;
  objectFit?: 'contain' | 'cover';
};

/**
 * Renders the self-hosted greeting video as a decorative, non-interactive asset.
 */
export function AuthMascotVideo({
  className = '',
  framed = true,
  objectFit = 'cover',
}: AuthMascotVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const startPlayback = async () => {
      try {
        video.muted = true;
        await video.play();
      } catch {
        // Autoplay is optional for this decorative video. No user control is exposed.
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      void startPlayback();
    } else {
      video.addEventListener('canplay', startPlayback, { once: true });
    }

    return () => {
      video.removeEventListener('canplay', startPlayback);
    };
  }, []);

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
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          onError={() => setHasPlaybackError(true)}
          className={`pointer-events-none h-full w-full select-none ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/videos/saludo2.mp4" type="video/mp4" />
          Tu navegador no admite la reproducción de video.
        </video>
      )}
    </div>
  );
}
