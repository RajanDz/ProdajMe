import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
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

    // Guard prevents both paths from navigating twice
    let navigated = false;

    // supabase-js v2 with detectSessionInUrl:true automatically exchanges the PKCE
    // code in the URL for a session. We wait for that event, then hand off to
    // PostLoginGuard which performs the single onboarding decision for all providers.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        if (navigated) return;
        navigated = true;
        navigate("/", { replace: true });
      }
    });

    // Also check if the session was already resolved before we subscribed
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        navigate("/login", {
          replace: true,
          state: { oauthError: "Prijava putem Google-a nije uspjela." },
        });
        return;
      }
      if (session) {
        if (navigated) return;
        navigated = true;
        navigate("/", { replace: true });
      }
    });

    const timeout = setTimeout(() => {
      if (!navigated) {
        navigate("/login", {
          replace: true,
          state: { oauthError: "Prijava putem Google-a nije uspjela. Pokušajte ponovo." },
        });
      }
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
