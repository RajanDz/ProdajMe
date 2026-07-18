import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Upload, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
import { profileSchema, validateImageFile, validateImageMagicBytes } from "../lib/validation";
import { MONTENEGRIN_CITIES } from "../constants/listing";
import { getAvatarUrl } from "../lib/utils";
import type { ProfileInput } from "../lib/validation";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL ?? "";

export function EditProfilePage() {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileInput>({
    username: "",
    full_name: "",
    phone: "",
    city: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileInput, string>>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        username: profile.username ?? "",
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        city: profile.city ?? "",
      });
    }
  }, [profile]);

  const handleField = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleAvatarChange = async (file: File) => {
    const err = validateImageFile(file);
    if (err) {
      setAvatarError(err);
      return;
    }
    const magicErr = await validateImageMagicBytes(file);
    if (magicErr) {
      setAvatarError(magicErr);
      return;
    }
    setAvatarError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const removeAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const result = profileSchema.safeParse(form);
    if (!result.success) {
      const errs: Partial<Record<keyof ProfileInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ProfileInput;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setSubmitError(null);
    setSuccess(false);

    try {
      // Pre-check username availability if it changed
      if (result.data.username !== profile?.username) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", result.data.username)
          .maybeSingle();

        if (existing) {
          setFieldErrors({ username: "Ovo korisničko ime je već zauzeto." });
          setLoading(false);
          return;
        }
      }

      let avatarStoragePath: string | undefined;

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { cacheControl: "3600", upsert: true });

        if (uploadError) {
          setSubmitError(t("errors.generic"));
          setLoading(false);
          return;
        }
        avatarStoragePath = path;
      }

      const updateData: {
        username: string;
        full_name?: string | null;
        phone: string;
        city: string;
        avatar_url?: string;
      } = {
        username: result.data.username,
        full_name: result.data.full_name || null,
        phone: result.data.phone,
        city: result.data.city,
      };

      if (avatarStoragePath) {
        updateData.avatar_url = avatarStoragePath;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (updateError) {
        if (updateError.code === "23505") {
          setFieldErrors({ username: "Ovo korisničko ime je već zauzeto." });
        } else {
          setSubmitError(t("errors.generic"));
        }
        setLoading(false);
        return;
      }

      await refreshProfile();
      setSuccess(true);
      setTimeout(() => navigate("/profile"), 1200);
    } catch (err) {
      console.error(err);
      setSubmitError(t("errors.generic"));
      setLoading(false);
    }
  };

  const currentAvatarUrl = profile?.avatar_url
    ? getAvatarUrl(profile.avatar_url, SUPABASE_URL)
    : undefined;

  const displayAvatar = avatarPreview ?? currentAvatarUrl;
  const displayInitials = (form.username || "U").slice(0, 2).toUpperCase();

  return (
    <Layout>
      <div className="mx-auto max-w-md px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold mb-6">{t("profile.edit_profile")}</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {displayAvatar && (
                  <AvatarImage src={displayAvatar} alt="Avatar" />
                )}
                <AvatarFallback className="text-xl">{displayInitials}</AvatarFallback>
              </Avatar>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {t("profile.avatar")}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleAvatarChange(e.target.files[0]); }}
            />

            {avatarError && (
              <p className="text-xs text-destructive">{avatarError}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <Label htmlFor="username" className="mb-1.5 block">{t("auth.username")}</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => handleField("username", e.target.value)}
              maxLength={30}
              autoCapitalize="none"
            />
            {fieldErrors.username && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.username}</p>
            )}
          </div>

          {/* Full name */}
          <div>
            <Label htmlFor="full_name" className="mb-1.5 block">
              {t("auth.full_name")}{" "}
              <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
            </Label>
            <Input
              id="full_name"
              value={form.full_name ?? ""}
              onChange={(e) => handleField("full_name", e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone" className="mb-1.5 block">{t("auth.phone")}</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleField("phone", e.target.value)}
            />
            {fieldErrors.phone && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>
            )}
          </div>

          {/* City */}
          <div>
            <Label className="mb-1.5 block">{t("auth.city")}</Label>
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

          {submitError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3">
              <p className="text-sm text-green-700">Profil je uspješno ažuriran!</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/profile")}
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
