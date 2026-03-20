import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed" | "unknown";
    platform: string;
  }>;
};

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches;

    if (isStandalone) return;
    if (dismissed) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  // const handleInstall = async () => {
  //   if (!deferredPrompt) return;
  //   try {
  //     await deferredPrompt.prompt();
  //     const choice = await deferredPrompt.userChoice;
  //     if (choice.outcome === "dismissed") {
  //       setDismissed(true);
  //     }
  //   } finally {
  //     setDeferredPrompt(null);
  //   }
  // };

  if (!deferredPrompt || dismissed) return null;

  // return (
  //   <button
  //     onClick={handleInstall}
  //     className="fixed bottom-5 right-5 z-50 rounded-lg bg-green-500 px-4 py-2 text-black font-bold shadow-lg hover:bg-green-600 transition"
  //     aria-label="Add to Home Screen"
  //     type="button"
  //   >
  //     Add to Home Screen
  //   </button>
  // );

  return null;
}
