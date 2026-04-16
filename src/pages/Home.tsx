import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { fetchMusic, fetchMusicCategories } from '@/lib/api';
import type { Song, Category } from '@/types/music';
import {
  LogOut,
  Music,
  ChevronLeft,
  ChevronRight,
  Play,
  Clock3,
  Search,
  Home as HomeIcon,
  Library,
  Disc3,
  Loader2,
} from 'lucide-react';

export default function Home() {
  const { user, logout } = useAuth();
  const { play, currentSong, isLoadingSong } = usePlayer();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
  const previewSong = currentSong ?? filteredSongs[0] ?? null;
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
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [musicList, categoryList] = await Promise.all([
          fetchMusic(),
          fetchMusicCategories(),
        ]);
        setSongs(musicList);
        setCategories(categoryList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch music data');
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

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

  return (
    <div className="min-h-screen bg-black pb-40 md:pb-48">
      {/* Sticky Header and Category Section */}
      <div className="sticky top-0 z-30 border-b border-zinc-800/70 bg-zinc-950/95 backdrop-blur-xl">
        {/* Header */}
        <header className="max-w-[1400px] mx-auto px-4 md:px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button className="hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 text-white">
              <Music className="w-5 h-5" />
            </button>
            <button className="hidden md:flex items-center justify-center w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white">
              <HomeIcon className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-3 rounded-full bg-zinc-900 border border-zinc-800 px-4 py-2.5 min-w-[360px]">
              <Search className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">What do you want to play?</span>
            </div>
            <h2 className="md:hidden text-lg font-semibold text-white">AudioDec</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => navigate('/categories')}
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
        {loading && (
          <div className="py-4 text-zinc-300">Loading music...</div>
        )}
        {error && !loading && (
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
                <p className="text-sm text-zinc-200/90">Category</p>
                <h2 className="mt-1 text-4xl lg:text-5xl font-bold text-white tracking-tight">
                  {selectedCategoryName}
                </h2>
                <p className="text-sm text-zinc-300 mt-3">{user?.email} • {filteredSongs.length} songs</p>
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
                <span>Title</span>
                <span className="justify-self-end"><Clock3 className="w-4 h-4" /></span>
              </div>
              <div className="max-h-[430px] overflow-y-auto scrollbar-hide">
                {filteredSongs.map((song, index) => (
                  <button
                    key={song.id}
                    onClick={() => handlePlaySong(song)}
                    className="w-full grid grid-cols-[56px_minmax(0,1fr)_120px] items-center px-4 py-3 text-left border-b border-zinc-900/80 last:border-b-0 hover:bg-zinc-800/40 transition"
                  >
                    <span className="text-sm text-zinc-500">
                      {isLoadingSong && currentSong?.id === song.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0">
                        {song.thumbnail ? (
                          <img
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center">
                            <Music className="w-4 h-4 text-zinc-500" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white">{song.title}</span>
                        <span className="block truncate text-xs text-zinc-400 mt-0.5">{song.artist}</span>
                      </span>
                    </span>
                    <span className="justify-self-end text-sm text-zinc-400">{formatDuration(song.duration)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="col-span-3 xl:col-span-3 rounded-xl border border-zinc-800/70 bg-zinc-950/95 p-4 lg:p-5">
            <p className="text-sm font-semibold text-white">{selectedCategoryName}</p>
            {previewSong ? (
              <div className="mt-4">
                <div className="aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80">
                  {previewSong.thumbnail ? (
                    <img
                      src={previewSong.thumbnail}
                      alt={previewSong.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-10 h-10 text-zinc-500" />
                    </div>
                  )}
                </div>
                <h3 className="mt-4 text-3xl font-bold text-white leading-tight">{previewSong.title}</h3>
                <p className="text-sm text-zinc-400 mt-1 truncate">{previewSong.artist}</p>
                <p className="text-xs text-zinc-500 mt-2">{formatDuration(previewSong.duration)}</p>
                <button
                  onClick={() => handlePlaySong(previewSong)}
                  className="mt-4 w-full rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-black hover:bg-green-400 transition"
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
                No tracks in this category yet.
              </div>
            )}
          </aside>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden space-y-2 mb-8">
          {filteredSongs.map((song) => (
            <div
              key={song.id}
              onClick={() => handlePlaySong(song)}
              className="flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg cursor-pointer transition"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-700">
                {song.thumbnail ? (
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-zinc-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate text-sm">
                  {song.title}
                </h3>
                <p className="text-xs text-zinc-400 truncate">
                  {song.artist}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-zinc-400">
                  {formatDuration(song.duration)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
