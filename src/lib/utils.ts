import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `${price.toFixed(2)} €`;
}

export function formatDate(dateStr: string, locale = "sr-Latn-ME"): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "upravo sad";
  if (minutes < 60) return `prije ${minutes} min`;
  if (hours < 24) return `prije ${hours} h`;
  if (days < 7) return `prije ${days} dana`;
  return formatDate(dateStr);
}

export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Returns a Supabase Storage URL for a listing image.
 * When `width` is provided, switches to the /render/image/ endpoint which
 * resizes the image server-side — preventing cards from downloading full-size
 * files. Requires Supabase Pro / Image Transformations add-on to be enabled.
 */
export function getImageUrl(
  storagePath: string,
  supabaseUrl: string,
  width?: number
): string {
  if (width) {
    return `${supabaseUrl}/storage/v1/render/image/public/listing-images/${storagePath}?width=${width}&quality=75&resize=contain`;
  }
  return `${supabaseUrl}/storage/v1/object/public/listing-images/${storagePath}`;
}

/**
 * Returns a Supabase Storage URL for an avatar image.
 * When `width` is provided, serves a resized variant via /render/image/.
 */
export function getAvatarUrl(
  storagePath: string,
  supabaseUrl: string,
  width?: number
): string {
  if (width) {
    return `${supabaseUrl}/storage/v1/render/image/public/avatars/${storagePath}?width=${width}&quality=75`;
  }
  return `${supabaseUrl}/storage/v1/object/public/avatars/${storagePath}`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trim() + "…";
}
