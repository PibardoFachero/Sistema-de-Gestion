'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const greetingFrames = [
  '/images/mascot/sequences/greet/frame-01.png',
  '/images/mascot/sequences/greet/frame-02.png',
  '/images/mascot/sequences/greet/frame-03.png',
  '/images/mascot/sequences/greet/frame-02.png',
  '/images/mascot/sequences/greet/frame-01.png',
];

const frameDurationMs = 260;
const restDurationMs = 4200;

type ChiguiGreetingProps = {
  className?: string;
  priority?: boolean;
};

export function ChiguiGreeting({ className, priority = false }: ChiguiGreetingProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let sequenceIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const playNextFrame = () => {
      setFrame(sequenceIndex);
      const isLastFrame = sequenceIndex === greetingFrames.length - 1;
      sequenceIndex = isLastFrame ? 0 : sequenceIndex + 1;
      timeoutId = setTimeout(playNextFrame, isLastFrame ? restDurationMs : frameDurationMs);
    };

    playNextFrame();

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <Image
      src={greetingFrames[frame]}
      alt=""
      aria-hidden="true"
      width={1152}
      height={1536}
      priority={priority}
      sizes="(min-width: 1024px) 28rem, 7rem"
      className={className}
    />
  );
}
