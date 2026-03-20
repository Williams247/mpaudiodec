import { createContext, useContext, useState, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { Song } from '@/data/mockSongs';

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

  const play = (song: Song, newQueue?: Song[]) => {
    setCurrentSong(song);
    setQueue(newQueue || [song]);
    setCurrentIndex(0);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = song.url;
      audioRef.current.play();
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
      audioRef.current.play();
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  };

  const next = () => {
    if (queue.length === 0) return;
    const nextIndex = (currentIndex + 1) % queue.length;
    setCurrentIndex(nextIndex);
    const nextSong = queue[nextIndex];
    if (audioRef.current) {
      audioRef.current.src = nextSong.url;
      audioRef.current.play();
    }
    setCurrentSong(nextSong);
  };

  const previous = () => {
    if (queue.length === 0) return;
    const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    const prevSong = queue[prevIndex];
    if (audioRef.current) {
      audioRef.current.src = prevSong.url;
      audioRef.current.play();
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
          audioRef.current.play();
        }
      } else if (loopMode !== 'none') {
        // Other repeat counts would be handled in the UI
        next();
      } else {
        next();
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
