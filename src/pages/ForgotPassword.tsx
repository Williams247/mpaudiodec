import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "@/lib/api";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      const nextErrors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: nextErrors.email?.[0],
      });
      setError("");
      setSuccess("");
      return;
    }

    setFieldErrors({});
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const result = await forgotPassword(email);
      setSuccess(result.message || "OTP sent. Check your email.");
      setTimeout(() => {
        navigate("/reset-password", { state: { email } });
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-800/50 backdrop-blur-xl rounded-2xl p-5 border border-zinc-700/50">
        <h1 className="text-xl font-bold text-white mb-5 text-left">Forgot Password</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-200 mb-2 text-left">
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
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full text-sm text-zinc-300 hover:text-white"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
