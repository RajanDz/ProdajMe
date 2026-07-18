export const CATEGORIES = [
  { id: 1, slug: "t-shirts", name_me: "Majice", name_en: "T-Shirts" },
  { id: 2, slug: "shirts", name_me: "Košulje", name_en: "Shirts" },
  { id: 3, slug: "hoodies", name_me: "Duksevi", name_en: "Hoodies" },
  { id: 4, slug: "jackets", name_me: "Jakne", name_en: "Jackets" },
  { id: 5, slug: "jeans", name_me: "Farmerke", name_en: "Jeans" },
  { id: 6, slug: "pants", name_me: "Pantalone", name_en: "Pants" },
  { id: 7, slug: "shorts", name_me: "Šorc", name_en: "Shorts" },
  { id: 8, slug: "dresses", name_me: "Haljine", name_en: "Dresses" },
  { id: 9, slug: "skirts", name_me: "Suknje", name_en: "Skirts" },
  { id: 10, slug: "shoes", name_me: "Cipele", name_en: "Shoes" },
  { id: 11, slug: "sneakers", name_me: "Patike", name_en: "Sneakers" },
  { id: 12, slug: "bags", name_me: "Torbe", name_en: "Bags" },
  { id: 13, slug: "accessories", name_me: "Dodaci", name_en: "Accessories" },
  { id: 14, slug: "sportswear", name_me: "Sportska odjeća", name_en: "Sportswear" },
  { id: 15, slug: "kids", name_me: "Dječija odjeća", name_en: "Kids Clothing" },
  { id: 16, slug: "other", name_me: "Ostalo", name_en: "Other" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
