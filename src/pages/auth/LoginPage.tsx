import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Layout } from "../../components/layout/Layout";
import { supabase } from "../../lib/supabase";
import { loginSchema } from "../../lib/validation";
import type { LoginInput } from "../../lib/validation";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [form, setForm] = useState<LoginInput>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleField = (key: keyof LoginInput, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errs: Partial<Record<keyof LoginInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof LoginInput;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setSubmitError(null);

    // TURNSTILE: Add Cloudflare Turnstile widget here before submit

    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("invalid")) {
        setSubmitError("Neispravna email adresa ili lozinka.");
      } else {
        setSubmitError(t("errors.generic"));
      }
      setLoading(false);
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <Layout>
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">{t("auth.login")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("app.tagline")}
            </p>
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
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  {t("auth.forgot_password")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => handleField("password", e.target.value)}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {submitError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t("common.loading") : t("auth.login")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.no_account")}{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              {t("auth.sign_up_link")}
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
