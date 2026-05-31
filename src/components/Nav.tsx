import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { BookOpen, Search, Swords, User2, LogOut, Plus, Home } from "lucide-react";

export function Nav() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 glass-strong">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
            <BookOpen className="h-3.5 w-3.5" />
          </span>
          <span>MangHaven</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <NavLink to="/search" icon={<Search className="h-4 w-4" />} label="Search" />
          <NavLink to="/opinions" icon={<Swords className="h-4 w-4" />} label="Arena" />
          <NavLink to="/tier/new" icon={<Plus className="h-4 w-4" />} label="Tier" />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/me"
                className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-block"
              >
                Profile
              </Link>
              <button
                onClick={() => signOut()}
                className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur-md md:hidden">
        <MobileTab to="/" icon={<Home className="h-5 w-5" />} label="Home" />
        <MobileTab to="/search" icon={<Search className="h-5 w-5" />} label="Search" />
        <MobileTab to="/tier/new" icon={<Plus className="h-5 w-5" />} label="Tier" />
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
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      activeProps={{ className: "text-foreground bg-muted" }}
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
      activeProps={{ className: "text-foreground" }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
