import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Flame, Search, Swords, User2, LogOut, Plus } from "lucide-react";
import { useState } from "react";

export function Nav() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 glass-strong border-b border-white/5">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--gradient-primary)] glow-magenta">
            <Flame className="h-4 w-4 text-background" />
          </span>
          <span className="text-gradient">Mangaverse</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          <NavLink to="/search" icon={<Search className="h-4 w-4" />} label="Search" />
          <NavLink to="/opinions" icon={<Swords className="h-4 w-4" />} label="Arena" />
          <NavLink to="/tier/new" icon={<Plus className="h-4 w-4" />} label="Tier" />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/me"
                className="hidden rounded-full px-3 py-1.5 text-sm hover:bg-white/5 sm:inline-block"
              >
                Profile
              </Link>
              <button
                onClick={() => signOut()}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-muted-foreground hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-[var(--gradient-primary)] px-4 py-2 text-sm font-semibold text-background glow-magenta transition-transform hover:scale-[1.03]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-white/10 bg-background/90 backdrop-blur-xl md:hidden">
        <MobileTab to="/" icon={<Flame className="h-5 w-5" />} label="Home" />
        <MobileTab to="/search" icon={<Search className="h-5 w-5" />} label="Search" />
        <MobileTab to="/opinions" icon={<Swords className="h-5 w-5" />} label="Arena" />
        <MobileTab to="/me" icon={<User2 className="h-5 w-5" />} label="Me" />
      </nav>
    </header>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
      activeProps={{ className: "text-foreground bg-white/5" }}
    >
      {icon}
      {label}
    </Link>
  );
}

function MobileTab({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] text-muted-foreground"
      activeProps={{ className: "text-primary" }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
