"use client";

import { useState } from "react";
import Link from "next/link";
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
import { CheckCircle, ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useBranding } from "@/hooks/use-branding";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { logoUrl, brandingName } = useBranding();
  const currentLogo = logoUrl || "/vorder-logo.png";

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "فشل إرسال رابط إعادة التعيين");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card shadow-lg">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl text-foreground">
              افحص بريدك الإلكتروني!
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              تم إرسال رابط آمن لاستعادة كلمة المرور إلى البريد الإلكتروني{" "}
              <span className="font-semibold text-foreground">{email}</span>. يرجى فتح صندوق الوارد والنقر على الرابط لإعادة التعيين.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 dir-rtl text-right">
              🔒 تم تأمين العملية: لمزيد من الأمان لا يمكن إعادة تعيين كلمة المرور إلا من خلال فتح رابط التأكيد المرسل لبريدك الإلكتروني مباشرة.
            </div>

            <Link href="/login" className="block">
              <Button
                variant="outline"
                className="w-full rounded-xl border-border text-foreground hover:bg-muted"
              >
                العودة لصفحة تسجيل الدخول
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentLogo}
              alt={brandingName || "Vorder Logo"}
              className="h-12 w-auto max-w-[200px] object-contain"
            />
          </div>
          <CardTitle className="text-xl font-bold">إعادة تعيين كلمة المرور</CardTitle>
          <CardDescription>
            أدخل بريدك الإلكتروني وسيتم إرسال رابط استعادة آمن لبريدك فوراً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-400 dir-rtl text-right">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2 dir-rtl text-right">
              <Label htmlFor="email" className="text-muted-foreground">
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري إرسال البريد الإلكتروني...
                </span>
              ) : (
                "إرسال رابط إعادة التعيين لبريدي"
              )}
            </Button>
          </form>

          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة لتسجيل الدخول
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
