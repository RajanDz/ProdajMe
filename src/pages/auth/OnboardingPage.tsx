import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Layout } from "../../components/layout/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { onboardingSchema } from "../../lib/validation";
import { MONTENEGRIN_CITIES } from "../../constants/listing";
import type { OnboardingInput } from "../../lib/validation";

export function OnboardingPage() {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<OnboardingInput>({
    username: "",
    full_name: "",
    phone: "",
    city: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof OnboardingInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pre-fill from existing profile data (Google may have provided full_name)
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

  const handleField = <K extends keyof OnboardingInput>(key: K, value: OnboardingInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const result = onboardingSchema.safeParse(form);
    if (!result.success) {
      const errs: Partial<Record<keyof OnboardingInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof OnboardingInput;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setSubmitError(null);

    // Check username uniqueness (exclude own current username)
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

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: result.data.username,
        full_name: result.data.full_name || null,
        phone: result.data.phone || null,
        city: result.data.city,
        onboarding_completed: true,
      })
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
    navigate("/", { replace: true });
  };

  // Resolve avatar: Google provides a full https:// URL, storage paths are relative
  const avatarSrc = profile?.avatar_url
    ? profile.avatar_url.startsWith("http")
      ? profile.avatar_url
      : undefined
    : undefined;

  const displayInitials = (form.username || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <Layout>
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8 gap-3">
            <Avatar className="h-16 w-16">
              {avatarSrc && <AvatarImage src={avatarSrc} alt="Google avatar" />}
              <AvatarFallback className="text-xl">{displayInitials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Dobro došli na Prodaj.me!</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Podesite vaš profil da biste mogli prodavati i kupovati.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Username */}
            <div>
              <Label htmlFor="username" className="mb-1.5 block">
                {t("auth.username")}
              </Label>
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                value={form.username}
                onChange={(e) => handleField("username", e.target.value)}
                maxLength={30}
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
              {fieldErrors.full_name && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.full_name}</p>
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

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="mb-1.5 block">
                {t("auth.phone")}{" "}
                <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => handleField("phone", e.target.value)}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>
              )}
            </div>

            {submitError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t("common.loading") : "Nastavi"}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
