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

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

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
  const [googleLoading, setGoogleLoading] = useState(false);
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
        emailRedirectTo: `${window.location.origin}/auth/confirm-email`,
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

    // If Supabase email confirmation is disabled, the user session is returned immediately.
    // If email confirmation is enabled, we show the success message; the trigger creates
    // the profile on confirm and onboarding_completed will be set to true the first time
    // the user reaches OnboardingPage and submits the pre-filled form.
    if (data.user && !data.session) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    // Auto-confirmed: the handle_new_user trigger creates the profiles row asynchronously.
    // Retry until the row appears, then mark onboarding as complete — the user provided
    // all required data (username, city, phone) during registration.
    if (data.user) {
      let profileExists = false;

      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (existing) {
          profileExists = true;
          break;
        }

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (profileExists) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", data.user.id);
      } else {
        // Trigger did not fire in time — upsert as fallback
        await supabase.from("profiles").upsert({
          id: data.user.id,
          username: result.data.username,
          phone: result.data.phone,
          city: result.data.city,
          onboarding_completed: true,
        });
      }
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setSubmitError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setSubmitError("Registracija putem Google-a nije uspjela. Pokušajte ponovo.");
      setGoogleLoading(false);
    }
    // On success the browser redirects away — no need to reset loading
  };

  const isAnyLoading = loading || googleLoading;

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

          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            disabled={isAnyLoading}
            onClick={handleGoogleSignIn}
          >
            {googleLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <GoogleIcon />
            )}
            <span className="ml-2">Nastavi sa Google</span>
          </Button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">ili</span>
            </div>
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

            <Button type="submit" className="w-full" size="lg" disabled={isAnyLoading}>
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
