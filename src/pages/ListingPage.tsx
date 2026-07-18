import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Phone, Copy, Share2, Flag, ChevronLeft, Eye } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Layout } from "../components/layout/Layout";
import { ListingCard } from "../components/listings/ListingCard";
import { supabase } from "../lib/supabase";
import { formatPrice, formatDate, getImageUrl, getAvatarUrl } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import type { Listing } from "../types";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL ?? "";

export function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const showMeLocale = i18n.language !== "en";

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [otherListings, setOtherListings] = useState<Listing[]>([]);

  // Strip anything that isn't a valid tel: character to prevent href injection
  const safePhone = listing?.profiles?.phone
    ? listing.profiles.phone.replace(/[^0-9+\-\s()]/g, "")
    : null;

  const fetchListing = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("listings")
      .select(
        "*, listing_images(*), profiles(id,username,avatar_url,city,phone), categories(slug,name_me,name_en)"
      )
      .eq("id", id)
      .single();

    if (err || !data) {
      setError(t("errors.listing_not_found"));
      setLoading(false);
      return;
    }

    const fetchedListing = data as unknown as Listing;
    setListing(fetchedListing);
    setLoading(false);

    // Increment view count via SECURITY DEFINER function (bypasses owner-only UPDATE RLS)
    supabase.rpc("increment_view_count", { listing_id: id }).then(() => {});

    // Fetch other listings from same seller
    if (fetchedListing.user_id) {
      const { data: others } = await supabase
        .from("listings")
        .select("*, listing_images(*), profiles(id,username,avatar_url,city,phone), categories(slug,name_me,name_en)")
        .eq("user_id", fetchedListing.user_id)
        .eq("status", "active")
        .neq("id", id)
        .limit(4);

      if (others) {
        setOtherListings(others as unknown as Listing[]);
      }
    }
  }, [id, t]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const handleCopyPhone = async () => {
    if (!safePhone) return;
    try {
      await navigator.clipboard.writeText(safePhone);
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const handleReport = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!reportReason.trim() || reportReason.trim().length < 10) {
      setReportError("Razlog mora imati najmanje 10 znakova.");
      return;
    }
    setReportLoading(true);
    setReportError(null);

    const { error: err } = await supabase.from("reports").insert({
      listing_id: id,
      reporter_id: user.id,
      reason: reportReason.trim(),
    });

    if (err) {
      setReportError(t("errors.generic"));
    } else {
      setReportSubmitted(true);
    }
    setReportLoading(false);
  };

  const sortedImages = listing?.listing_images
    ? [...listing.listing_images].sort((a, b) => a.position - b.position)
    : [];

  const mainImage = sortedImages[selectedImageIndex];
  const mainImageUrl = mainImage ? getImageUrl(mainImage.storage_path, SUPABASE_URL) : undefined;

  const sellerAvatarUrl = listing?.profiles?.avatar_url
    ? getAvatarUrl(listing.profiles.avatar_url, SUPABASE_URL)
    : undefined;

  const conditionLabel = listing?.condition ? t(`conditions.${listing.condition}`) : "";
  const genderLabel = listing?.gender ? t(`genders.${listing.gender}`) : "";
  const categoryName = listing?.categories
    ? showMeLocale
      ? listing.categories.name_me
      : listing.categories.name_en
    : "";

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (error || !listing) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">{error ?? t("errors.listing_not_found")}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("common.back")}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t("common.back")}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image gallery */}
          <div>
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
              {mainImageUrl ? (
                <img
                  src={mainImageUrl}
                  alt={listing.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  Bez slike
                </div>
              )}
              {listing.status === "sold" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                  <span className="text-white font-bold text-3xl tracking-widest rotate-[-15deg]">
                    PRODATO
                  </span>
                </div>
              )}
            </div>

            {sortedImages.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1" role="group" aria-label="Galerija fotografija">
                {sortedImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(idx)}
                    aria-label={`Fotografija ${idx + 1}`}
                    aria-pressed={idx === selectedImageIndex}
                    className={`shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      idx === selectedImageIndex
                        ? "border-primary"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <img
                      src={getImageUrl(img.storage_path, SUPABASE_URL)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(listing.price)}
                </span>
                {listing.negotiable && (
                  <Badge variant="outline">{t("listing.negotiable_badge")}</Badge>
                )}
                {listing.status === "sold" && (
                  <Badge variant="sold">{t("listing.sold")}</Badge>
                )}
              </div>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm rounded-2xl border border-border p-4 bg-muted/30">
              {conditionLabel && (
                <>
                  <span className="text-muted-foreground">{t("listing.condition")}</span>
                  <span className="font-medium">{conditionLabel}</span>
                </>
              )}
              {listing.size && (
                <>
                  <span className="text-muted-foreground">{t("listing.size")}</span>
                  <span className="font-medium">{listing.size}</span>
                </>
              )}
              {genderLabel && (
                <>
                  <span className="text-muted-foreground">{t("listing.gender")}</span>
                  <span className="font-medium">{genderLabel}</span>
                </>
              )}
              {categoryName && (
                <>
                  <span className="text-muted-foreground">{t("listing.category")}</span>
                  <span className="font-medium">{categoryName}</span>
                </>
              )}
              {listing.brand && (
                <>
                  <span className="text-muted-foreground">{t("listing.brand")}</span>
                  <span className="font-medium">{listing.brand}</span>
                </>
              )}
              {listing.color && (
                <>
                  <span className="text-muted-foreground">{t("listing.color")}</span>
                  <span className="font-medium">{listing.color}</span>
                </>
              )}
              <span className="text-muted-foreground">{t("listing.city")}</span>
              <span className="font-medium">{listing.city}</span>
              <span className="text-muted-foreground">{t("listing.posted")}</span>
              <span className="font-medium">{formatDate(listing.created_at)}</span>
              <span className="text-muted-foreground">{t("listing.views")}</span>
              <span className="font-medium flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {listing.view_count}
              </span>
            </div>

            {listing.description && (
              <div className="rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold mb-2">{t("listing.description")}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Seller section */}
            {listing.profiles && (
              <div className="rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold mb-3">{t("listing.contact_seller")}</p>
                <Link
                  to={`/users/${listing.profiles.username}`}
                  className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-10 w-10">
                    {sellerAvatarUrl && (
                      <AvatarImage src={sellerAvatarUrl} alt={listing.profiles.username} />
                    )}
                    <AvatarFallback>
                      {listing.profiles.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{listing.profiles.username}</p>
                    {listing.profiles.city && (
                      <p className="text-xs text-muted-foreground">{listing.profiles.city}</p>
                    )}
                  </div>
                </Link>

                {safePhone && (
                  <div className="flex gap-2">
                    <Button asChild className="flex-1 gap-2">
                      <a href={`tel:${safePhone}`}>
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        {t("listing.call")}
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCopyPhone}
                      className="flex-1 gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      {phoneCopied ? t("listing.phone_copied") : t("listing.copy_phone")}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleShare} className="flex-1 gap-2">
                <Share2 className="h-4 w-4" />
                {t("listing.share")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setReportOpen(true)}
                className="gap-2 text-muted-foreground hover:text-destructive"
              >
                <Flag className="h-4 w-4" />
                {t("report.report_listing")}
              </Button>
            </div>
          </div>
        </div>

        {/* Other listings from seller */}
        {otherListings.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold mb-4">{t("listing.other_from_seller")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {otherListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("report.report_listing")}</DialogTitle>
          </DialogHeader>

          {reportSubmitted ? (
            <div className="py-4 text-center">
              <p className="text-green-600 font-medium">{t("report.submitted")}</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label>{t("report.reason")}</Label>
                <Textarea
                  placeholder={t("report.reason_placeholder")}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={4}
                />
                {reportError && (
                  <p className="text-sm text-destructive">{reportError}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReportOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleReport} disabled={reportLoading}>
                  {reportLoading ? t("common.loading") : t("report.submit")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
