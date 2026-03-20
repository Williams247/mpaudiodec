import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { categories, songs } from '@/data/mockSongs';
import type { Song } from '@/data/mockSongs';
import { LogOut, Music, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Home() {
  const { user, logout } = useAuth();
  const { play } = usePlayer();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleLogout = () => {
    logout();
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 pb-40 md:pb-48">
      {/* Sticky Header and Category Section */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-900/80 backdrop-blur-xl mb-4">
        {/* Header */}
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 p-2 rounded-lg">
              <Music className="w-4 h-4 text-black font-bold" />
            </div>
            <h2 className="text-md font-bold text-white pt-2">AudioDec</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400 hidden sm:inline">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Category Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 relative">
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
                className={`flex-shrink-0 px-4 md:px-6 py-1.5 rounded-full font-medium whitespace-nowrap transition text-sm ${
                  selectedCategory === 'all'
                    ? 'bg-green-500 text-black'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                All
              </button>

              {/* Category Tabs */}
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 px-4 md:px-6 py-1.5 rounded-full font-medium whitespace-nowrap transition flex items-center gap-2 text-sm ${
                    selectedCategory === category.id
                      ? 'bg-green-500 text-black'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
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

      <main>
        {/* Desktop Grid View */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-6 py-3">
          {filteredSongs.map((song) => (
            <div
              key={song.id}
              onClick={() => handlePlaySong(song)}
              className="group bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl overflow-hidden cursor-pointer transition transform hover:scale-105"
            >
              <div className="relative aspect-square overflow-hidden bg-zinc-900">
                {song.thumbnail ? (
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900">
                    <Music className="w-12 h-12 text-zinc-500" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition transform group-hover:scale-100 scale-90">
                    <svg
                      className="w-5 h-5 text-black ml-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white truncate text-sm">
                  {song.title}
                </h3>
                <p className="text-xs text-zinc-400 truncate">
                  {song.artist}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  {Math.floor(song.duration / 60)}:
                  {(song.duration % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile List View */}
        <div className="md:hidden space-y-2 px-4 mb-8">
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
                  {Math.floor(song.duration / 60)}:
                  {(song.duration % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
