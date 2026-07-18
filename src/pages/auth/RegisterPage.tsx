import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { signUpSchema } from "../../lib/validation";
import { MONTENEGRIN_CITIES } from "../../constants/listing";
import type { SignUpInput } from "../../lib/validation";

export function RegisterPage() {
  const { t } = useTranslation();

  const [form, setForm] = useState<SignUpInput>({
    email: "",
    password: "",
    username: "",
    phone: "",
    city: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignUpInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleField = (key: keyof SignUpInput, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = signUpSchema.safeParse(form);
    if (!result.success) {
      const errs: Partial<Record<keyof SignUpInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof SignUpInput;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setSubmitError(null);

    // Check username availability before calling signUp.
    // If we skip this and the trigger fails on a duplicate username,
    // the entire auth.users insert rolls back and the user gets a generic error.
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", result.data.username)
      .maybeSingle();

    if (existingUser) {
      setFieldErrors({ username: "Ovo korisničko ime je zauzeto." });
      setLoading(false);
      return;
    }

    // TURNSTILE: Add Cloudflare Turnstile widget here before submit

    const { data, error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: "https://prodajme.shop",
        data: {
          username: result.data.username,
          phone: result.data.phone,
          city: result.data.city,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setSubmitError("Ova email adresa je već registrovana.");
      } else {
        setSubmitError(t("errors.generic"));
      }
      setLoading(false);
      return;
    }

    // If Supabase email confirmation is disabled, the user session is returned immediately
    // and the trigger will have created the profile. If email confirmation is enabled, we
    // show the success message and the trigger creates the profile on confirm.
    if (data.user && !data.session) {
      // Email confirmation required
      setSuccess(true);
      setLoading(false);
      return;
    }

    // Auto-confirmed: try inserting profile (in case trigger didn't run)
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        username: result.data.username,
        phone: result.data.phone,
        city: result.data.city,
      });
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <Layout>
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="w-full max-w-sm text-center">
            <div className="mb-4 text-5xl">✉️</div>
            <h1 className="text-xl font-bold mb-2">{t("auth.check_email")}</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Provjerite vaš inbox i kliknite na link za potvrdu registracije.
            </p>
            <Button asChild variant="outline">
              <Link to="/login">{t("auth.login_link")}</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">{t("auth.sign_up")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t("app.tagline")}</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <Label htmlFor="email" className="mb-1.5 block">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => handleField("email", e.target.value)}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="mb-1.5 block">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => handleField("password", e.target.value)}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="username" className="mb-1.5 block">{t("auth.username")}</Label>
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

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t("common.loading") : t("auth.sign_up")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.already_have_account")}{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              {t("auth.login_link")}
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
