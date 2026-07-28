import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

async function resolveDestination(userId: string): Promise<"/onboarding" | "/"> {
  // Retry up to 3 times — the DB trigger may not have committed yet
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data } = await supabase
      .from("profiles")
      .select("username, city")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      return !data.username || !data.city ? "/onboarding" : "/";
    }

    if (attempt < 2) {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
    }
  }

  // Profile not found after retries — send to onboarding to let the user set it up
  return "/onboarding";
}

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Surface any error Supabase/Google put in the URL before attempting session exchange
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    const errorDescription = params.get("error_description");

    if (errorParam) {
      navigate("/login", {
        replace: true,
        state: {
          oauthError: errorDescription ?? "Prijava putem Google-a nije uspjela.",
        },
      });
      return;
    }

    // supabase-js v2 with detectSessionInUrl:true automatically exchanges
    // the PKCE code in the URL for a session. We listen for the result.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const destination = await resolveDestination(session.user.id);
        navigate(destination, { replace: true });
      }
    });

    // Also check if the session was already resolved before we subscribed
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        navigate("/login", {
          replace: true,
          state: { oauthError: "Prijava putem Google-a nije uspjela." },
        });
      } else if (session) {
        const destination = await resolveDestination(session.user.id);
        navigate(destination, { replace: true });
      }
      // No session yet — wait for onAuthStateChange above
    });

    // Safety net: if nothing resolves in 10 s, send the user back to login
    const timeout = setTimeout(() => {
      navigate("/login", {
        replace: true,
        state: { oauthError: "Prijava putem Google-a nije uspjela. Pokušajte ponovo." },
      });
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
