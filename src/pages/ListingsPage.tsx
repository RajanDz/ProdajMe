import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ListingGrid } from "../components/listings/ListingGrid";
import { Layout } from "../components/layout/Layout";
import { supabase } from "../lib/supabase";
import { CATEGORIES } from "../constants/categories";
import { GENDERS, CONDITIONS, SIZES, MONTENEGRIN_CITIES, BRANDS, COLORS, LISTINGS_PER_PAGE } from "../constants/listing";
import type { Listing } from "../types";

interface FilterPanelProps {
  localQ: string; setLocalQ: (v: string) => void;
  localCategory: string; setLocalCategory: (v: string) => void;
  localGender: string; setLocalGender: (v: string) => void;
  localSize: string; setLocalSize: (v: string) => void;
  localCondition: string; setLocalCondition: (v: string) => void;
  localCity: string; setLocalCity: (v: string) => void;
  localBrand: string; setLocalBrand: (v: string) => void;
  localColor: string; setLocalColor: (v: string) => void;
  localMinPrice: string; setLocalMinPrice: (v: string) => void;
  localMaxPrice: string; setLocalMaxPrice: (v: string) => void;
  localSort: string; setLocalSort: (v: string) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

function FilterPanel({
  localQ, setLocalQ,
  localCategory, setLocalCategory,
  localGender, setLocalGender,
  localSize, setLocalSize,
  localCondition, setLocalCondition,
  localCity, setLocalCity,
  localBrand, setLocalBrand,
  localColor, setLocalColor,
  localMinPrice, setLocalMinPrice,
  localMaxPrice, setLocalMaxPrice,
  localSort, setLocalSort,
  applyFilters, clearFilters, hasActiveFilters,
}: FilterPanelProps) {
  const { t, i18n } = useTranslation();
  const showMeLocale = i18n.language !== "en";
  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-1.5 block">{t("filters.search")}</Label>
        <Input
          placeholder={t("filters.search")}
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
      </div>

      <div>
        <Label className="mb-1.5 block">{t("listing.category")}</Label>
        <Select value={localCategory || "all"} onValueChange={(v) => setLocalCategory(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("filters.all_categories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_categories")}</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.slug} value={cat.slug}>
                {showMeLocale ? cat.name_me : cat.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1.5 block">{t("listing.gender")}</Label>
        <Select value={localGender || "all"} onValueChange={(v) => setLocalGender(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("filters.all_genders")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_genders")}</SelectItem>
            {GENDERS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {showMeLocale ? g.label_me : g.label_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1.5 block">{t("listing.size")}</Label>
        <Select value={localSize || "all"} onValueChange={(v) => setLocalSize(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("filters.all_sizes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_sizes")}</SelectItem>
            {SIZES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1.5 block">{t("listing.condition")}</Label>
        <Select value={localCondition || "all"} onValueChange={(v) => setLocalCondition(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("filters.all_conditions")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_conditions")}</SelectItem>
            {CONDITIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {showMeLocale ? c.label_me : c.label_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1.5 block">{t("listing.city")}</Label>
        <Select value={localCity || "all"} onValueChange={(v) => setLocalCity(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("filters.all_cities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_cities")}</SelectItem>
            {MONTENEGRIN_CITIES.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1.5 block">{t("listing.brand")}</Label>
        <Select value={localBrand || "all"} onValueChange={(v) => setLocalBrand(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("filters.all_brands")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_brands")}</SelectItem>
            {BRANDS.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1.5 block">{t("listing.color")}</Label>
        <Select value={localColor || "all"} onValueChange={(v) => setLocalColor(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("filters.all_colors")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_colors")}</SelectItem>
            {COLORS.map((c) => (
              <SelectItem key={c.value} value={c.label_me}>
                {showMeLocale ? c.label_me : c.label_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="mb-1.5 block">{t("filters.price_from")}</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={localMinPrice}
            onChange={(e) => setLocalMinPrice(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">{t("filters.price_to")}</Label>
          <Input
            type="number"
            min={0}
            placeholder="—"
            value={localMaxPrice}
            onChange={(e) => setLocalMaxPrice(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block">{t("filters.sort")}</Label>
        <Select value={localSort} onValueChange={setLocalSort}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("filters.sort_newest")}</SelectItem>
            <SelectItem value="price_asc">{t("filters.sort_price_asc")}</SelectItem>
            <SelectItem value="price_desc">{t("filters.sort_price_desc")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={applyFilters} className="flex-1">
          {t("filters.apply")}
        </Button>
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} className="shrink-0" aria-label={t("filters.clear")}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ListingsPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showMeLocale = i18n.language !== "en";

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);

  const [localQ, setLocalQ] = useState(searchParams.get("q") ?? "");
  const [localCategory, setLocalCategory] = useState(searchParams.get("category") ?? "");
  const [localGender, setLocalGender] = useState(searchParams.get("gender") ?? "");
  const [localSize, setLocalSize] = useState(searchParams.get("size") ?? "");
  const [localCondition, setLocalCondition] = useState(searchParams.get("condition") ?? "");
  const [localCity, setLocalCity] = useState(searchParams.get("city") ?? "");
  const [localBrand, setLocalBrand] = useState(searchParams.get("brand") ?? "");
  const [localColor, setLocalColor] = useState(searchParams.get("color") ?? "");
  const [localMinPrice, setLocalMinPrice] = useState(searchParams.get("min_price") ?? "");
  const [localMaxPrice, setLocalMaxPrice] = useState(searchParams.get("max_price") ?? "");
  const [localSort, setLocalSort] = useState(searchParams.get("sort") ?? "newest");

  const page = parseInt(searchParams.get("page") ?? "1", 10);

  const fetchListings = useCallback(async () => {
    setLoading(true);

    const q = searchParams.get("q") ?? "";
    const category = searchParams.get("category") ?? "";
    const gender = searchParams.get("gender") ?? "";
    const size = searchParams.get("size") ?? "";
    const condition = searchParams.get("condition") ?? "";
    const city = searchParams.get("city") ?? "";
    const brand = searchParams.get("brand") ?? "";
    const color = searchParams.get("color") ?? "";
    const minPrice = searchParams.get("min_price") ?? "";
    const maxPrice = searchParams.get("max_price") ?? "";
    const sort = searchParams.get("sort") ?? "newest";
    const currentPage = parseInt(searchParams.get("page") ?? "1", 10);

    let query = supabase
      .from("listings")
      .select(
        "*, listing_images(*), profiles(id,username,avatar_url,city,phone), categories(slug,name_me,name_en)",
        { count: "exact" }
      )
      .eq("status", "active");

    if (q) query = query.ilike("title", `%${q}%`);

    if (category) {
      const cat = CATEGORIES.find((c) => c.slug === category);
      if (cat) query = query.eq("category_id", cat.id);
    }

    if (gender) query = query.eq("gender", gender);
    if (size) query = query.eq("size", size);
    if (condition) query = query.eq("condition", condition);
    if (city) query = query.eq("city", city);
    if (brand) query = query.ilike("brand", `%${brand}%`);
    if (color) query = query.ilike("color", `%${color}%`);
    if (minPrice) query = query.gte("price", parseFloat(minPrice));
    if (maxPrice) query = query.lte("price", parseFloat(maxPrice));

    if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const from = (currentPage - 1) * LISTINGS_PER_PAGE;
    query = query.range(from, from + LISTINGS_PER_PAGE - 1);

    const { data, error, count } = await query;

    if (!error && data) {
      setListings(data as unknown as Listing[]);
      setTotalCount(count ?? 0);
    } else {
      setListings([]);
      setTotalCount(0);
    }
    setLoading(false);
  }, [searchParams]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    setLocalQ(searchParams.get("q") ?? "");
    setLocalCategory(searchParams.get("category") ?? "");
    setLocalGender(searchParams.get("gender") ?? "");
    setLocalSize(searchParams.get("size") ?? "");
    setLocalCondition(searchParams.get("condition") ?? "");
    setLocalCity(searchParams.get("city") ?? "");
    setLocalBrand(searchParams.get("brand") ?? "");
    setLocalColor(searchParams.get("color") ?? "");
    setLocalMinPrice(searchParams.get("min_price") ?? "");
    setLocalMaxPrice(searchParams.get("max_price") ?? "");
    setLocalSort(searchParams.get("sort") ?? "newest");
  }, [searchParams]);

  const applyFilters = () => {
    const params: Record<string, string> = {};
    if (localQ) params.q = localQ;
    if (localCategory) params.category = localCategory;
    if (localGender) params.gender = localGender;
    if (localSize) params.size = localSize;
    if (localCondition) params.condition = localCondition;
    if (localCity) params.city = localCity;
    if (localBrand.trim()) params.brand = localBrand.trim();
    if (localColor.trim()) params.color = localColor.trim();
    if (localMinPrice) params.min_price = localMinPrice;
    if (localMaxPrice) params.max_price = localMaxPrice;
    if (localSort && localSort !== "newest") params.sort = localSort;
    setSearchParams(params);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setLocalQ("");
    setLocalCategory("");
    setLocalGender("");
    setLocalSize("");
    setLocalCondition("");
    setLocalCity("");
    setLocalBrand("");
    setLocalColor("");
    setLocalMinPrice("");
    setLocalMaxPrice("");
    setLocalSort("newest");
    setSearchParams({});
  };

  const totalPages = Math.ceil(totalCount / LISTINGS_PER_PAGE);

  const goToPage = (newPage: number) => {
    const params = Object.fromEntries(searchParams.entries());
    params.page = String(newPage);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters = !!(
    searchParams.get("q") ||
    searchParams.get("category") ||
    searchParams.get("gender") ||
    searchParams.get("size") ||
    searchParams.get("condition") ||
    searchParams.get("city") ||
    searchParams.get("brand") ||
    searchParams.get("color") ||
    searchParams.get("min_price") ||
    searchParams.get("max_price") ||
    (searchParams.get("sort") && searchParams.get("sort") !== "newest")
  );

  const filterPanelProps: FilterPanelProps = {
    localQ, setLocalQ,
    localCategory, setLocalCategory,
    localGender, setLocalGender,
    localSize, setLocalSize,
    localCondition, setLocalCondition,
    localCity, setLocalCity,
    localBrand, setLocalBrand,
    localColor, setLocalColor,
    localMinPrice, setLocalMinPrice,
    localMaxPrice, setLocalMaxPrice,
    localSort, setLocalSort,
    applyFilters, clearFilters, hasActiveFilters,
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Mobile filter toggle */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <h1 className="text-xl font-bold">{t("nav.browse")}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterOpen((v) => !v)}
            className="gap-2"
            aria-expanded={filterOpen}
            aria-controls="filter-panel"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t("filters.filters")}
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs w-4 h-4 flex items-center justify-center" aria-label="aktivni filteri">
                !
              </span>
            )}
          </Button>
        </div>

        {/* Mobile filter drawer */}
        {filterOpen && (
          <div id="filter-panel" className="mb-6 rounded-2xl border border-border bg-white p-4 lg:hidden">
            <FilterPanel {...filterPanelProps} />
          </div>
        )}

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 shrink-0" aria-label={t("filters.filters")}>
            <div className="sticky top-20 rounded-2xl border border-border bg-white p-4">
              <h2 className="font-semibold text-base mb-4">{t("filters.filters")}</h2>
              <FilterPanel {...filterPanelProps} />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold hidden lg:block">{t("nav.browse")}</h1>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {loading ? t("common.loading") : `${totalCount} ${t("filters.results")}`}
              </p>
            </div>

            <ListingGrid
              listings={listings}
              loading={loading}
              emptyMessage={t("listing.no_listings")}
            />

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <nav aria-label="Paginacija" className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label={t("filters.prev_page")}
                >
                  {t("filters.prev_page")}
                </Button>
                <span className="text-sm text-muted-foreground" aria-current="page">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label={t("filters.next_page")}
                >
                  {t("filters.next_page")}
                </Button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
