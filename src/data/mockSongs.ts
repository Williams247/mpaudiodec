export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  thumbnail: string;
  description: string;
  categoryId: string;
  url: string; // audio file URL
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export const categories: Category[] = [
  { id: 'pop', name: 'Pop', color: 'from-pink-500 to-rose-500', icon: '🎤' },
  { id: 'rock', name: 'Rock', color: 'from-orange-500 to-red-500', icon: '🎸' },
  { id: 'hiphop', name: 'Hip-Hop', color: 'from-purple-500 to-indigo-500', icon: '🎙️' },
  { id: 'electronic', name: 'Electronic', color: 'from-blue-500 to-cyan-500', icon: '🎛️' },
  { id: 'jazz', name: 'Jazz', color: 'from-amber-500 to-yellow-500', icon: '🎺' },
  { id: 'classical', name: 'Classical', color: 'from-emerald-500 to-teal-500', icon: '🎻' },
];

// Using free audio URLs from Pixabay/Freepik for demo purposes
export const songs: Song[] = [
  // Pop
  {
    id: 'pop-1',
    title: 'Summer Vibes',
    artist: 'The Beats',
    duration: 210,
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
    description: 'Feel the energy of summer with this upbeat pop track',
    categoryId: 'pop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'pop-2',
    title: 'Midnight Dreams',
    artist: 'Luna Wave',
    duration: 245,
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
    description: 'A dreamy pop ballad about love and longing',
    categoryId: 'pop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'pop-3',
    title: 'Dancing Lights',
    artist: 'Echo Stars',
    duration: 195,
    thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=200&h=200&fit=crop',
    description: 'Get on the dance floor with this infectious pop hit',
    categoryId: 'pop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },

  // Rock
  {
    id: 'rock-1',
    title: 'Electric Storm',
    artist: 'Thunder Road',
    duration: 280,
    thumbnail: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=200&h=200&fit=crop',
    description: 'A powerful rock anthem with heavy guitar riffs',
    categoryId: 'rock',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'rock-2',
    title: 'Rebel Heart',
    artist: 'The Outlaws',
    duration: 240,
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
    description: 'Rock out with this emotional rock ballad',
    categoryId: 'rock',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },

  // Hip-Hop
  {
    id: 'hiphop-1',
    title: 'Urban Rhythm',
    artist: 'Street Kings',
    duration: 210,
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop',
    description: 'Hip-hop beats that make you move',
    categoryId: 'hiphop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    id: 'hiphop-2',
    title: 'Flow State',
    artist: 'Cipher Collective',
    duration: 225,
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
    description: 'Smooth hip-hop vibes with intricate lyrics',
    categoryId: 'hiphop',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },

  // Electronic
  {
    id: 'electronic-1',
    title: 'Neon Nights',
    artist: 'Synth Wave',
    duration: 260,
    thumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop',
    description: 'Electronic synth-pop with a retro feel',
    categoryId: 'electronic',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'electronic-2',
    title: 'Digital Dreams',
    artist: 'Pixel Sound',
    duration: 245,
    thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=200&h=200&fit=crop',
    description: 'Atmospheric electronic music for focus and relaxation',
    categoryId: 'electronic',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },

  // Jazz
  {
    id: 'jazz-1',
    title: 'Blue Note',
    artist: 'Jazz Quartet',
    duration: 290,
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
    description: 'Smooth jazz for a relaxing afternoon',
    categoryId: 'jazz',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'jazz-2',
    title: 'Late Night Session',
    artist: 'Midnight Jazz Ensemble',
    duration: 310,
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
    description: 'Late night jazz session with soulful improvisations',
    categoryId: 'jazz',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },

  // Classical
  {
    id: 'classical-1',
    title: 'Symphony No. 5',
    artist: 'Classical Philharmonic',
    duration: 420,
    thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=200&h=200&fit=crop',
    description: 'A timeless classical masterpiece',
    categoryId: 'classical',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];
