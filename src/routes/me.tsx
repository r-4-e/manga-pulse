import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/me")({
  component: Me,
});

function Me() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    (async () => {
      const { data } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
      if (data?.username) navigate({ to: "/u/$username", params: { username: data.username }, replace: true });
    })();
  }, [user, loading, navigate]);

  return <div className="py-20 text-center text-muted-foreground">Loading your profile...</div>;
}
