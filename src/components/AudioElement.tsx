import { usePlayer } from '@/context/PlayerContext';
import { useEffect } from 'react';

export default function AudioElement() {
  const { audioRef } = usePlayer();

  useEffect(() => {
    // Additional cleanup if needed
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioRef]);

  return (
    <audio
      ref={audioRef}
      crossOrigin="anonymous"
      style={{ display: 'none' }}
    />
  );
}
