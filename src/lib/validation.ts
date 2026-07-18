import { z } from "zod";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_LISTING_IMAGES,
} from "../constants/listing";

export const signUpSchema = z.object({
  email: z.string().email("Nevažeća email adresa."),
  password: z
    .string()
    .min(8, "Lozinka mora imati najmanje 8 znakova.")
    .max(128, "Lozinka je predugačka."),
  username: z
    .string()
    .min(3, "Korisničko ime mora imati najmanje 3 znaka.")
    .max(30, "Korisničko ime može imati najviše 30 znakova.")
    .regex(/^[a-zA-Z0-9_]+$/, "Korisničko ime smije sadržavati samo slova, brojeve i _.")
    .toLowerCase(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-().]{6,20}$/, "Nevažeći format broja telefona."),
  city: z.string().min(2, "Grad je obavezan.").max(100, "Naziv grada je predugačak."),
});

export const loginSchema = z.object({
  email: z.string().email("Nevažeća email adresa."),
  password: z.string().min(1, "Lozinka je obavezna."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Nevažeća email adresa."),
});

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Korisničko ime mora imati najmanje 3 znaka.")
    .max(30, "Korisničko ime može imati najviše 30 znakova.")
    .regex(/^[a-zA-Z0-9_]+$/, "Korisničko ime smije sadržavati samo slova, brojeve i _.")
    .toLowerCase(),
  full_name: z.string().max(100, "Ime je predugačko.").optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-().]{6,20}$/, "Nevažeći format broja telefona."),
  city: z.string().min(2, "Grad je obavezan.").max(100, "Naziv grada je predugačak."),
});

export const listingSchema = z.object({
  title: z
    .string()
    .min(3, "Naslov mora imati najmanje 3 znaka.")
    .max(100, "Naslov može imati najviše 100 znakova."),
  description: z
    .string()
    .max(2000, "Opis može imati najviše 2000 znakova.")
    .optional()
    .or(z.literal("")),
  price: z
    .number({ invalid_type_error: "Cijena mora biti broj." })
    .positive("Cijena mora biti veća od 0.")
    .max(100_000, "Cijena je previsoka."),
  negotiable: z.boolean(),
  category_id: z.number({ invalid_type_error: "Kategorija je obavezna." }),
  gender: z.enum(["women", "men", "unisex", "kids"] as const, {
    errorMap: () => ({ message: "Spol je obavezan." }),
  }),
  size: z.string().min(1, "Veličina je obavezna.").max(20, "Veličina je predugačka."),
  brand: z.string().max(60, "Brand je predugačak.").optional().or(z.literal("")),
  color: z.string().max(50, "Boja je predugačka.").optional().or(z.literal("")),
  condition: z.enum(["new_with_tags", "like_new", "very_good", "good", "fair"] as const, {
    errorMap: () => ({ message: "Stanje je obavezno." }),
  }),
  city: z.string().min(2, "Grad je obavezan.").max(100, "Naziv grada je predugačak."),
});

// Maps each allowed MIME type to the only extensions it may use
const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export function validateImageFile(file: File): string | null {
  const allowedMimes = ALLOWED_IMAGE_TYPES as readonly string[];
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();

  // 1. Reject explicitly dangerous MIME types
  const dangerousMimes = ["image/svg+xml", "application/javascript", "application/x-php",
    "application/x-executable", "text/html", "application/octet-stream"];
  if (dangerousMimes.includes(file.type)) {
    return "Ovaj tip fajla nije dozvoljen.";
  }

  // 2. MIME type must be in allow-list
  if (!allowedMimes.includes(file.type)) {
    return `Nedozvoljeni tip fajla. Dozvoljeni su: jpg, jpeg, png, webp.`;
  }

  // 3. Extension must be in allow-list
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
  if (!allowedExts.includes(ext)) {
    return `Nedozvoljena ekstenzija "${ext}". Dozvoljene su: jpg, jpeg, png, webp.`;
  }

  // 4. MIME type and extension must match — catches renamed files
  const validExtsForMime = MIME_TO_EXTENSIONS[file.type];
  if (!validExtsForMime || !validExtsForMime.includes(ext)) {
    return "Tip fajla i ekstenzija se ne podudaraju.";
  }

  // 5. File size
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Slika je prevelika. Maksimalna veličina je 5MB.";
  }

  return null;
}

// Validates actual file content by reading magic bytes.
// Call this before upload — file.type is browser-reported and can be spoofed by renaming.
export async function validateImageMagicBytes(file: File): Promise<string | null> {
  const header = await file.slice(0, 12).arrayBuffer();
  const b = new Uint8Array(header);

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return null;
  // WebP: RIFF????WEBP
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return null;

  return "Fajl nije validna slika (neispravan sadržaj).";
}

export function validateImageFiles(files: File[]): string | null {
  if (files.length === 0) {
    return "Dodajte najmanje jednu fotografiju.";
  }
  if (files.length > MAX_LISTING_IMAGES) {
    return `Možete dodati najviše ${MAX_LISTING_IMAGES} fotografija.`;
  }
  for (const file of files) {
    const err = validateImageFile(file);
    if (err) return err;
  }
  return null;
}

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
