import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { ListingGrid } from "../components/listings/ListingGrid";
import { Layout } from "../components/layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatDate, getAvatarUrl } from "../lib/utils";
import type { Profile, Listing } from "../types";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL ?? "";

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { t } = useTranslation();
  const { profile: myProfile } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isOwnProfile = !!myProfile && myProfile.username === username;

  useEffect(() => {
    if (!username) return;

    (async () => {
      setLoading(true);
      setNotFound(false);
      setListings([]);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(data as Profile);
      setLoading(false);

      setListingsLoading(true);
      const { data: listingData } = await supabase
        .from("listings")
        .select(
          "*, listing_images(*), profiles(id,username,avatar_url,city,phone), categories(slug,name_me,name_en)"
        )
        .eq("user_id", (data as Profile).id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setListings((listingData ?? []) as unknown as Listing[]);
      setListingsLoading(false);
    })();
  }, [username]);

  const avatarUrl = profile?.avatar_url
    ? getAvatarUrl(profile.avatar_url, SUPABASE_URL)
    : undefined;

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-label={t("common.loading")} />
        </div>
      </Layout>
    );
  }

  if (notFound || !profile) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">{t("errors.profile_not_found")}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {profile.is_suspended && !isOwnProfile && (
          <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Ovaj nalog je privremeno suspendovan.
          </div>
        )}

        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          <Avatar className="h-24 w-24 shrink-0">
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={profile.username} />
            )}
            <AvatarFallback className="text-2xl">
              {profile.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">{profile.username}</h1>
                {profile.full_name && (
                  <p className="text-muted-foreground">{profile.full_name}</p>
                )}
              </div>
              {isOwnProfile && (
                <Button asChild variant="outline">
                  <Link to="/profile/edit">{t("profile.edit_profile")}</Link>
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
              {profile.city && <span>{profile.city}</span>}
              <span>
                {t("profile.member_since")} {formatDate(profile.created_at)}
              </span>
              <span>{t("profile.listings_count", { count: listings.length })}</span>
            </div>
          </div>
        </div>

        {/* Listings */}
        {!profile.is_suspended && (
          <section aria-label={t("profile.my_listings")}>
            <h2 className="text-lg font-semibold mb-4">{t("profile.my_listings")}</h2>
            <ListingGrid
              listings={listings}
              loading={listingsLoading}
              emptyMessage={t("profile.no_listings")}
            />
          </section>
        )}
      </div>
    </Layout>
  );
}
