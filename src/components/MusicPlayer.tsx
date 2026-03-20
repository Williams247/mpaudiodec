import { useState, useEffect } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import LoopModal from './LoopModal';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Repeat,
  Music,
} from 'lucide-react';

export default function MusicPlayer() {
  const {
    currentSong,
    isPlaying,
    duration,
    currentTime,
    loopMode,
    pause,
    resume,
    next,
    previous,
    seek,
  } = usePlayer();

  const [isLoopModalOpen, setIsLoopModalOpen] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  useEffect(() => {
    const audioRef = document.querySelector('audio');
    if (audioRef) {
      audioRef.volume = volume / 100;
    }
  }, [volume]);

  if (!currentSong) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-zinc-900 to-zinc-800 border-t border-zinc-700/50 backdrop-blur-xl z-40 shadow-2xl">
        {/* Progress Bar */}
        <div
          className="h-1 bg-green-500 transition-all duration-100 cursor-pointer hover:h-1.5"
          style={{ width: `${progress}%` }}
          onClick={(e) => {
            const rect = e.currentTarget.parentElement?.getBoundingClientRect();
            if (rect) {
              const percent = (e.clientX - rect.left) / rect.width;
              seek(percent * duration);
            }
          }}
        />

        <div className="px-3 md:px-6 py-3 md:py-4">
          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* Song Info - Mobile */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-700">
                {currentSong.thumbnail ? (
                  <img
                    src={currentSong.thumbnail}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {currentSong.title}
                </p>
                <p className="text-xs text-zinc-400 truncate">
                  {currentSong.artist}
                </p>
              </div>
            </div>

            {/* Progress Bar - Mobile (Large and Easy to Tap) */}
            <div className="mb-3">
              <div
                className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden cursor-pointer hover:h-3 transition-all"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  seek(percent * duration);
                }}
              >
                <div
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls - Mobile */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={previous}
                className="p-2 hover:bg-zinc-700 rounded-full transition"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={isPlaying ? pause : resume}
                className="p-2.5 bg-green-500 hover:bg-green-600 text-black rounded-full transition"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </button>
              <button
                onClick={next}
                className="p-2 hover:bg-zinc-700 rounded-full transition"
              >
                <SkipForward className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setIsLoopModalOpen(true)}
                className={`p-2 rounded-full transition ${
                  loopMode !== 'none'
                    ? 'bg-green-500 text-black'
                    : 'hover:bg-zinc-700 text-white'
                }`}
              >
                <Repeat className="w-5 h-5" />
              </button>
              <div className="flex-shrink-0 relative">
                <button
                  onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                  className="p-2 hover:bg-zinc-700 rounded-full transition"
                >
                  <Volume2 className="w-5 h-5 text-white" />
                </button>

                {/* Volume Slider Dropdown */}
                {showVolumeSlider && (
                  <div className="absolute bottom-full right-0 mb-2 bg-zinc-800 rounded-lg p-4 border border-zinc-700 shadow-lg z-50" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-3 w-40">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-700 rounded-full accent-green-500 cursor-pointer"
                      />
                      <div className="text-center">
                        <span className="text-sm text-zinc-200 font-semibold">{volume}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center gap-3 md:gap-4">
            {/* Song Info - Left Section */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 min-w-0 w-32 md:w-56">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-700">
                {currentSong.thumbnail ? (
                  <img
                    src={currentSong.thumbnail}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-semibold text-white truncate">
                  {currentSong.title}
                </p>
                <p className="text-xs text-zinc-400 truncate hidden md:block">
                  {currentSong.artist}
                </p>
              </div>
            </div>

            {/* Controls - Center Section */}
            <div className="flex items-center justify-center gap-2 md:gap-3 flex-shrink-0">
              <button
                onClick={previous}
                className="p-1.5 md:p-2 hover:bg-zinc-700 rounded-full transition"
              >
                <SkipBack className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </button>
              <button
                onClick={isPlaying ? pause : resume}
                className="p-2 md:p-2.5 bg-green-500 hover:bg-green-600 text-black rounded-full transition"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 md:w-6 md:h-6" />
                ) : (
                  <Play className="w-5 h-5 md:w-6 md:h-6 ml-0.5" />
                )}
              </button>
              <button
                onClick={next}
                className="p-1.5 md:p-2 hover:bg-zinc-700 rounded-full transition"
              >
                <SkipForward className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </button>
              <button
                onClick={() => setIsLoopModalOpen(true)}
                className={`p-1.5 md:p-2 rounded-full transition ${
                  loopMode !== 'none'
                    ? 'bg-green-500 text-black'
                    : 'hover:bg-zinc-700 text-white'
                }`}
              >
                <Repeat className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* Progress Bar - Right Section */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                seek(percent * duration);
              }}>
                <div
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Time Display - Far Right */}
              <div className="flex items-center gap-1 text-xs text-zinc-400 flex-shrink-0 whitespace-nowrap">
                <span>{formatTime(currentTime)}</span>
                <span className="hidden sm:inline">/</span>
                <span className="hidden sm:inline">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume Control Button */}
            <div className="flex-shrink-0 relative">
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className="p-1.5 md:p-2 hover:bg-zinc-700 rounded-full transition"
              >
                <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </button>

              {/* Volume Slider Dropdown */}
              {showVolumeSlider && (
                <div className="absolute bottom-full right-0 mb-2 bg-zinc-800 rounded-lg p-4 border border-zinc-700 shadow-lg z-50" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-3 w-40">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 rounded-full accent-green-500 cursor-pointer"
                    />
                    <div className="text-center">
                      <span className="text-sm text-zinc-200 font-semibold">{volume}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Close volume slider when clicking elsewhere */}
      {showVolumeSlider && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowVolumeSlider(false)}
        />
      )}

      <LoopModal
        isOpen={isLoopModalOpen}
        onClose={() => setIsLoopModalOpen(false)}
      />
    </>
  );
}
