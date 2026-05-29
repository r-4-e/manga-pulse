import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

interface Props {
  id: string;
  title: string;
  cover_url: string | null;
  author?: string | null;
}

export function MangaCard({ id, title, cover_url, author }: Props) {
  return (
    <Link
      to="/manga/$id"
      params={{ id }}
      className="group block overflow-hidden rounded-xl glass transition-all hover:scale-[1.02] hover:glow-magenta"
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
        {cover_url ? (
          <img
            src={cover_url}
            alt={title}
            loading="lazy"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <BookOpen className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight">{title}</h3>
        {author && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{author}</p>}
      </div>
    </Link>
  );
}
