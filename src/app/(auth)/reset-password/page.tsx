"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useBranding } from "@/hooks/use-branding";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { logoUrl, brandingName } = useBranding();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const currentLogo = logoUrl || "/vorder-logo.png";

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && mounted) {
        setCheckingSession(false);
        return;
      }

      // Listen for auth state change in case hash is hydrating
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session && mounted) {
          setCheckingSession(false);
        }
      });

      // Brief fallback timeout
      const timeout = setTimeout(() => {
        if (mounted) {
          setCheckingSession(false);
        }
      }, 1500);

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير مطابقتين");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن لا تقل عن 6 أحرف");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      toast.success("تم تحديث كلمة المرور بنجاح!");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "فشل تحديث كلمة المرور");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentLogo} alt={brandingName || "Vorder Logo"} className="h-12 w-auto max-w-[200px] object-contain" />
          </div>
          <CardTitle className="text-xl font-bold">تعيين كلمة مرور جديدة</CardTitle>
          <CardDescription>أدخل كلمة المرور الجديدة لحسابك بالمنظومة</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 dir-rtl text-right">
                {error}
              </div>
            )}

            <div className="space-y-1.5 dir-rtl text-right">
              <Label htmlFor="password">كلمة المرور الجديدة</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5 dir-rtl text-right">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="rounded-xl"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-xl gap-2 cursor-pointer">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  حفظ كلمة المرور والبدء
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
