import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Layout } from "../components/layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatDate, formatPrice, getAvatarUrl, getImageUrl } from "../lib/utils";
import type { Listing } from "../types";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL ?? "";

type Tab = "active" | "sold";

export function MyProfilePage() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [activeListings, setActiveListings] = useState<Listing[]>([]);
  const [soldListings, setSoldListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("listings")
      .select(
        "*, listing_images(*), profiles(id,username,avatar_url,city,phone), categories(slug,name_me,name_en)"
      )
      .eq("user_id", user.id)
      .in("status", ["active", "sold"])
      .order("created_at", { ascending: false });

    if (data) {
      const all = data as unknown as Listing[];
      setActiveListings(all.filter((l) => l.status === "active"));
      setSoldListings(all.filter((l) => l.status === "sold"));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    setDeleteLoading(true);

    // Delete images from storage
    const images = deleteTarget.listing_images ?? [];
    if (images.length > 0) {
      await supabase.storage
        .from("listing-images")
        .remove(images.map((img) => img.storage_path));
    }

    // Delete listing (cascades listing_images rows)
    await supabase
      .from("listings")
      .delete()
      .eq("id", deleteTarget.id)
      .eq("user_id", user.id);

    setDeleteTarget(null);
    setDeleteLoading(false);
    await fetchListings();
  };

  const handleMarkSold = async (listing: Listing) => {
    await supabase
      .from("listings")
      .update({ status: "sold" })
      .eq("id", listing.id)
      .eq("user_id", user?.id ?? "");
    await fetchListings();
  };

  const handleMarkActive = async (listing: Listing) => {
    await supabase
      .from("listings")
      .update({ status: "active" })
      .eq("id", listing.id)
      .eq("user_id", user?.id ?? "");
    await fetchListings();
  };

  const avatarUrl = profile?.avatar_url
    ? getAvatarUrl(profile.avatar_url, SUPABASE_URL)
    : undefined;

  const displayedListings = tab === "active" ? activeListings : soldListings;

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          <Avatar className="h-24 w-24 shrink-0">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.username ?? ""} />}
            <AvatarFallback className="text-2xl">
              {profile?.username?.slice(0, 2).toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">{profile?.username}</h1>
                {profile?.full_name && (
                  <p className="text-muted-foreground">{profile.full_name}</p>
                )}
              </div>
              <Button asChild variant="outline">
                <Link to="/profile/edit">{t("profile.edit_profile")}</Link>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-3 text-sm text-muted-foreground">
              {profile?.city && <span>{profile.city}</span>}
              {profile?.created_at && (
                <span>
                  {t("profile.member_since")} {formatDate(profile.created_at)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "active"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("listing.active")} ({activeListings.length})
          </button>
          <button
            onClick={() => setTab("sold")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "sold"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("listing.sold")} ({soldListings.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : displayedListings.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>{t("profile.no_listings")}</p>
            {tab === "active" && (
              <Button className="mt-4" onClick={() => navigate("/listings/new")}>
                {t("listing.create")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedListings.map((listing) => {
              const firstImage = listing.listing_images
                ? [...listing.listing_images].sort((a, b) => a.position - b.position)[0]
                : undefined;
              const thumbUrl = firstImage
                ? getImageUrl(firstImage.storage_path, SUPABASE_URL)
                : undefined;

              return (
                <div
                  key={listing.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-white p-3 shadow-sm"
                >
                  {/* Thumbnail */}
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={listing.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/listings/${listing.id}`}
                      className="font-semibold text-sm hover:text-primary transition-colors truncate block"
                    >
                      {listing.title}
                    </Link>
                    <p className="text-sm font-bold text-primary">{formatPrice(listing.price)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={listing.status === "sold" ? "sold" : "secondary"} className="text-xs">
                        {listing.status === "sold" ? t("listing.sold") : t("listing.active")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{listing.city}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      asChild
                    >
                      <Link to={`/listings/${listing.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>

                    {listing.status === "active" ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600 hover:text-green-700"
                        onClick={() => handleMarkSold(listing)}
                        title={t("listing.mark_sold")}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => handleMarkActive(listing)}
                        title={t("listing.mark_active")}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(listing)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("listing.delete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {`Da li ste sigurni da želite obrisati oglas "${deleteTarget?.title}"? Ova akcija se ne može poništiti.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? t("common.loading") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
