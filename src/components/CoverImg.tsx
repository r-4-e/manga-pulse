import { useState } from "react";
import { BookOpen } from "lucide-react";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Number of retries on load failure before showing fallback. */
  retries?: number;
}

/**
 * Manga cover image with skeleton placeholder and retry-on-fail behavior.
 */
export function CoverImg({ src, alt, className, retries = 2 }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-muted text-muted-foreground ${className ?? ""}`}>
        <BookOpen className="h-6 w-6 opacity-50" />
      </div>
    );
  }

  // Cache-bust on retry so the browser actually re-requests.
  const url = attempt > 0 ? `${src}${src.includes("?") ? "&" : "?"}r=${attempt}` : src;

  return (
    <div className={`relative overflow-hidden bg-muted ${className ?? ""}`}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/60 to-muted" />
      )}
      <img
        key={attempt}
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (attempt < retries) {
            setTimeout(() => setAttempt((a) => a + 1), 400 * (attempt + 1));
          } else {
            setFailed(true);
          }
        }}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
