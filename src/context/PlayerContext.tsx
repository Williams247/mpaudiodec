'use client';

import { createContext, useContext, useState, useRef, useLayoutEffect, useCallback } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { Song } from '@/types/music';
import { getAuthToken } from '@/lib/api';
import {
  artworkMimeType,
  hasValidPresignedQuery,
  isBackblazeUrl,
} from '@/lib/mediaUrl';
import { pickSignedDownloadUrl, readUpstreamJson } from '@/lib/upstreamJson';

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
  /** Refresh queue/current track URLs after the library API rotates signed media links. */
  syncLibrarySongs: (librarySongs: Song[]) => void;

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
  const lastPositionStateSyncRef = useRef(0);
  const audioErrorRetriedRef = useRef(false);
  const currentSongRef = useRef<Song | null>(null);
  const isPlayingRef = useRef(false);
  const isLoadingSongRef = useRef(false);
  const controlsRef = useRef({
    pause: () => {},
    resume: () => {},
    next: () => {},
    previous: () => {},
    seek: (_time: number) => {},
  });
  currentSongRef.current = currentSong;
  isPlayingRef.current = isPlaying;
  isLoadingSongRef.current = isLoadingSong;

  /**
   * Same-origin stream for Backblaze (Range-friendly). Required for reliable lock-screen controls on iOS/Android.
   */
  const registerAudioProxySession = async (httpUrl: string) => {
    if (!isBackblazeUrl(httpUrl)) return httpUrl;

    try {
      const response = await fetch('/api/dev-audio-proxy/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: httpUrl }),
      });
      if (!response.ok) {
        console.warn('audio proxy session failed', response.status);
        return httpUrl;
      }
      const payload = (await response.json()) as { token?: string; id?: string };
      const streamKey = payload.token ?? payload.id;
      if (!streamKey) return httpUrl;
      return `/api/dev-audio-proxy/s/${encodeURIComponent(streamKey)}`;
    } catch (error) {
      console.warn('audio proxy session error', error);
      return httpUrl;
    }
  };

  const syncMediaSession = useCallback((song: Song, playing: boolean) => {
    if (!('mediaSession' in navigator)) return;
    try {
      const type = song.thumbnail ? artworkMimeType(song.thumbnail) : 'image/jpeg';
      const artwork = song.thumbnail
        ? (['96x96', '128x128', '256x256', '512x512'] as const).map((sizes) => ({
            src: song.thumbnail,
            sizes,
            type,
          }))
        : [];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        artwork,
      });
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    } catch (e) {
      console.warn('Media session metadata failed', e);
    }
  }, []);

  const updateMediaSessionPosition = useCallback(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) {
      return;
    }
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const now = Date.now();
    if (now - lastPositionStateSyncRef.current < 900) return;
    lastPositionStateSyncRef.current = now;
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(audio.currentTime, audio.duration),
      });
    } catch {
      /* Safari may reject until metadata is ready */
    }
  }, []);

  /** Private native B2 file URLs may need signing via POST /b2/sign-download. Presigned URLs from the API are returned unchanged. */
  const resolvePlayableUrl = async (originalUrl: string, options?: { forceSign?: boolean }) => {
    if (!originalUrl.trim() || !isBackblazeUrl(originalUrl)) {
      return originalUrl;
    }

    if (!options?.forceSign && hasValidPresignedQuery(originalUrl)) {
      return originalUrl;
    }

    const token = getAuthToken();
    const signEndpoints = ['/api/upstream/b2/sign-download', '/api/upstream/sign-download'];
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
      for (const signEndpoint of signEndpoints) {
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
          continue;
        }

        const payload = await readUpstreamJson(response);
        const signedUrl = pickSignedDownloadUrl(payload);
        if (signedUrl) {
          return signedUrl;
        }
      }

      console.warn(
        'Backblaze signing request failed on all endpoints; playback may fail for private objects',
      );
      return originalUrl;
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

  const loadAndPlaySongRef = useRef<
    (
      song: Song,
      requestId: number,
      options?: { forceSign?: boolean; resumeAt?: number },
    ) => Promise<void>
  >(async () => {});

  const loadAndPlaySong = async (
    song: Song,
    requestId: number,
    options?: { forceSign?: boolean; resumeAt?: number },
  ) => {
    if (!audioRef.current) return;
    if (!song.url?.trim()) {
      setIsPlaying(false);
      setIsLoadingSong(false);
      console.error('Song has no audio URL');
      return;
    }

    try {
      setIsLoadingSong(true);
      audioErrorRetriedRef.current = false;
      let resolvedUrl = await registerAudioProxySession(
        await resolvePlayableUrl(song.url, { forceSign: options?.forceSign }),
      );
      if (requestId !== playRequestRef.current || !audioRef.current) return;
      const audio = audioRef.current;
      audio.src = resolvedUrl;
      audio.load();
      let ready = await waitForMediaCanPlay(audio, requestId);
      if (!ready && !options?.forceSign) {
        resolvedUrl = await registerAudioProxySession(
          await resolvePlayableUrl(song.url, { forceSign: true }),
        );
        if (requestId !== playRequestRef.current || !audioRef.current) return;
        audio.src = resolvedUrl;
        audio.load();
        ready = await waitForMediaCanPlay(audio, requestId);
      }
      if (requestId !== playRequestRef.current || !audioRef.current) return;
      if (!ready) {
        setIsPlaying(false);
        setIsLoadingSong(false);
        return;
      }
      if (options?.resumeAt != null && options.resumeAt > 0) {
        audio.currentTime = options.resumeAt;
      }
      await playAudio();
      if (requestId === playRequestRef.current) {
        setIsLoadingSong(false);
        syncMediaSession(song, true);
        updateMediaSessionPosition();
      }
    } catch (error) {
      if (requestId !== playRequestRef.current) return;
      setIsPlaying(false);
      setIsLoadingSong(false);
      console.error('Unable to resolve playable URL', error);
    }
  };

  loadAndPlaySongRef.current = loadAndPlaySong;

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

    syncMediaSession(song, true);
  };

  const pause = () => {
    setIsPlaying(false);
    setIsLoadingSong(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (currentSong) syncMediaSession(currentSong, false);
  };

  const resume = () => {
    setIsPlaying(true);
    if (audioRef.current) {
      void playAudio();
    }
    if (currentSong) syncMediaSession(currentSong, true);
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
    syncMediaSession(nextSong, true);
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
    syncMediaSession(prevSong, true);
  };

  const syncLibrarySongs = useCallback((librarySongs: Song[]) => {
    const byId = new Map(librarySongs.map((s) => [s.id, s]));
    setQueue((prev) =>
      prev.map((track) => {
        const fresh = byId.get(track.id);
        return fresh ? { ...track, url: fresh.url, thumbnail: fresh.thumbnail } : track;
      }),
    );
    setCurrentSong((prev) => {
      if (!prev) return prev;
      const fresh = byId.get(prev.id);
      return fresh ? { ...prev, url: fresh.url, thumbnail: fresh.thumbnail } : prev;
    });

    const playing = currentSongRef.current;
    if (!playing || !audioRef.current) return;
    const fresh = byId.get(playing.id);
    if (!fresh?.url?.trim() || fresh.url === playing.url) return;
    if (!isPlayingRef.current && !isLoadingSongRef.current) return;

    const resumeAt = audioRef.current.currentTime;
    playRequestRef.current += 1;
    const requestId = playRequestRef.current;
    void loadAndPlaySongRef.current({ ...playing, url: fresh.url }, requestId, { resumeAt });
  }, []);

  nextRef.current = next;

  useLayoutEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      updateMediaSessionPosition();
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      updateMediaSessionPosition();
    };
    const handleError = () => {
      const failedSong = currentSongRef.current;
      if (
        !audioErrorRetriedRef.current &&
        failedSong?.url?.trim() &&
        isBackblazeUrl(failedSong.url)
      ) {
        audioErrorRetriedRef.current = true;
        const resumeAt = audio.currentTime;
        playRequestRef.current += 1;
        const requestId = playRequestRef.current;
        setIsPlaying(true);
        void loadAndPlaySongRef.current(failedSong, requestId, { forceSign: true, resumeAt });
        return;
      }
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
  }, [updateMediaSessionPosition]);

  const seek = (time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    updateMediaSessionPosition();
  };

  controlsRef.current = { pause, resume, next, previous, seek };

  useLayoutEffect(() => {
    if (!('mediaSession' in navigator)) return undefined;
    try {
      navigator.mediaSession.setActionHandler('play', () => controlsRef.current.resume());
      navigator.mediaSession.setActionHandler('pause', () => controlsRef.current.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => controlsRef.current.previous());
      navigator.mediaSession.setActionHandler('nexttrack', () => controlsRef.current.next());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) controlsRef.current.seek(details.seekTime);
      });
    } catch (e) {
      console.warn('Media session action handlers failed', e);
    }
    return undefined;
  }, []);

  useLayoutEffect(() => {
    const onVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio || document.visibilityState !== 'visible') return;
      if (isPlayingRef.current && audio.paused && !isLoadingSongRef.current) {
        void audio.play().catch(() => {
          setIsPlaying(false);
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

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
        syncLibrarySongs,
        audioRef,
      }}
    >
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
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
