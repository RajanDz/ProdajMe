import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface PostLoginGuardProps {
  children: React.ReactNode;
}

export function PostLoginGuard({ children }: PostLoginGuardProps) {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

  // Let all /auth/* pages (callback, confirm-email) render and handle themselves.
  if (location.pathname.startsWith("/auth/")) {
    return <>{children}</>;
  }

  // Wait for the initial auth check and any active profile fetch to complete
  // before making routing decisions. This prevents stale state from ever
  // triggering a redirect.
  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Unauthenticated — let the route render normally (public pages, login, etc.)
  if (!user || !profile) {
    return <>{children}</>;
  }

  // Authenticated with an incomplete onboarding — redirect to /onboarding.
  // The /onboarding path itself is excluded to avoid an infinite redirect loop.
  if (!profile.onboarding_completed && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
