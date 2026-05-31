import { Link } from "@tanstack/react-router";
import { CoverImg } from "./CoverImg";

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
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <CoverImg src={cover_url} alt={title} className="aspect-[2/3] w-full" />
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight">{title}</h3>
        {author && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{author}</p>}
      </div>
    </Link>
  );
}

