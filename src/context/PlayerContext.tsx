'use client';

import { createContext, useContext, useState, useRef, useLayoutEffect } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { Song } from '@/types/music';
import { getAuthToken } from '@/lib/api';

type LoopMode = 'none' | '1x' | '2x' | '3x' | '4x' | '5x' | '6x' | 'forever';

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoadingSong: boolean;
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
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loopMode, setLoopMode] = useState<LoopMode>('none');
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const playRequestRef = useRef(0);
  const loopModeRef = useRef(loopMode);
  loopModeRef.current = loopMode;
  const nextRef = useRef<() => void>(() => {});

  const isBackblazeUrl = (value: string) =>
    value.includes('backblazeb2.com') || value.includes('backblaze');

  /**
   * API may return S3-compatible presigned URLs (Signature + Expires, or X-Amz-*).
   * Those must be used as-is — the dev B2 signer only understands native B2 file URLs and would 500 or replace a valid URL incorrectly.
   */
  const isAlreadyAuthorizedDownloadUrl = (urlString: string) => {
    try {
      const u = new URL(urlString);
      const q = u.searchParams;
      const nowEpochSeconds = Math.floor(Date.now() / 1000);

      const isExpiredLegacySignature = () => {
        const expiresRaw = q.get('Expires');
        if (!expiresRaw) return false;
        const expiresAt = Number(expiresRaw);
        if (!Number.isFinite(expiresAt)) return false;
        return nowEpochSeconds >= expiresAt - 10;
      };

      const isExpiredAmzSignature = () => {
        const amzDate = q.get('X-Amz-Date');
        const amzExpires = q.get('X-Amz-Expires');
        if (!amzDate || !amzExpires) return false;
        // Format: YYYYMMDDTHHmmssZ
        const match = amzDate.match(
          /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
        );
        if (!match) return false;
        const [, y, m, d, hh, mm, ss] = match;
        const issuedAtMs = Date.UTC(
          Number(y),
          Number(m) - 1,
          Number(d),
          Number(hh),
          Number(mm),
          Number(ss),
        );
        const ttlSeconds = Number(amzExpires);
        if (!Number.isFinite(issuedAtMs) || !Number.isFinite(ttlSeconds)) {
          return false;
        }
        const expiresAt = Math.floor(issuedAtMs / 1000) + ttlSeconds;
        return nowEpochSeconds >= expiresAt - 10;
      };

      if (q.has('X-Amz-Algorithm') || q.has('X-Amz-Credential') || q.has('X-Amz-Signature')) {
        return !isExpiredAmzSignature();
      }
      if (q.has('Signature') || q.has('AWSAccessKeyId')) {
        return !isExpiredLegacySignature();
      }
      // Native B2 download tokens
      if (q.has('Authorization') && u.pathname.includes('/file/')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  /**
   * Dev/preview: register the real Backblaze URL via POST, then play a short same-origin path.
   * Nesting presigned URLs in `?url=` breaks signatures (double-encoded `%`).
   */
  const registerDevAudioProxySession = async (httpUrl: string) => {
    if (process.env.NODE_ENV !== 'development') return httpUrl;
    try {
      const u = new URL(httpUrl);
      const host = u.hostname.toLowerCase();
      if (!host.includes('backblazeb2.com') && !host.includes('backblaze')) {
        return httpUrl;
      }
    } catch {
      return httpUrl;
    }

    const response = await fetch('/api/dev-audio-proxy/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: httpUrl }),
    });
    if (!response.ok) {
      console.warn('dev-audio-proxy session failed', response.status);
      return httpUrl;
    }
    const payload = (await response.json()) as { id?: string };
    if (!payload.id) return httpUrl;
    return `/api/dev-audio-proxy/s/${payload.id}`;
  };

  /** Private native B2 file URLs may need signing via POST /b2/sign-download. Presigned URLs from the API are returned unchanged. */
  const resolvePlayableUrl = async (originalUrl: string) => {
    if (!originalUrl.trim() || !isBackblazeUrl(originalUrl)) {
      return originalUrl;
    }

    if (isAlreadyAuthorizedDownloadUrl(originalUrl)) {
      return originalUrl;
    }

    const token = getAuthToken();
    const signEndpoint = '/api/upstream/sign-download';
    const getFileNameFromBackblazeUrl = (urlString: string) => {
      try {
        const u = new URL(urlString);
        const decodeSafe = (value: string) => {
          try {
            return decodeURIComponent(value);
          } catch {
            return value;
          }
        };
        const normalizedPath = u.pathname.replace(/^\/+/, '');
        if (!normalizedPath) return '';

        // Native B2 form: /file/<bucket>/<path/to/object>
        const marker = 'file/';
        const markerIdx = normalizedPath.indexOf(marker);
        if (markerIdx >= 0) {
          const afterFile = normalizedPath.slice(markerIdx + marker.length);
          const slashIdx = afterFile.indexOf('/');
          if (slashIdx >= 0) {
            const encodedFileName = afterFile.slice(slashIdx + 1);
            return decodeSafe(encodedFileName).trim();
          }
        }

        const segments = normalizedPath.split('/').filter(Boolean);
        if (segments.length === 0) return '';

        // Path-style form: /<bucket>/<path/to/object>
        if (segments.length >= 2) {
          return decodeSafe(segments.slice(1).join('/')).trim();
        }

        // Virtual-hosted style fallback: host is bucket, path is object key.
        return decodeSafe(segments.join('/')).trim();
      } catch {
        return '';
      }
    };
    const sourceFileName = getFileNameFromBackblazeUrl(originalUrl);

    // Laravel validators usually expect snake_case keys (`file_name`, `source_url`).
    const signBody = sourceFileName
      ? { file_name: sourceFileName, fileName: sourceFileName }
      : { source_url: originalUrl, sourceUrl: originalUrl };

    try {
      const response = await fetch(signEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(signBody),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        console.warn(
          'Backblaze signing request failed; playback may fail for private objects',
          payload?.message ?? response.status,
        );
        return originalUrl;
      }

      const payload = (await response.json()) as { url?: string };
      if (!payload.url) {
        return originalUrl;
      }

      return payload.url;
    } catch (error) {
      console.warn('Backblaze signing request error; using original URL', error);
      return originalUrl;
    }
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

  const waitForMediaCanPlay = (el: HTMLMediaElement, requestId: number) =>
    new Promise<boolean>((resolve) => {
      if (requestId !== playRequestRef.current) {
        resolve(false);
        return;
      }
      if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        resolve(true);
        return;
      }
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        // Avoid hanging spinner forever when browsers never emit canplay/error.
        finish(el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
      }, 8000);
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        el.removeEventListener('canplay', onCanPlay);
        el.removeEventListener('error', onError);
        resolve(ok);
      };
      const onCanPlay = () => {
        if (requestId !== playRequestRef.current) finish(false);
        else finish(true);
      };
      const onError = () => finish(false);
      el.addEventListener('canplay', onCanPlay);
      el.addEventListener('error', onError);
    });

  const loadAndPlaySong = async (song: Song, requestId: number) => {
    if (!audioRef.current) return;
    if (!song.url?.trim()) {
      setIsPlaying(false);
      setIsLoadingSong(false);
      console.error('Song has no audio URL');
      return;
    }

    try {
      setIsLoadingSong(true);
      const resolvedUrl = await registerDevAudioProxySession(await resolvePlayableUrl(song.url));
      if (requestId !== playRequestRef.current || !audioRef.current) return;
      const audio = audioRef.current;
      audio.src = resolvedUrl;
      audio.load();
      const ready = await waitForMediaCanPlay(audio, requestId);
      if (requestId !== playRequestRef.current || !audioRef.current) return;
      if (!ready) {
        setIsPlaying(false);
        setIsLoadingSong(false);
        return;
      }
      await playAudio();
      if (requestId === playRequestRef.current) {
        setIsLoadingSong(false);
      }
    } catch (error) {
      if (requestId !== playRequestRef.current) return;
      setIsPlaying(false);
      setIsLoadingSong(false);
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
    const start = () => {
      void loadAndPlaySong(song, requestId);
    };
    if (audioRef.current) {
      start();
    } else {
      queueMicrotask(start);
    }

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          artwork: song.thumbnail
            ? [
                {
                  src: song.thumbnail,
                  sizes: '512x512',
                  type: 'image/jpeg',
                },
              ]
            : [],
        });
        navigator.mediaSession.setActionHandler('play', resume);
        navigator.mediaSession.setActionHandler('pause', pause);
        navigator.mediaSession.setActionHandler('previoustrack', previous);
        navigator.mediaSession.setActionHandler('nexttrack', next);
      } catch (e) {
        console.warn('Media session metadata failed', e);
      }
    }
  };

  const pause = () => {
    setIsPlaying(false);
    setIsLoadingSong(false);
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

  nextRef.current = next;

  useLayoutEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    const handleError = () => {
      setIsPlaying(false);
      setIsLoadingSong(false);
      if (audio.currentSrc) {
        console.error('Audio element failed loading source', audio.currentSrc);
      }
    };
    const handleEnded = () => {
      if (loopModeRef.current === 'forever') {
        audio.currentTime = 0;
        void audio.play().catch(() => {
          setIsPlaying(false);
        });
      } else {
        nextRef.current();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const seek = (time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        isLoadingSong,
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
      <audio
        ref={audioRef}
        playsInline
        preload="metadata"
        style={{ display: 'none' }}
        aria-hidden
      />
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
