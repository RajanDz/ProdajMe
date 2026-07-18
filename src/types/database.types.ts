export type UserRole = "user" | "admin";

export type Gender = "women" | "men" | "unisex" | "kids";

export type Condition =
  | "new_with_tags"
  | "like_new"
  | "very_good"
  | "good"
  | "fair";

export type ListingStatus = "active" | "sold" | "hidden";

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  phone: string | null;
  role: UserRole;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  slug: string;
  name_me: string;
  name_en: string;
  sort_order: number;
}

export interface Listing {
  id: string;
  user_id: string;
  category_id: number;
  title: string;
  description: string | null;
  price: number;
  negotiable: boolean;
  gender: Gender;
  size: string;
  brand: string | null;
  color: string | null;
  condition: Condition;
  city: string;
  status: ListingStatus;
  view_count: number;
  created_at: string;
  updated_at: string;
  // joined
  profiles?: Pick<Profile, "id" | "username" | "avatar_url" | "city" | "phone">;
  categories?: Pick<Category, "slug" | "name_me" | "name_en">;
  listing_images?: ListingImage[];
}

export interface ListingImage {
  id: string;
  listing_id: string;
  storage_path: string;
  position: number;
  created_at: string;
}

export interface Report {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
}

// Future-ready stub (not implemented in MVP)
export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}
