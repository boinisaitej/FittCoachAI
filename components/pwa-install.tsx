"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "fitcoach.pwa.dismissed";

/**
 * Listens for the browser's beforeinstallprompt event and shows a small
 * bottom-right card prompting the user to install FitCoachAI as a PWA.
 * Dismissals are remembered for 14 days.
 */
export function PwaInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Skip if user dismissed recently
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissedAt < 14 * 86400_000) return;
    // Skip if already running as installed PWA
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;

    function onPrompt(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt as EventListener);

    // Register the service worker so the install criteria are met.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* sw is optional in dev */
      });
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt as EventListener);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && event && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="glass fixed bottom-4 right-4 z-40 w-72 rounded-2xl border p-4 shadow-2xl"
        >
          <button
            onClick={dismiss}
            className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 shadow-lg shadow-brand-500/30">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">Install FitCoachAI</div>
              <div className="text-[11px] text-muted-foreground">Faster, full-screen, offline-friendly.</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={dismiss} variant="ghost" size="sm" className="flex-1">
              Not now
            </Button>
            <Button onClick={install} variant="gradient" size="sm" className="flex-1">
              Install
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
