import { useEffect, useState } from "react";
import { LogoMark } from "./Logo";

export function Splash() {
  // Render nothing on SSR + initial client paint to avoid hydration mismatch.
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("mh_splash_seen")) return;
    sessionStorage.setItem("mh_splash_seen", "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), 1100);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-background animate-splash-out"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="text-foreground animate-splash-in">
          <LogoMark size={72} />
        </div>
        <div className="font-display text-lg font-semibold tracking-tight animate-splash-in">
          MangHaven
        </div>
      </div>
    </div>
  );
}
