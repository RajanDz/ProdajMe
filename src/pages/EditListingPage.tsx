import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { listingSchema, validateImageFile, validateImageFiles, validateImageMagicBytes } from "../lib/validation";
import { CATEGORIES } from "../constants/categories";
import { GENDERS, CONDITIONS, SIZES, MONTENEGRIN_CITIES, MAX_LISTING_IMAGES } from "../constants/listing";
import { getImageUrl } from "../lib/utils";
import type { ListingInput } from "../lib/validation";
import type { Listing, ListingImage } from "../types";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL ?? "";

interface NewImagePreview {
  type: "new";
  file: File;
  previewUrl: string;
}

interface ExistingImagePreview {
  type: "existing";
  image: ListingImage;
  markedForDelete: boolean;
}

type ImageItem = NewImagePreview | ExistingImagePreview;

export function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const showMeLocale = i18n.language !== "en";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [listing, setListing] = useState<Listing | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState<ListingInput>({
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
  });

  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ListingInput, string>>>({});
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setPageLoading(true);
      const { data, error } = await supabase
        .from("listings")
        .select("*, listing_images(*)")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setPageLoading(false);
        return;
      }

      const fetched = data as unknown as Listing;

      // Guard: only owner can edit
      if (fetched.user_id !== user?.id) {
        navigate(`/listings/${id}`, { replace: true });
        return;
      }

      setListing(fetched);
      setForm({
        title: fetched.title,
        description: fetched.description ?? "",
        price: fetched.price,
        negotiable: fetched.negotiable,
        category_id: fetched.category_id,
        gender: fetched.gender,
        size: fetched.size,
        brand: fetched.brand ?? "",
        color: fetched.color ?? "",
        condition: fetched.condition,
        city: fetched.city,
      });

      const sorted = (fetched.listing_images ?? []).sort((a, b) => a.position - b.position);
      setImageItems(
        sorted.map((img) => ({
          type: "existing" as const,
          image: img,
          markedForDelete: false,
        }))
      );

      setPageLoading(false);
    })();
  }, [id, user, navigate]);

  const handleField = <K extends keyof ListingInput>(key: K, value: ListingInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      // Count non-deleted existing + new files
      const activeCount = imageItems.filter(
        (item) => !(item.type === "existing" && item.markedForDelete)
      ).length;
      if (activeCount + arr.length > MAX_LISTING_IMAGES) {
        setImageError(`Možete dodati najviše ${MAX_LISTING_IMAGES} fotografija.`);
        return;
      }

      for (const file of arr) {
        const err = validateImageFile(file);
        if (err) {
          setImageError(err);
          return;
        }
      }
      setImageError(null);
      const previews: NewImagePreview[] = arr.map((f) => ({
        type: "new",
        file: f,
        previewUrl: URL.createObjectURL(f),
      }));
      setImageItems((prev) => [...prev, ...previews]);
    },
    [imageItems]
  );

  const toggleDeleteExisting = (idx: number) => {
    setImageItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx || item.type !== "existing") return item;
        return { ...item, markedForDelete: !item.markedForDelete };
      })
    );
    setImageError(null);
  };

  const removeNew = (idx: number) => {
    setImageItems((prev) => {
      const item = prev[idx];
      if (item.type === "new") URL.revokeObjectURL(item.previewUrl);
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
    if (!user || !id) return;

    // Validate images
    const activeItems = imageItems.filter(
      (item) => !(item.type === "existing" && item.markedForDelete)
    );
    const newFiles = activeItems
      .filter((item): item is NewImagePreview => item.type === "new")
      .map((i) => i.file);
    const existingCount = activeItems.filter((item) => item.type === "existing").length;

    if (existingCount + newFiles.length === 0) {
      setImageError("Dodajte najmanje jednu fotografiju.");
      return;
    }

    if (newFiles.length > 0) {
      const imgErr = validateImageFiles(newFiles);
      if (imgErr) {
        setImageError(imgErr);
        return;
      }
      // Validate magic bytes for new uploads
      for (const file of newFiles) {
        const magicErr = await validateImageMagicBytes(file);
        if (magicErr) {
          setImageError(magicErr);
          return;
        }
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
      // Update listing
      const { error: updateError } = await supabase
        .from("listings")
        .update({
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
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (updateError) {
        setSubmitError(t("errors.generic"));
        setLoading(false);
        return;
      }

      // Delete marked images (batched)
      const toDelete = imageItems.filter(
        (item): item is ExistingImagePreview =>
          item.type === "existing" && item.markedForDelete
      );

      if (toDelete.length > 0) {
        const paths = toDelete.map((item) => item.image.storage_path);
        const ids = toDelete.map((item) => item.image.id);
        await supabase.storage.from("listing-images").remove(paths);
        await supabase.from("listing_images").delete().in("id", ids);
      }

      // Upload new images
      const existingActiveCount = imageItems.filter(
        (item): item is ExistingImagePreview =>
          item.type === "existing" && !item.markedForDelete
      ).length;

      const newItems = imageItems.filter(
        (item): item is NewImagePreview => item.type === "new"
      );

      const imageRows: { listing_id: string; storage_path: string; position: number }[] = [];

      for (let i = 0; i < newItems.length; i++) {
        const img = newItems[i];
        const ext = img.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/${id}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, img.file, { cacheControl: "3600", upsert: false });

        if (!uploadError) {
          imageRows.push({
            listing_id: id,
            storage_path: path,
            position: existingActiveCount + i,
          });
        }
      }

      if (imageRows.length > 0) {
        await supabase.from("listing_images").insert(imageRows);
      }

      navigate(`/listings/${id}`);
    } catch (err) {
      console.error(err);
      setSubmitError(t("errors.generic"));
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (notFound || !listing) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">{t("errors.listing_not_found")}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            {t("common.back")}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold mb-6">{t("listing.edit")}</h1>

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
                onValueChange={(v) => handleField("gender", v as ListingInput["gender"])}
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
            </div>
            <div>
              <Label className="mb-1.5 block">{t("listing.size")}</Label>
              <Select value={form.size} onValueChange={(v) => handleField("size", v)}>
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
            </div>
          </div>

          {/* Condition */}
          <div>
            <Label className="mb-1.5 block">{t("listing.condition")}</Label>
            <Select
              value={form.condition}
              onValueChange={(v) => handleField("condition", v as ListingInput["condition"])}
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

          {/* Images */}
          <div>
            <Label className="mb-1.5 block">
              {t("listing.photos")}{" "}
              <span className="text-muted-foreground font-normal">(max {MAX_LISTING_IMAGES})</span>
            </Label>

            {/* Existing images */}
            {imageItems.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {imageItems.map((item, idx) => {
                  if (item.type === "existing") {
                    return (
                      <div key={item.image.id} className="relative h-20 w-20">
                        <img
                          src={getImageUrl(item.image.storage_path, SUPABASE_URL)}
                          alt={`Fotografija ${idx + 1}`}
                          loading="lazy"
                          className={`h-full w-full rounded-xl object-cover border-2 transition-all ${
                            item.markedForDelete
                              ? "opacity-40 border-destructive"
                              : "border-border"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => toggleDeleteExisting(idx)}
                          aria-label={item.markedForDelete ? `Poništi brisanje fotografije ${idx + 1}` : `Obriši fotografiju ${idx + 1}`}
                          aria-pressed={item.markedForDelete}
                          className={`absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            item.markedForDelete ? "bg-muted-foreground" : "bg-destructive"
                          }`}
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                        {item.markedForDelete && (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-destructive font-semibold">
                            Briše se
                          </span>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div key={`new-${idx}`} className="relative h-20 w-20">
                        <img
                          src={item.previewUrl}
                          alt={`Fotografija ${idx + 1}`}
                          className="h-full w-full rounded-xl object-cover border border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => removeNew(idx)}
                          aria-label={`Ukloni fotografiju ${idx + 1}`}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <span className="absolute bottom-0.5 left-0.5 rounded text-[10px] bg-primary/80 text-white px-1">
                          Nova
                        </span>
                      </div>
                    );
                  }
                })}
              </div>
            )}

            <div
              role="button"
              tabIndex={0}
              aria-label={t("listing.add_photos")}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("listing.add_photos")}</p>
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
          </div>

          <div aria-live="polite" aria-atomic="true">
            {submitError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/listings/${id}`)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
