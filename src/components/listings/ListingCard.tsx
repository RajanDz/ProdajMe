import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn, formatPrice, formatRelativeDate, getImageUrl } from "../../lib/utils";
import type { Listing } from "../../types";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL ?? "";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const { t } = useTranslation();
  // Local toggle only — favourite persistence requires backend wiring (Favorite table exists in schema)
  const [liked, setLiked] = useState(false);

  const firstImage = listing.listing_images
    ? [...listing.listing_images].sort((a, b) => a.position - b.position)[0]
    : undefined;

  // 600 px wide variant covers a 300 px slot at 2× pixel density
  const imageUrl = firstImage
    ? getImageUrl(firstImage.storage_path, SUPABASE_URL, 600)
    : undefined;

  const conditionLabel = listing.condition
    ? t(`conditions.${listing.condition}`)
    : "";

  return (
    <Link
      to={`/listings/${listing.id}`}
      // Scale the card itself on hover causes layout shifts in a grid — only lift shadow instead
      className="group relative block rounded-2xl overflow-hidden bg-white border border-border shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* ── Image ── */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            width={600}
            height={750}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-300 ease-out"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm select-none">
            Bez slike
          </div>
        )}

        {/* Sold overlay */}
        {listing.status === "sold" && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-xl tracking-[0.3em] uppercase rotate-[-15deg] select-none drop-shadow">
              {t("listing.sold")}
            </span>
          </div>
        )}

        {/* Condition pill – top left, frosted glass so it reads on any image */}
        {conditionLabel && (
          <div className="absolute top-2 left-2">
            <Badge
              variant="secondary"
              className="text-[10px] font-medium px-1.5 py-0.5 backdrop-blur-sm bg-white/90 shadow-sm border-0 rounded-full"
            >
              {conditionLabel}
            </Badge>
          </div>
        )}

        {/* Favourite heart – top right */}
        <button
          type="button"
          aria-label={liked ? "Ukloni iz omiljenih" : "Dodaj u omiljene"}
          onClick={(e) => {
            e.preventDefault();
            setLiked((v) => !v);
          }}
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center transition-all duration-150 hover:bg-white hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5 transition-colors duration-150",
              liked ? "fill-red-500 stroke-red-500" : "stroke-foreground/60"
            )}
          />
        </button>
      </div>

      {/* ── Info ────────────────────────────────────────────────────────── */}
      <div className="p-3 space-y-1">
        {/* Brand — all-caps small caps, strongest trust signal in secondhand fashion */}
        {listing.brand && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none truncate">
            {listing.brand}
          </p>
        )}

        {/* Title — 2-line clamp: cards are narrow, truncate cuts too much context */}
        <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
          {listing.title}
        </h3>

        {/* Size — eliminates wasted click-throughs for wrong sizes */}
        {listing.size && (
          <p className="text-xs text-muted-foreground leading-none">
            {listing.size}
          </p>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-1 pt-0.5">
          <span className="text-base font-bold text-primary leading-none">
            {formatPrice(listing.price)}
          </span>
          {/* Negotiable as inline text rather than a badge — less visual clutter */}
          {listing.negotiable && (
            <span className="text-[10px] text-muted-foreground leading-none">
              · dogovor
            </span>
          )}
        </div>

        {/* City + relative time — both muted, neither competes with price */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-muted-foreground truncate">
            {listing.city}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
            {formatRelativeDate(listing.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
