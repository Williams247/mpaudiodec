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
  music_url: string;
  thumbnail_url: string;
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

