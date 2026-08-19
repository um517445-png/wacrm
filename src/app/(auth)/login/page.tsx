"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBranding } from "@/hooks/use-branding";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const urlError = searchParams.get("error");
  const t = useTranslations("LoginPage");
  const { logoUrl, brandingName } = useBranding();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allowPublicSignup, setAllowPublicSignup] = useState<boolean>(true);
  const supabase = createClient();
  const currentLogo = logoUrl || "/vorder-logo.png";

  useEffect(() => {
    if (urlError === "invalid_link" || urlError === "auth_callback_failed") {
      setError("انتهت صلاحية رابط التوثيق أو لم يعد صالساً، يرجى محاولة الدخول أو طلب رابط جديد.");
    }
  }, [urlError]);

  useEffect(() => {
    let cancelled = false;
    async function checkRegistration() {
      try {
        const res = await fetch("/api/settings/registration");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && typeof data.allowPublicSignup === "boolean") {
            setAllowPublicSignup(data.allowPublicSignup);
          }
        }
      } catch (err) {
        // Fallback default is true
      }
    }
    checkRegistration();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setError("لم يتم تأكيد البريد الإلكتروني بعد. يرجى فتح صندوق الرسائل ببريدك الإلكتروني والنقر على رابط التأكيد لتفعيل الحساب.");
      } else if (error.message.includes("Invalid login credentials")) {
        setError("بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    if (inviteToken) {
      window.location.href = `/join/${encodeURIComponent(inviteToken)}`;
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="items-center text-center">
          <div className="mb-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentLogo} alt={brandingName || "Vorder Logo"} className="h-12 w-auto max-w-[200px] object-contain" />
          </div>
          <CardTitle className="text-xl text-foreground">
            {inviteToken ? t("titleWithInvite") : t("title")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {inviteToken ? t("descWithInvite") : t("desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive dir-rtl text-right">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2 dir-rtl text-right">
              <Label htmlFor="email" className="text-foreground">
                {t("email")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border bg-background text-foreground rounded-xl"
              />
            </div>

            <div className="space-y-2 dir-rtl text-right">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">
                  {t("password")}
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border bg-background text-foreground rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-xl cursor-pointer"
            >
              {loading ? t("signingIn") : t("signIn")}
            </Button>
          </form>

          {allowPublicSignup || inviteToken ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("noAccount")}{" "}
              <Link
                href={
                  inviteToken
                    ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                    : "/signup"
                }
                className="text-primary hover:text-primary/80 font-semibold"
              >
                {t("createAccount")}
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-center text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
              {t("registrationDisabledNotice")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
