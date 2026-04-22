"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const resetPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  otpCode: z
    .string()
    .trim()
    .min(4, "OTP code is too short")
    .max(8, "OTP code is too long")
    .regex(/^\d+$/, "OTP code must be numeric"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password is too long"),
});

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams?.get("email")?.trim() ?? "";

  const [email, setEmail] = useState(emailFromQuery);

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [emailFromQuery]);
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    otpCode?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ email, otpCode, password });
    if (!parsed.success) {
      const nextErrors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: nextErrors.email?.[0],
        otpCode: nextErrors.otpCode?.[0],
        password: nextErrors.password?.[0],
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
      const result = await resetPassword(email, otpCode, password);
      setSuccess(result.message || "Password reset successful.");
      setTimeout(() => router.push("/login"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-800/50 backdrop-blur-xl rounded-2xl p-5 border border-zinc-700/50">
        <h1 className="text-xl font-bold text-white mb-5 text-left">Reset Password</h1>
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
              className="w-full px-4 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg text-white"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-400 text-left">{fieldErrors.email}</p>
            )}
          </div>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-zinc-200 mb-2 text-left">
              OTP Code
            </label>
            <input
              id="otp"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg text-white"
            />
            {fieldErrors.otpCode && (
              <p className="mt-1 text-xs text-red-400 text-left">{fieldErrors.otpCode}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-200 mb-2 text-left">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 pr-11 bg-zinc-700/50 border border-zinc-600 rounded-lg text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-3 text-zinc-300 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-400 text-left">{fieldErrors.password}</p>
            )}
          </div>
          {error && <p className="text-sm text-red-400 text-left">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

