"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { PlayerProvider } from "@/context/PlayerContext";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PwaInstallPrompt />
      <AuthProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}
