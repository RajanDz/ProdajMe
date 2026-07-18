import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Layout } from "../../components/layout/Layout";
import { supabase } from "../../lib/supabase";
import { z } from "zod";

const resetSchema = z
  .object({
    password: z.string().min(8, "Lozinka mora imati najmanje 8 znakova.").max(128),
    confirm: z.string().min(1, "Potvrdite lozinku."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Lozinke se ne podudaraju.",
    path: ["confirm"],
  });

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const result = resetSchema.safeParse({ password, confirm });
    if (!result.success) {
      const errs: { password?: string; confirm?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as "password" | "confirm";
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: result.data.password });

    if (error) {
      setSubmitError("Nije moguće resetovati lozinku. Link je možda istekao — zatražite novi.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => navigate("/"), 2000);
  };

  if (success) {
    return (
      <Layout>
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="w-full max-w-sm text-center">
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-4">
              <p className="text-sm text-green-700 font-medium">
                Lozinka je uspješno promijenjena. Preusmjeravamo vas...
              </p>
            </div>
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
            <h1 className="text-2xl font-bold">{t("auth.reset_password")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">Unesite novu lozinku.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <Label htmlFor="password" className="mb-1.5 block">
                Nova lozinka
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirm" className="mb-1.5 block">
                Potvrdite lozinku
              </Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setErrors((prev) => ({ ...prev, confirm: undefined }));
                }}
              />
              {errors.confirm && (
                <p className="text-xs text-destructive mt-1">{errors.confirm}</p>
              )}
            </div>

            {submitError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t("common.loading") : "Sačuvaj novu lozinku"}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
