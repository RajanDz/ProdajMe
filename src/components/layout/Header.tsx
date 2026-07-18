import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, ChevronDown, User } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { useAuth } from "../../contexts/AuthContext";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { getAvatarUrl } from "../../lib/utils";
import { supabase } from "../../lib/supabase";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL ?? "";

export function Header() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate("/");
  };

  const avatarUrl =
    profile?.avatar_url
      ? getAvatarUrl(profile.avatar_url, SUPABASE_URL)
      : undefined;

  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-border shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-bold text-primary tracking-tight hover:opacity-90 transition-opacity"
          onClick={() => setMobileOpen(false)}
        >
          ProdajMe
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4">
          <Link
            to="/listings"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("nav.browse")}
          </Link>

          {user && (
            <Button asChild size="sm">
              <Link to="/listings/new">{t("nav.sell")}</Link>
            </Button>
          )}
        </nav>

        {/* Desktop right section */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-accent transition-colors"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <Avatar className="h-8 w-8">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.username ?? "avatar"} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{profile?.username}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-white shadow-lg py-1 z-50">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    {t("nav.profile")}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">{t("nav.register")}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white px-4 py-4 flex flex-col gap-3">
          <Link
            to="/listings"
            className="text-sm font-medium py-2 hover:text-primary transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            {t("nav.browse")}
          </Link>

          {user ? (
            <>
              <Link
                to="/listings/new"
                className="text-sm font-medium py-2 hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {t("nav.sell")}
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 text-sm font-medium py-2 hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <User className="h-4 w-4" />
                {t("nav.profile")}
              </Link>
              <button
                onClick={handleLogout}
                className="text-left text-sm font-medium py-2 text-destructive hover:opacity-80 transition-opacity"
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="outline" asChild>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  {t("nav.login")}
                </Link>
              </Button>
              <Button asChild>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  {t("nav.register")}
                </Link>
              </Button>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
