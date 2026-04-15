import { createContext, useContext, useState, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { Song } from '@/types/music';

type LoopMode = 'none' | '1x' | '2x' | '3x' | '4x' | '5x' | '6x' | 'forever';

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  loopMode: LoopMode;
  queue: Song[];
  currentIndex: number;

  // Actions
  play: (song: Song, queue?: Song[]) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setLoopMode: (mode: LoopMode) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;

  // Audio element reference
  audioRef: RefObject<HTMLAudioElement | null>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loopMode, setLoopMode] = useState<LoopMode>('none');
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const playRequestRef = useRef(0);

  const isBackblazeUrl = (value: string) =>
    value.includes('backblazeb2.com') || value.includes('backblaze');

  const resolvePlayableUrl = async (originalUrl: string) => {
    if (!import.meta.env.DEV || !isBackblazeUrl(originalUrl)) {
      return originalUrl;
    }

    const response = await fetch('/b2/sign-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sourceUrl: originalUrl }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message || 'Unable to get Backblaze signed playback URL');
    }

    const payload = (await response.json()) as { url?: string };
    if (!payload.url) {
      throw new Error('Signed playback URL not returned');
    }

    return payload.url;
  };

  const playAudio = async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
    } catch (error) {
      setIsPlaying(false);
      console.error('Audio playback failed', error);
    }
  };

  const loadAndPlaySong = async (song: Song, requestId: number) => {
    if (!audioRef.current) return;

    try {
      const resolvedUrl = await resolvePlayableUrl(song.url);
      if (requestId !== playRequestRef.current || !audioRef.current) return;
      audioRef.current.src = resolvedUrl;
      await playAudio();
    } catch (error) {
      if (requestId !== playRequestRef.current) return;
      setIsPlaying(false);
      console.error('Unable to resolve playable URL', error);
    }
  };

  const play = (song: Song, newQueue?: Song[]) => {
    playRequestRef.current += 1;
    const requestId = playRequestRef.current;
    setCurrentSong(song);
    setQueue(newQueue || [song]);
    setCurrentIndex(0);
    setIsPlaying(true);
    if (audioRef.current) {
      void loadAndPlaySong(song, requestId);
    }

    // Update media session for background playback
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        artwork: [
          {
            src: song.thumbnail,
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      });
      navigator.mediaSession.setActionHandler('play', resume);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('previoustrack', previous);
      navigator.mediaSession.setActionHandler('nexttrack', next);
    }
  };

  const pause = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  };

  const resume = () => {
    setIsPlaying(true);
    if (audioRef.current) {
      void playAudio();
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  };

  const next = () => {
    if (queue.length === 0) return;
    playRequestRef.current += 1;
    const requestId = playRequestRef.current;
    const nextIndex = (currentIndex + 1) % queue.length;
    setCurrentIndex(nextIndex);
    const nextSong = queue[nextIndex];
    if (audioRef.current) {
      setIsPlaying(true);
      void loadAndPlaySong(nextSong, requestId);
    }
    setCurrentSong(nextSong);
  };

  const previous = () => {
    if (queue.length === 0) return;
    playRequestRef.current += 1;
    const requestId = playRequestRef.current;
    const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    const prevSong = queue[prevIndex];
    if (audioRef.current) {
      setIsPlaying(true);
      void loadAndPlaySong(prevSong, requestId);
    }
    setCurrentSong(prevSong);
  };

  const seek = (time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Setup audio element listeners
  if (audioRef.current) {
    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };
    audioRef.current.onloadedmetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };
    audioRef.current.onended = () => {
      // Handle repeat logic
      if (loopMode === 'forever') {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          void playAudio();
        }
      } else if (loopMode !== 'none') {
        // Other repeat counts would be handled in the UI
        next();
      } else {
        next();
      }
    };
    audioRef.current.onerror = () => {
      setIsPlaying(false);
      if (audioRef.current?.currentSrc) {
        console.error('Audio element failed loading source', audioRef.current.currentSrc);
      }
    };
  }

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        duration,
        currentTime,
        loopMode,
        queue,
        currentIndex,
        play,
        pause,
        resume,
        next,
        previous,
        seek,
        setLoopMode,
        setCurrentTime,
        setDuration,
        audioRef,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
