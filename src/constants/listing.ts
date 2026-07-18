import type { Gender, Condition } from "../types";

export const GENDERS: { value: Gender; label_me: string; label_en: string }[] = [
  { value: "women", label_me: "Žene", label_en: "Women" },
  { value: "men", label_me: "Muškarci", label_en: "Men" },
  { value: "unisex", label_me: "Unisex", label_en: "Unisex" },
  { value: "kids", label_me: "Djeca", label_en: "Kids" },
];

export const CONDITIONS: { value: Condition; label_me: string; label_en: string }[] = [
  { value: "new_with_tags", label_me: "Novo s etiketom", label_en: "New with tags" },
  { value: "like_new", label_me: "Kao novo", label_en: "Like New" },
  { value: "very_good", label_me: "Vrlo dobro", label_en: "Very Good" },
  { value: "good", label_me: "Dobro", label_en: "Good" },
  { value: "fair", label_me: "Prihvatljivo", label_en: "Fair" },
];

export const SIZES = [
  "XS", "S", "M", "L", "XL", "XXL", "XXXL",
  "34", "36", "38", "40", "42", "44", "46", "48",
  "One size",
];

export const MONTENEGRIN_CITIES = [
  "Podgorica",
  "Nikšić",
  "Bar",
  "Budva",
  "Herceg Novi",
  "Bijelo Polje",
  "Berane",
  "Cetinje",
  "Kotor",
  "Tivat",
  "Ulcinj",
  "Pljevlja",
  "Žabljak",
  "Kolašin",
  "Rožaje",
  "Mojkovac",
  "Plav",
  "Andrijevica",
  "Šavnik",
  "Plužine",
  "Petnjica",
  "Gusinje",
  "Tuzi",
  "Zeta",
  "Golubovci",
  "Danilovgrad",
];

export const MAX_LISTING_IMAGES = 10;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
export const LISTINGS_PER_PAGE = 24;
