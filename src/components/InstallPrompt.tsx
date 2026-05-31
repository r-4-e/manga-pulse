import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("mh_install_dismissed")) return;

    function onBIP(e: Event) {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", () => setVisible(false));
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (!visible || !evt) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-border bg-card p-3 shadow-lg md:bottom-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install MangHaven</p>
          <p className="truncate text-xs text-muted-foreground">
            Add to your home screen for faster access.
          </p>
        </div>
        <button
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            setVisible(false);
          }}
          className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
        >
          Install
        </button>
        <button
          onClick={() => {
            localStorage.setItem("mh_install_dismissed", "1");
            setVisible(false);
          }}
          aria-label="Dismiss"
          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
