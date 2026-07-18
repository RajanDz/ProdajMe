import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Check } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ListingGrid } from "../components/listings/ListingGrid";
import { Layout } from "../components/layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { CATEGORIES } from "../constants/categories";
import type { Listing } from "../types";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const showMeLocale = i18n.language !== "en";

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select(
        "*, listing_images(*), profiles(id,username,avatar_url,city,phone), categories(slug,name_me,name_en)"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(24);

    if (!error && data) {
      setListings(data as unknown as Listing[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/listings?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate("/listings");
    }
  };

  const trustSignals = [
    t("home.trust_free"),
    t("home.trust_contact"),
    t("home.trust_local"),
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 to-secondary/30 py-10 sm:py-14 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {t("app.tagline")}
          </h1>
          <p className="text-muted-foreground mb-6 text-sm sm:text-base">
            {t("home.subtitle")}
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto mb-5">
            <Input
              type="text"
              placeholder={t("filters.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 text-base"
              aria-label={t("filters.search")}
            />
            <Button type="submit" size="lg" className="px-5 shrink-0 gap-2">
              <Search className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">{t("home.search_action")}</span>
            </Button>
          </form>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {trustSignals.map((signal) => (
              <span key={signal} className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                {signal}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="pt-8 pb-4 px-4">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("home.browse_by_category")}
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide sm:flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => navigate(`/listings?category=${cat.slug}`)}
                className="shrink-0 rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-foreground hover:bg-primary hover:text-white hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {showMeLocale ? cat.name_me : cat.name_en}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sell CTA — only shown to logged-out users */}
      {!user && (
        <section className="px-4 py-4">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
              <p className="text-sm font-medium text-foreground">
                {t("home.sell_banner_title")}
              </p>
              <Button asChild size="sm" className="shrink-0">
                <Link to="/register">{t("home.sell_banner_cta")}</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Latest listings */}
      <section className="px-4 pt-6 pb-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">
              {t("home.latest")}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/listings")}>
              {t("common.see_all")}
            </Button>
          </div>
          <ListingGrid
            listings={listings}
            loading={loading}
            emptyMessage={t("listing.no_listings")}
          />
        </div>
      </section>
    </Layout>
  );
}
