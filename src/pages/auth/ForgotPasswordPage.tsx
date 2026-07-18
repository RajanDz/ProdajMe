import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Layout } from "../../components/layout/Layout";
import { supabase } from "../../lib/supabase";
import { forgotPasswordSchema } from "../../lib/validation";
import type { ForgotPasswordInput } from "../../lib/validation";

export function ForgotPasswordPage() {
  const { t } = useTranslation();

  const [form, setForm] = useState<ForgotPasswordInput>({ email: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ForgotPasswordInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = forgotPasswordSchema.safeParse(form);
    if (!result.success) {
      const errs: Partial<Record<keyof ForgotPasswordInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ForgotPasswordInput;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setSubmitError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: "https://prodajme.shop/reset-password",
    });

    if (error) {
      setSubmitError(t("errors.generic"));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <Layout>
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">{t("auth.reset_password")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Unesite vašu email adresu i mi ćemo vam poslati link za resetovanje lozinke.
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-6">
                <p className="text-sm text-green-700 font-medium">{t("auth.reset_sent")}</p>
              </div>
              <Button asChild variant="outline">
                <Link to="/login">{t("auth.login_link")}</Link>
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <Label htmlFor="email" className="mb-1.5 block">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ email: e.target.value });
                      setFieldErrors({});
                      setSubmitError(null);
                    }}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                {submitError && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
                    <p className="text-sm text-destructive">{submitError}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? t("common.loading") : t("auth.send_reset_link")}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {t("auth.already_have_account")}{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  {t("auth.login_link")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
