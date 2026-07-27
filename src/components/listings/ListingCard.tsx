import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "../ui/badge";
import { formatPrice, formatRelativeDate, getImageUrl } from "../../lib/utils";
import type { Listing } from "../../types";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL ?? "";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const { t, i18n } = useTranslation();
  const showMeLocale = i18n.language !== "en";

  const firstImage = listing.listing_images
    ? [...listing.listing_images].sort((a, b) => a.position - b.position)[0]
    : undefined;

  const imageUrl = firstImage
    ? getImageUrl(firstImage.storage_path, SUPABASE_URL)
    : undefined;

  const conditionLabel = listing.condition
    ? t(`conditions.${listing.condition}`)
    : "";

  const categoryName =
    listing.categories
      ? showMeLocale
        ? listing.categories.name_me
        : listing.categories.name_en
      : "";

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group relative block rounded-2xl overflow-hidden bg-white border border-border shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground text-sm">
            Bez slike
          </div>
        )}

        {/* Sold overlay */}
        {listing.status === "sold" && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-lg tracking-widest rotate-[-15deg]">
              {t("listing.sold")}
            </span>
          </div>
        )}

        {/* Condition badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs backdrop-blur-sm bg-white/90">
            {conditionLabel}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-foreground truncate leading-tight">
          {listing.title}
        </h3>
        {categoryName && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{categoryName}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-base font-bold text-primary">
            {formatPrice(listing.price)}
          </span>
          {listing.negotiable && (
            <Badge variant="outline" className="text-xs">
              {t("listing.negotiable_badge")}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-muted-foreground">{listing.city}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeDate(listing.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
