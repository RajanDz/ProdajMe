import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language === "en" ? "en" : "me";

  const toggle = () => {
    i18n.changeLanguage(currentLang === "me" ? "en" : "me");
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-1 rounded-lg border border-input bg-background px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
        className
      )}
      aria-label="Switch language"
    >
      <span className={cn(currentLang === "me" ? "text-foreground" : "text-muted-foreground")}>
        ME
      </span>
      <span className="text-muted-foreground">/</span>
      <span className={cn(currentLang === "en" ? "text-foreground" : "text-muted-foreground")}>
        EN
      </span>
    </button>
  );
}
