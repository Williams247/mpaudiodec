export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  description: string;
  categoryId: string;
  url: string;
}

export interface Category {
  id: string;
  backendId?: string;
  name: string;
  icon: string;
}

export interface ApiMusic {
  id: string;
  title: string;
  filename?: string;
  music_url?: string;
  musicUrl?: string;
  signed_music_url?: string;
  signedMusicUrl?: string;
  url?: string;
  src?: string;
  link?: string;
  audio_url?: string;
  audioUrl?: string;
  file_url?: string;
  fileUrl?: string;
  thumbnail_url?: string;
  thumbnail?: string;
  duration: string;
  description?: string;
  category: string;
}

export interface ApiCategory {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

