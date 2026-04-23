'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import CoverArt from '@/components/CoverArt';
import { fetchMusic, fetchMusicCategories } from '@/lib/api';
import type { Song, Category } from '@/types/music';
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Play,
  Clock3,
  Search,
  Home as HomeIcon,
  Library,
  Disc3,
  Loader2,
  Volume2,
} from 'lucide-react';

const MEDIA_URLS_EXPIRES_AT_KEY = 'mediaUrlsExpiresAt';

export default function Home() {
  const { user, logout } = useAuth();
  const { play, currentSong, isLoadingSong, isPlaying } = usePlayer();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  /** Unix ms from API `media_urls_expires_at` — used to schedule silent URL refresh (Cloudinary signed URLs). */
  const [mediaUrlsExpiresAt, setMediaUrlsExpiresAt] = useState<number | null>(null);
  const [sessionStateLoaded, setSessionStateLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handlePlaySong = (song: Song) => {
    const categoryId = song.categoryId;
    const categorySongs = selectedCategory === 'all'
      ? songs
      : songs.filter((s) => s.categoryId === categoryId);
    const index = categorySongs.findIndex((s) => s.id === song.id);
    play(song, categorySongs.slice(index));
  };

  const filteredSongs = selectedCategory === 'all'
    ? songs
    : songs.filter((song) => song.categoryId === selectedCategory);
  const visibleSongs = filteredSongs.filter((song) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
  });
  
  const previewSong = currentSong ?? visibleSongs[0] ?? null;
  const selectedCategoryName = selectedCategory === 'all'
    ? 'All Music'
    : categories.find((category) => category.id === selectedCategory)?.name ?? 'Category';
  const emailInitial = user?.email?.trim().charAt(0).toUpperCase() || 'U';

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(MEDIA_URLS_EXPIRES_AT_KEY);
    if (!saved) {
      setSessionStateLoaded(true);
      return;
    }
    const parsed = Number(saved);
    if (Number.isFinite(parsed) && parsed > Date.now()) {
      setMediaUrlsExpiresAt(parsed);
    }
    setSessionStateLoaded(true);
  }, []);

  useEffect(() => {
    if (!sessionStateLoaded) return;
    if (mediaUrlsExpiresAt == null) {
      sessionStorage.removeItem(MEDIA_URLS_EXPIRES_AT_KEY);
      return;
    }
    sessionStorage.setItem(MEDIA_URLS_EXPIRES_AT_KEY, String(mediaUrlsExpiresAt));
  }, [mediaUrlsExpiresAt, sessionStateLoaded]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [musicResult, categoryList] = await Promise.all([
          fetchMusic(),
          fetchMusicCategories(),
        ]);
        setSongs(musicResult.songs);
        setMediaUrlsExpiresAt(musicResult.mediaUrlsExpiresAt);
        setCategories(categoryList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch music data');
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  // Align with API `media_urls_expires_at`: refresh the library shortly before signed URLs expire.
  useEffect(() => {
    if (mediaUrlsExpiresAt == null) return;
    const delay = Math.max(10_000, mediaUrlsExpiresAt - Date.now() - 30_000);
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const next = await fetchMusic();
          setSongs(next.songs);
          setMediaUrlsExpiresAt(next.mediaUrlsExpiresAt);
        } catch {
          /* keep existing songs; next navigation or manual refresh can recover */
        }
      })();
    }, delay);
    return () => window.clearTimeout(id);
  }, [mediaUrlsExpiresAt]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 300);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-300">
          <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          <p className="text-sm tracking-wide">Loading music...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-40 md:pb-48">
      {/* Sticky Header and Category Section */}
      <div className="sticky top-0 z-30 border-b border-zinc-800/70 bg-zinc-950/95 backdrop-blur-xl">
        {/* Header */}
        <header className="max-w-[1400px] mx-auto px-4 md:px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button className="hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 shadow-[0_0_20px_rgba(34,197,94,0.2)] overflow-hidden">
              <img src="/favicon.png" alt="MpAudioDec icon" className="w-full h-full object-cover" />
            </button>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
              title="All categories"
            >
              <HomeIcon className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-3 rounded-full bg-zinc-900 border border-zinc-800 px-4 py-2.5 min-w-[360px]">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What do you want to play?"
                className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
            <h2 className="md:hidden text-lg font-semibold text-white">MpAudioDec</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => router.push('/categories')}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-full text-sm hover:bg-zinc-200 transition"
            >
              Categories
            </button>
            <button
              onClick={handleLogout}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full border border-zinc-700/70 transition text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
            <button
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-500 text-black font-bold flex items-center justify-center"
              title={user?.email || 'User'}
            >
              {emailInitial}
            </button>
          </div>
        </header>

        {/* Category Tabs */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-5 py-3 md:py-4 relative md:hidden">
          <div className="flex items-center gap-2">
            {/* Left Scroll Button */}
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-gradient-to-r from-zinc-950 to-transparent hover:from-zinc-900 transition"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Tabs Container */}
            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className="flex gap-2 overflow-x-auto scrollbar-hide px-0"
              style={{ scrollBehavior: 'smooth' }}
            >
              {/* All Button */}
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 px-4 md:px-6 py-2 rounded-full font-medium whitespace-nowrap transition text-sm border ${
                  selectedCategory === 'all'
                    ? 'bg-green-500 text-black border-green-400'
                    : 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                All
              </button>

              {/* Category Tabs */}
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 px-4 md:px-6 py-2 rounded-full font-medium whitespace-nowrap transition flex items-center gap-2 text-sm border ${
                    selectedCategory === category.id
                      ? 'bg-green-500 text-black border-green-400'
                      : 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  <span className="hidden md:inline">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>

            {/* Right Scroll Button */}
            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-gradient-to-l from-zinc-950 to-transparent hover:from-zinc-900 transition"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 md:px-5 py-4 md:py-5">
        {error && (
          <div className="py-4 text-red-400">{error}</div>
        )}

        {/* Desktop Spotify-style layout (no left sidebar) */}
        <div className="hidden md:grid grid-cols-12 gap-3">
          <aside className="col-span-3 xl:col-span-3 rounded-xl border border-zinc-800/70 bg-zinc-950/95 p-4">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold">
              <Library className="w-4 h-4" />
              <span>Your Library</span>
            </div>
            <div className="mt-3 space-y-1.5 max-h-[620px] overflow-y-auto scrollbar-hide pr-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left rounded-lg px-3 py-2.5 transition ${
                  selectedCategory === 'all' ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900 text-zinc-300'
                }`}
              >
                <div className="font-medium">All Music</div>
                <div className="text-xs text-zinc-500 mt-0.5">{songs.length} tracks</div>
              </button>
              {categories.map((category) => {
                const categoryCount = songs.filter((song) => song.categoryId === category.id).length;
                const isActive = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left rounded-lg px-3 py-2.5 transition ${
                      isActive ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    <div className="font-medium flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span className="truncate">{category.name}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{categoryCount} tracks</div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="col-span-6 xl:col-span-6 rounded-xl border border-zinc-800/70 overflow-hidden bg-zinc-950/95">
            <div className="bg-gradient-to-b from-indigo-700/70 via-indigo-900/30 to-zinc-950 px-5 py-6">
              <div>
                <p className="text-sm lg:text-base font-medium uppercase tracking-[0.18em] text-zinc-200/85">Category</p>
                <h2 className="mt-2 text-sm md:text-md lg:text-lg font-black text-white tracking-[-0.03em] leading-[0.85]">
                  {selectedCategoryName}
                </h2>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                {previewSong && (
                  <button
                    onClick={() => handlePlaySong(previewSong)}
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500 text-black hover:bg-green-400 transition"
                  >
                    <Play className="w-5 h-5 fill-black ml-0.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-[56px_minmax(0,1fr)_120px] items-center px-4 py-3 text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-800/80">
                <span>#</span>
                <span className="pl-[52px]">Title</span>
                <span className="justify-self-start"><Clock3 className="w-4 h-4" /></span>
              </div>
              <div className="max-h-[430px] overflow-y-auto scrollbar-hide">
                {visibleSongs.map((song, index) => {
                  const isActiveSong = currentSong?.id === song.id;
                  const isSongLoading = isLoadingSong && isActiveSong;
                  const isSongPlaying = isPlaying && isActiveSong && !isSongLoading;

                  return (
                    <button
                      key={song.id}
                      onClick={() => handlePlaySong(song)}
                      className={`w-full grid grid-cols-[56px_minmax(0,1fr)_120px] items-center px-4 py-3 text-left border-b border-zinc-900/80 last:border-b-0 transition ${
                        isActiveSong
                          ? 'bg-zinc-800/55'
                          : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      <span className="text-sm text-zinc-500">
                        {isSongLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                        ) : isSongPlaying ? (
                          <Volume2 className="w-4 h-4 text-green-400" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0">
                        <CoverArt
                          src={song.thumbnail}
                          alt={song.title}
                          className="w-full h-full object-cover"
                          iconClassName="w-4 h-4 text-zinc-500"
                        />
                        </span>
                        <span className="min-w-0">
                          <span className={`block truncate text-sm font-medium ${isActiveSong ? 'text-green-400' : 'text-white'}`}>
                            {song.title}
                          </span>
                          <span className={`block truncate text-xs mt-0.5 ${isActiveSong ? 'text-zinc-300' : 'text-zinc-400'}`}>
                            {song.artist}
                          </span>
                        </span>
                      </span>
                      <span className={`justify-self-end text-sm ${isActiveSong ? 'text-green-400' : 'text-zinc-400'}`}>
                        {formatDuration(song.duration)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="col-span-3 xl:col-span-3 rounded-xl border border-zinc-800/70 bg-gradient-to-b from-zinc-950 to-black p-4 lg:p-5">
            {previewSong ? (
              <div className="mt-4">
                <div className="aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80">
                  <CoverArt
                    src={previewSong.thumbnail}
                    alt={previewSong.title}
                    className="w-full h-full object-cover"
                    iconClassName="w-10 h-10 text-zinc-500"
                  />
                </div>
                <h3 className="mt-4 text-2xl lg:text-3xl font-bold text-white leading-tight break-words">
                  {previewSong.title}
                </h3>
                <p className="text-sm text-zinc-400 mt-2 truncate">{previewSong.artist}</p>
                <p className="text-xs text-zinc-500 mt-2">{formatDuration(previewSong.duration)}</p>
                <button
                  onClick={() => handlePlaySong(previewSong)}
                  className="mt-5 w-full rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-black hover:bg-green-400 transition"
                >
                  Play this track
                </button>
                <div className="mt-5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/70">
                  <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">About this category</div>
                  <div className="text-sm text-zinc-300 flex items-center gap-2">
                    <Disc3 className="w-4 h-4 text-zinc-500" />
                    <span>{selectedCategoryName} playlist</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-500 text-sm">
                No tracks found for this search.
              </div>
            )}
          </aside>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden space-y-2 mb-8">
          {visibleSongs.map((song) => {
            const isActiveSong = currentSong?.id === song.id;
            const isSongLoading = isLoadingSong && isActiveSong;
            const isSongPlaying = isPlaying && isActiveSong && !isSongLoading;

            return (
              <button
                key={song.id}
                type="button"
                onClick={() => handlePlaySong(song)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition border ${
                  isActiveSong
                    ? 'bg-zinc-800/80 border-green-500/45 ring-1 ring-green-500/15'
                    : 'bg-zinc-800/50 border-transparent hover:bg-zinc-700/50'
                }`}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-700 ring-1 ring-black/20">
                  <CoverArt
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-full h-full object-cover"
                    iconClassName="w-5 h-5 text-zinc-400"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-semibold truncate text-sm ${
                      isActiveSong ? 'text-green-400' : 'text-white'
                    }`}
                  >
                    {song.title}
                  </h3>
                  <p
                    className={`text-xs truncate mt-0.5 ${
                      isActiveSong ? 'text-zinc-300' : 'text-zinc-400'
                    }`}
                  >
                    {song.artist}
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1 min-w-[2.25rem]">
                  {isSongLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-green-400" aria-hidden />
                  ) : isSongPlaying ? (
                    <Volume2 className="w-4 h-4 text-green-400" aria-hidden />
                  ) : null}
                  <p
                    className={`text-xs tabular-nums ${
                      isActiveSong ? 'text-green-400' : 'text-zinc-400'
                    }`}
                  >
                    {formatDuration(song.duration)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
