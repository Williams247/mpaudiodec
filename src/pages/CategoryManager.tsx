import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  createMusicCategory,
  fetchMusic,
  fetchMusicCategories,
  updateMusicCategory,
} from "@/lib/api";
import type { Song, Category } from "@/types/music";

export default function CategoryManager() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [selectedMusicId, setSelectedMusicId] = useState("");
  const [newMusicCategory, setNewMusicCategory] = useState("");
  const [message, setMessage] = useState("");

  const selectedSong = useMemo(
    () => songs.find((song) => song.id === selectedMusicId) ?? null,
    [selectedMusicId, songs],
  );

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [musicList, categoryList] = await Promise.all([
        fetchMusic(),
        fetchMusicCategories(),
      ]);
      setSongs(musicList);
      setCategories(categoryList);
      if (!selectedMusicId && musicList.length > 0) {
        setSelectedMusicId(musicList[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const result = await createMusicCategory(newCategoryTitle);
      setMessage(result.message || "Category created");
      setNewCategoryTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create category");
    }
  };

  const handleUpdateMusicCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSong) {
      setError("Select a song first");
      return;
    }

    setMessage("");
    setError("");
    try {
      const result = await updateMusicCategory({
        id: selectedSong.id,
        category: selectedSong.categoryId,
        newCategory: newMusicCategory,
      });
      setMessage(result.message || "Music category updated");
      setNewMusicCategory("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update category");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-4 md:p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-700/50 bg-zinc-800/50 p-5 md:p-7">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Category Manager</h1>
          <button
            onClick={() => navigate("/")}
            className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-600"
          >
            Back to Home
          </button>
        </div>

        {loading && <p className="text-zinc-300">Loading...</p>}
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        {message && <p className="mb-4 text-sm text-green-400">{message}</p>}

        <div className="grid gap-6 md:grid-cols-2">
          <form onSubmit={handleCreateCategory} className="space-y-3 rounded-lg border border-zinc-700 p-4">
            <h2 className="text-sm font-semibold text-white">Create Music Category</h2>
            <input
              type="text"
              placeholder="Category title"
              value={newCategoryTitle}
              onChange={(e) => setNewCategoryTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-white"
            />
            <button
              type="submit"
              disabled={!newCategoryTitle.trim()}
              className="w-full rounded-lg bg-green-500 py-2 font-semibold text-black disabled:opacity-50"
            >
              Create
            </button>
          </form>

          <form onSubmit={handleUpdateMusicCategory} className="space-y-3 rounded-lg border border-zinc-700 p-4">
            <h2 className="text-sm font-semibold text-white">Update Music Category</h2>
            <select
              value={selectedMusicId}
              onChange={(e) => setSelectedMusicId(e.target.value)}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-white"
            >
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title} ({song.categoryId})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="New category name"
              value={newMusicCategory}
              onChange={(e) => setNewMusicCategory(e.target.value)}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-white"
            />
            <button
              type="submit"
              disabled={!selectedMusicId || !newMusicCategory.trim()}
              className="w-full rounded-lg bg-green-500 py-2 font-semibold text-black disabled:opacity-50"
            >
              Update
            </button>
          </form>
        </div>

        <div className="mt-7 rounded-lg border border-zinc-700 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Current Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category.id} className="rounded-full bg-zinc-700 px-3 py-1 text-sm text-zinc-100">
                {category.icon} {category.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

