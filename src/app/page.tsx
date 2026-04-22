"use client";

import Home from "@/views/Home";
import ProtectedRoute from "@/components/ProtectedRoute";
import MusicPlayer from "@/components/MusicPlayer";
import { useAuth } from "@/context/AuthContext";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <ProtectedRoute>
      <Home />
      {isAuthenticated ? <MusicPlayer /> : null}
    </ProtectedRoute>
  );
}
