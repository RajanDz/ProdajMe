import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Upload, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Layout } from "../components/layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { listingSchema, validateImageFiles, validateImageMagicBytes } from "../lib/validation";
import { CATEGORIES } from "../constants/categories";
import { GENDERS, CONDITIONS, SIZES, MONTENEGRIN_CITIES, MAX_LISTING_IMAGES } from "../constants/listing";
import type { ListingInput } from "../lib/validation";

interface ImagePreview {
  file: File;
  previewUrl: string;
}

const EMPTY_FORM: ListingInput = {
  title: "",
  description: "",
  price: 0,
  negotiable: false,
  category_id: 0,
  gender: "unisex",
  size: "",
  brand: "",
  color: "",
  condition: "good",
  city: "",
};

export function CreateListingPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const showMeLocale = i18n.language !== "en";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ListingInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ListingInput, string>>>({});
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleField = <K extends keyof ListingInput>(key: K, value: ListingInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const combined = [...images.map((i) => i.file), ...arr];
    const err = validateImageFiles(combined);
    if (err) {
      setImageError(err);
      return;
    }
    setImageError(null);
    const previews: ImagePreview[] = arr.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...previews]);
  }, [images]);

  const removeImage = (idx: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
    setImageError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }

    // Validate images (type, extension, size, MIME/ext cross-check)
    const imgErr = validateImageFiles(images.map((i) => i.file));
    if (imgErr) {
      setImageError(imgErr);
      return;
    }

    // Validate magic bytes (actual file content — not spoofable by renaming)
    for (const img of images) {
      const magicErr = await validateImageMagicBytes(img.file);
      if (magicErr) {
        setImageError(magicErr);
        return;
      }
    }

    // Validate form
    const result = listingSchema.safeParse(form);
    if (!result.success) {
      const errs: Partial<Record<keyof ListingInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ListingInput;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      // Insert listing
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          category_id: result.data.category_id,
          title: result.data.title,
          description: result.data.description || null,
          price: result.data.price,
          negotiable: result.data.negotiable,
          gender: result.data.gender,
          size: result.data.size,
          brand: result.data.brand || null,
          color: result.data.color || null,
          condition: result.data.condition,
          city: result.data.city,
          status: "active",
        })
        .select("id")
        .single();

      if (listingError || !listingData) {
        setSubmitError(t("errors.generic"));
        setLoading(false);
        return;
      }

      const listingId = listingData.id as string;

      // Upload images
      const imageRows: { listing_id: string; storage_path: string; position: number }[] = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const ext = img.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/${listingId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, img.file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        imageRows.push({ listing_id: listingId, storage_path: path, position: i });
      }

      // If every upload failed, clean up the listing row and surface an error
      if (imageRows.length === 0) {
        await supabase.from("listings").delete().eq("id", listingId);
        setSubmitError("Učitavanje fotografija nije uspjelo. Pokušajte ponovo.");
        setLoading(false);
        return;
      }

      await supabase.from("listing_images").insert(imageRows);

      navigate(`/listings/${listingId}`);
    } catch (err) {
      console.error(err);
      setSubmitError(t("errors.generic"));
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold mb-6">{t("listing.create")}</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="mb-1.5 block">{t("listing.title")}</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => handleField("title", e.target.value)}
              maxLength={100}
            />
            {fieldErrors.title && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="mb-1.5 block">
              {t("listing.description")}{" "}
              <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
            </Label>
            <Textarea
              id="description"
              value={form.description ?? ""}
              onChange={(e) => handleField("description", e.target.value)}
              maxLength={2000}
              rows={4}
            />
            {fieldErrors.description && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.description}</p>
            )}
          </div>

          {/* Price + Negotiable */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price" className="mb-1.5 block">{t("listing.price")}</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={0.01}
                value={form.price === 0 ? "" : form.price}
                onChange={(e) =>
                  handleField("price", e.target.value === "" ? 0 : parseFloat(e.target.value))
                }
              />
              {fieldErrors.price && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.price}</p>
              )}
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.negotiable}
                  onCheckedChange={(v) => handleField("negotiable", !!v)}
                />
                <span className="text-sm">{t("listing.negotiable")}</span>
              </label>
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="mb-1.5 block">{t("listing.category")}</Label>
            <Select
              value={form.category_id ? String(form.category_id) : ""}
              onValueChange={(v) => handleField("category_id", parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("filters.all_categories")} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {showMeLocale ? cat.name_me : cat.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.category_id && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.category_id}</p>
            )}
          </div>

          {/* Gender + Size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">{t("listing.gender")}</Label>
              <Select
                value={form.gender}
                onValueChange={(v) =>
                  handleField("gender", v as ListingInput["gender"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {showMeLocale ? g.label_me : g.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.gender && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.gender}</p>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block">{t("listing.size")}</Label>
              <Select
                value={form.size}
                onValueChange={(v) => handleField("size", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.size && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.size}</p>
              )}
            </div>
          </div>

          {/* Brand + Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand" className="mb-1.5 block">
                {t("listing.brand")}{" "}
                <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
              </Label>
              <Input
                id="brand"
                value={form.brand ?? ""}
                onChange={(e) => handleField("brand", e.target.value)}
                maxLength={60}
              />
              {fieldErrors.brand && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.brand}</p>
              )}
            </div>
            <div>
              <Label htmlFor="color" className="mb-1.5 block">
                {t("listing.color")}{" "}
                <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
              </Label>
              <Input
                id="color"
                value={form.color ?? ""}
                onChange={(e) => handleField("color", e.target.value)}
                maxLength={50}
              />
              {fieldErrors.color && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.color}</p>
              )}
            </div>
          </div>

          {/* Condition */}
          <div>
            <Label className="mb-1.5 block">{t("listing.condition")}</Label>
            <Select
              value={form.condition}
              onValueChange={(v) =>
                handleField("condition", v as ListingInput["condition"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {showMeLocale ? c.label_me : c.label_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.condition && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.condition}</p>
            )}
          </div>

          {/* City */}
          <div>
            <Label className="mb-1.5 block">{t("listing.city")}</Label>
            <Select value={form.city} onValueChange={(v) => handleField("city", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("filters.all_cities")} />
              </SelectTrigger>
              <SelectContent>
                {MONTENEGRIN_CITIES.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.city && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.city}</p>
            )}
          </div>

          {/* Image upload */}
          <div>
            <Label className="mb-1.5 block">
              {t("listing.photos")}{" "}
              <span className="text-muted-foreground font-normal">
                (max {MAX_LISTING_IMAGES})
              </span>
            </Label>

            <div
              role="button"
              tabIndex={0}
              aria-label={t("listing.add_photos")}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("listing.add_photos")} {t("common.or")} prevuci i ispusti
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WEBP — max 5MB po slici
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />

            {imageError && (
              <p className="text-xs text-destructive mt-1">{imageError}</p>
            )}

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative h-20 w-20">
                    <img
                      src={img.previewUrl}
                      alt={`Fotografija ${idx + 1}`}
                      className="h-full w-full rounded-xl object-cover border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      aria-label={`Ukloni fotografiju ${idx + 1}`}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-0.5 left-0.5 rounded text-[10px] bg-black/60 text-white px-1">
                        Naslovnica
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div aria-live="polite" aria-atomic="true">
            {submitError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? t("common.loading") : t("listing.create")}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
