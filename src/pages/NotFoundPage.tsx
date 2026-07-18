import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Layout } from "../components/layout/Layout";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-8xl font-bold text-muted-foreground/30">404</p>
        <h1 className="text-2xl font-bold">{t("errors.not_found")}</h1>
        <p className="text-muted-foreground max-w-sm">
          Stranica koju tražite ne postoji ili je premještena.
        </p>
        <Button asChild>
          <Link to="/">Nazad na početnu</Link>
        </Button>
      </div>
    </Layout>
  );
}
