import React from "react";
import { ListingCard } from "./ListingCard";
import type { Listing } from "../../types";

interface ListingGridProps {
  listings: Listing[];
  loading: boolean;
  emptyMessage?: string;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-white shadow-sm animate-pulse">
      <div className="aspect-square w-full bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-5 bg-muted rounded w-1/3 mt-1" />
      </div>
    </div>
  );
}

export function ListingGrid({ listings, loading, emptyMessage }: ListingGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-base">{emptyMessage ?? "Nema oglasa."}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
