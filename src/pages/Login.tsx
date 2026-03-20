import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Music } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!login(email, password)) {
      setError("Please enter a valid email and password (min 6 characters)");
      setLoading(false);
      return;
    }

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-zinc-800/50 backdrop-blur-xl rounded-2xl p-5 border border-zinc-700/50">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-green-500 p-2.5 rounded-lg">
              <Music className="w-3 h-3 text-black" />
            </div>
            <h3 className="text-xl font-bold text-white">AudioDec</h3>
          </div>


          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-200 mb-2 text-left"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-200 mb-2 text-left"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-green-500 hover:bg-green-600 text-black font-bold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Demo info */}
        </div>
      </div>
    </div>
  );
}
