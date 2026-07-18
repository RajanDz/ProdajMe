import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { Layout } from "../layout/Layout";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile?.is_suspended) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="max-w-sm text-center">
            <h1 className="text-xl font-bold mb-2">{t("profile.suspended")}</h1>
            <p className="text-muted-foreground text-sm">{t("profile.suspended_message")}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}
