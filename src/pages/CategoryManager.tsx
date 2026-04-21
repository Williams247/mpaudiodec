import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  createMusicCategory,
  fetchMusicCategories,
} from "@/lib/api";
import type { Category } from "@/types/music";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";

export default function CategoryManager() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const categoryList = await fetchMusicCategories();
      setCategories(categoryList);
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
    if (!newCategoryTitle.trim()) return;
    setMessage("");
    setError("");
    setIsCreating(true);
    try {
      const result = await createMusicCategory(newCategoryTitle);
      setMessage(result.message || "Category created");
      setNewCategoryTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create category");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_45%),linear-gradient(170deg,#09090b_0%,#030304_100%)] p-4 md:p-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-700/40 bg-zinc-900/65 shadow-[0_30px_80px_rgba(0,0,0,0.5)] p-5 md:p-6 backdrop-blur-md">
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Category Manager</h1>
          </div>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-700/80 border border-zinc-600 px-3.5 py-2 text-sm text-white hover:bg-zinc-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>

        {loading && <p className="text-zinc-300">Loading...</p>}
        {error && <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 text-left">{error}</p>}
        {message && <p className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">{message}</p>}

        <div className="grid gap-6">
          <form onSubmit={handleCreateCategory} className="space-y-3 rounded-xl border border-zinc-700/80 bg-zinc-900/50 p-4 md:p-5">
            <h2 className="text-2xl font-semibold text-white">Create Music Category</h2>
            <input
              type="text"
              placeholder="Category title"
              value={newCategoryTitle}
              onChange={(e) => setNewCategoryTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            />
            <button
              type="submit"
              disabled={!newCategoryTitle.trim() || isCreating}
              className="w-full rounded-lg bg-green-500 py-2 font-semibold text-black disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isCreating ? "Creating..." : "Create"}
            </button>
          </form>
        </div>

        <div className="mt-7 rounded-xl border border-zinc-700/80 bg-zinc-900/45 p-4 md:p-5">
          <h2 className="mb-3 text-2xl font-semibold text-white">Current Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category.id} className="rounded-full bg-zinc-700/90 border border-zinc-600 px-3 py-1 text-sm text-zinc-100">
                {category.icon} {category.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

