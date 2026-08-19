"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function SetupTenantPage() {
  return (
    <Suspense fallback={null}>
      <SetupTenantInner />
    </Suspense>
  );
}

function SetupTenantInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("رابط الدعوة غير متاح أو منتهي الصلاحية");
      return;
    }

    setLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://vorder-app.vercel.app";

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/dashboard`,
        },
      });

      if (authError) {
        toast.error(authError.message);
        setLoading(false);
        return;
      }

      toast.success("تم إنشاء الحساب بنجاح! جاري إعداد الشركة جديدة...");
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err.message || "فشل إعداد الشركة الجديدة");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="items-center text-center">
            <CardTitle className="text-xl text-destructive">رابط غير صالح</CardTitle>
            <CardDescription>برجاء الحصول على رابط دعوة شركة متاح من إدارة المنصة.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold">تفعيل شركة جديدة بالمنصة</CardTitle>
          <CardDescription>قم بإنشاء حسابك كمالك (Owner) لشركتك المستقلة</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">اسم الشركة / المؤسسة</label>
              <Input
                type="text"
                placeholder="مثال: شركة الأمل العقارية"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">البريد الإلكتروني للـ Owner</label>
              <Input
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">كلمة المرور</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  جاري البناء والتفعيل...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  تفعيل الشركة والبدء
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
