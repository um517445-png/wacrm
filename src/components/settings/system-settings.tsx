'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Server, CheckCircle2, XCircle, Building2, Link2, Copy, Check, Sparkles, Users, CreditCard, DollarSign, Radio, ExternalLink, Edit3, UserCheck, Kanban, Trash2, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

interface TenantInfo {
  id: string;
  company_name: string;
  owner_email: string;
  owner_name: string;
  role: string;
  created_at: string;
  plan: string;
  status: string;
  days_remaining: number;
  invitation_token?: string | null;
  invitation_url?: string | null;
  linked_deal_id?: string | null;
  linked_deal_value?: number;
  linked_contact_id?: string | null;
}

interface ContactOption {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
}

interface DealOption {
  id: string;
  title: string;
  value: number | null;
  status: string;
}

export function SystemSettings() {
  const t = useTranslations('Settings.system');
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);

  const isSuperAdmin =
    profile?.account_role === 'super_admin' || profile?.email === 'mohamed701164@gmail.com';

  if (!isSuperAdmin) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Access Denied
          </CardTitle>
          <CardDescription>
            You do not have permission to view System & Account Settings. Super Admin privileges required.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const [updating, setUpdating] = useState(false);
  const [allowPublicSignup, setAllowPublicSignup] = useState(true);

  // Tenants Dashboard state
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [availableContacts, setAvailableContacts] = useState<ContactOption[]>([]);
  const [availableDeals, setAvailableDeals] = useState<DealOption[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);

  // Selection Checkboxes State (Full CRUD)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Edit Tenant Subscription Modal State
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null);
  const [editPrice, setEditPrice] = useState<number>(1000);
  const [editExtendDays, setEditExtendDays] = useState<number>(30);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedDealId, setSelectedDealId] = useState<string>('');
  const [updatingTenant, setUpdatingTenant] = useState(false);

  // Delete Tenant Confirmation Modal State (Single & Bulk)
  const [tenantToDelete, setTenantToDelete] = useState<TenantInfo | null>(null);
  const [deletingTenant, setDeletingTenant] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Tenant Invitation Generator state
  const [genCompanyName, setGenCompanyName] = useState('');
  const [genDurationDays, setGenDurationDays] = useState(30);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const [regRes, tenantsRes] = await Promise.all([
        fetch('/api/settings/registration'),
        fetch('/api/admin/tenants', { headers }),
      ]);

      if (regRes.ok) {
        const regData = await regRes.json();
        if (typeof regData.allowPublicSignup === 'boolean') {
          setAllowPublicSignup(regData.allowPublicSignup);
        }
      }

      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        if (Array.isArray(tenantsData.tenants)) {
          setTenants(tenantsData.tenants);
        }
        if (Array.isArray(tenantsData.availableContacts)) {
          setAvailableContacts(tenantsData.availableContacts);
        }
        if (Array.isArray(tenantsData.availableDeals)) {
          setAvailableDeals(tenantsData.availableDeals);
        }
      } else {
        console.warn('[SystemSettings] Tenants fetch returned status:', tenantsRes.status);
      }
    } catch (err) {
      console.error('[SystemSettings] Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setLoadingTenants(false);
    }
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('تم تحديث بيانات الاشتراكات والمبيعات حياً!');
  };

  useEffect(() => {
    loadData();

    const supabase = createClient();
    const channel = supabase
      .channel('realtime_system_tenants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_invitations' },
        () => loadData()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtime(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleToggle = async (checked: boolean) => {
    setUpdating(true);
    setAllowPublicSignup(checked);

    try {
      const res = await fetch('/api/settings/registration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowPublicSignup: checked }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update setting');
      }

      toast.success(checked ? t('toastEnabled') : t('toastDisabled'));
    } catch (err: any) {
      console.error('[SystemSettings] Toggle error:', err);
      setAllowPublicSignup(!checked);
      toast.error(err.message || t('toastError'));
    } finally {
      setUpdating(false);
    }
  };

  // Checkbox Selection Logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(tenants.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleOpenEditModal = (tenant: TenantInfo) => {
    setSelectedTenant(tenant);
    setEditPrice(tenant.linked_deal_value ?? 1000);
    setEditExtendDays(tenant.days_remaining > 0 ? tenant.days_remaining : 30);
    setSelectedContactId(tenant.linked_contact_id || '');
    setSelectedDealId(tenant.linked_deal_id || '');
  };

  const handleSaveTenantChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setUpdatingTenant(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          price: editPrice,
          extendDays: editExtendDays,
          contactId: selectedContactId || null,
          dealId: selectedDealId || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل تحديث اشتراك الشركة');
      }

      toast.success('تم تحديث وتنسيق اشتراك الشركة وتخصيص الـ CRM بنجاح!');
      setSelectedTenant(null);
      loadData();
    } catch (err: any) {
      console.error('[SystemSettings] Update tenant error:', err);
      toast.error(err.message || 'حدث خطأ أثناء تعديل الاشتراك');
    } finally {
      setUpdatingTenant(false);
    }
  };

  // Single Delete Tenant
  const handleDeleteTenant = async () => {
    if (!tenantToDelete) return;

    setDeletingTenant(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/admin/tenants/${tenantToDelete.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل حذف اشتراك الشركة');
      }

      toast.success(`تم حذف اشتراك وحساب شركة (${tenantToDelete.company_name}) بنجاح!`);
      setTenantToDelete(null);
      setSelectedIds((prev) => prev.filter((id) => id !== tenantToDelete.id));
      loadData();
    } catch (err: any) {
      console.error('[SystemSettings] Delete tenant error:', err);
      toast.error(err.message || 'حدث خطأ أثناء حذف الاشتراك');
    } finally {
      setDeletingTenant(false);
    }
  };

  // Bulk Delete Execution with Premium Modal (No native confirm())
  const handleExecuteBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    setDeletingBulk(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      let successCount = 0;
      for (const id of selectedIds) {
        try {
          const res = await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE', headers });
          if (res.ok) successCount++;
        } catch (err) {
          // Continue loop
        }
      }

      toast.success(`تم حذف ${successCount} اشتراكات وحسابات محددة بنجاح!`);
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الحذف الجماعي');
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleGenerateTenantLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingLink(true);
    setGeneratedUrl(null);
    setCopied(false);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/tenants/invitations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          companyName: genCompanyName.trim() || 'شركة جديدة',
          durationDays: genDurationDays,
          planType: 'monthly',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل توليد رابط الشركة الجديدة');
      }

      const data = await res.json();
      if (data?.url) {
        const cleanUrl = data.url.replace(/wacrm-real-app\.vercel\.app|wacrm-real\.vercel\.app|wacrm\.tech/g, 'vorder-app.vercel.app');
        setGeneratedUrl(cleanUrl);
        toast.success('تم توليد رابط تخصيص الشركة بنجاح!');
        loadData();
      } else {
        throw new Error('لم يتم إرجاع الرابط من السيرفر');
      }
    } catch (err: any) {
      console.error('[SystemSettings] Tenant invite error:', err);
      toast.error(err.message || 'حدث خطأ أثناء توليد الرابط');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLinkToClipboard = (url: string) => {
    const cleanUrl = url.replace(/wacrm-real-app\.vercel\.app|wacrm-real\.vercel\.app|wacrm\.tech/g, 'vorder-app.vercel.app');
    navigator.clipboard.writeText(cleanUrl);
    toast.success('تم نسخ رابط التفعيل إلى الحافظة!');
  };

  const totalBuyers = tenants.length;
  const activeSubs = tenants.filter((t) => t.status === 'active').length;
  const allSelected = tenants.length > 0 && selectedIds.length === tenants.length;
  const selectedTenantsList = tenants.filter((t) => selectedIds.includes(t.id));

  return (
    <div className="space-y-6">
      {/* Super Admin Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 dir-rtl text-right">
        <div>
          <CardTitle className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="size-6 text-amber-500" />
            {t('subscriptionsDashboardTitle')}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground max-w-3xl leading-relaxed pt-0.5">
            {t('subscriptionsDashboardDesc')}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl">
            <Radio className="size-3.5 animate-pulse text-emerald-500" />
            {t('realtimeActiveBadge')}
          </Badge>
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl">
            {t('superAdminActiveBadge')}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t('totalRegisteredTenants')}</p>
              <h3 className="text-2xl font-bold text-foreground">{tenants.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CreditCard className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t('activeSubscriptionsTile')}</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {tenants.filter(t => t.status === 'active' || t.days_remaining > 0).length}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <DollarSign className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t('crmSalesTileTitle')}</p>
              <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400">{t('crmAutoLinkBadge')}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Buyers & Subscriptions Data Table (Full CRUD) */}
      <Card className="border-border bg-card shadow-sm rounded-2xl">
        <CardHeader className="dir-rtl text-right flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground">{t('tableTitle')}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {t('tableDesc')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="text-xs rounded-xl gap-1.5 font-bold cursor-pointer animate-in fade-in-50 bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Trash2 className="size-3.5" />
                حذف المحددين ({selectedIds.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing || loadingTenants}
              onClick={handleManualRefresh}
              className="text-xs rounded-xl gap-1.5 border-border hover:bg-muted/50 transition-all cursor-pointer"
            >
              {refreshing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin text-amber-500" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5 text-amber-500" />
                  {t('manualRefresh')}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingTenants ? (
            <div className="p-8 text-center flex items-center justify-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="size-4 animate-spin text-primary" />
              جاري تحميل حسابات المشتريين...
            </div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              لا توجد حسابات مشتريين مسجلة حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="dir-rtl text-right">
                <TableHeader>
                  <TableRow className="border-border bg-muted/30">
                    <TableHead className="w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-input text-amber-600 focus:ring-amber-500/20 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold">{t('colCompanyName')}</TableHead>
                    <TableHead className="text-right text-xs font-bold">{t('colBuyerEmail')}</TableHead>
                    <TableHead className="text-right text-xs font-bold">{t('colActivationUrl')}</TableHead>
                    <TableHead className="text-right text-xs font-bold">{t('colPrice')}</TableHead>
                    <TableHead className="text-right text-xs font-bold">{t('colCrmLink')}</TableHead>
                    <TableHead className="text-right text-xs font-bold">{t('colDuration')}</TableHead>
                    <TableHead className="text-right text-xs font-bold">{t('colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenantItem) => {
                    const isSelected = selectedIds.includes(tenantItem.id);
                    return (
                      <TableRow key={tenantItem.id} className={`border-border hover:bg-muted/20 ${isSelected ? 'bg-amber-500/10' : ''}`}>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(tenantItem.id, e.target.checked)}
                            className="rounded border-input text-amber-600 focus:ring-amber-500/20 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-foreground">
                          {tenantItem.company_name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-foreground">
                          {tenantItem.owner_email}
                        </TableCell>
                        <TableCell>
                          {tenantItem.invitation_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyLinkToClipboard(tenantItem.invitation_url!)}
                              className="h-7 text-[11px] gap-1 text-amber-600 hover:text-amber-700 bg-amber-500/10 rounded-lg"
                            >
                              <Link2 className="size-3" />
                              {t('colActivationUrl')}
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {t('isolatedTenantBadge')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {tenantItem.linked_deal_value ?? 1000} EGP
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {tenantItem.linked_contact_id ? (
                              <Link href={`/contacts`} className="inline-flex items-center gap-1 text-[11px] text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-md hover:underline font-semibold">
                                <UserCheck className="size-3" />
                                Contact
                              </Link>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">{t('noContactLinked')}</Badge>
                            )}
                            {tenantItem.linked_deal_id ? (
                              <Link href={`/pipelines`} className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md hover:underline font-semibold">
                                <Kanban className="size-3" />
                                Deal
                              </Link>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">{t('noDealLinked')}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[11px]">
                            {tenantItem.days_remaining} D
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditModal(tenantItem)}
                              className="h-7 text-xs rounded-xl gap-1 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 cursor-pointer"
                            >
                              <Edit3 className="size-3" />
                              {t('btnEdit')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTenantToDelete(tenantItem)}
                              className="h-7 text-xs rounded-xl gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                              {t('btnDelete')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modern Bulk Delete Confirmation Dialog (Replaces native confirm()) */}
      {isBulkDeleteOpen && (
        <Dialog open={isBulkDeleteOpen} onOpenChange={() => setIsBulkDeleteOpen(false)}>
          <DialogContent className="sm:max-w-md dir-rtl text-right border-rose-500/30 shadow-2xl rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 pb-2">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 shrink-0">
                  <AlertTriangle className="size-6 text-rose-600" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    تأكيد حذف ({selectedIds.length}) اشتراكات وحسابات محددة
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                    إجراء أمني نهائي: سيتم مسح كافة الاشتراكات والحسابات التابعة لـ ({selectedIds.length}) شركات محددة كلياً.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 space-y-2 text-xs text-rose-700 dark:text-rose-400">
              <p className="font-semibold text-xs">قائمة الشركات المحددة للحذف النهائي:</p>
              <ul className="list-disc list-inside text-[11px] space-y-1 max-h-32 overflow-y-auto pr-1">
                {selectedTenantsList.map((t) => (
                  <li key={t.id} className="font-bold">
                    {t.company_name} <span className="font-mono text-muted-foreground font-normal">({t.owner_email})</span>
                  </li>
                ))}
              </ul>
            </div>

            <DialogFooter className="gap-2 pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsBulkDeleteOpen(false)} className="rounded-xl">
                إلغاء
              </Button>
              <Button
                type="button"
                disabled={deletingBulk}
                onClick={handleExecuteBulkDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl gap-2 font-semibold cursor-pointer shadow-md"
              >
                {deletingBulk ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                حذف المحددين كلياً ({selectedIds.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Tenant Confirmation Dialog (Single Item) */}
      {tenantToDelete && (
        <Dialog open={!!tenantToDelete} onOpenChange={() => setTenantToDelete(null)}>
          <DialogContent className="sm:max-w-md dir-rtl text-right border-rose-500/30 rounded-2xl shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 pb-2">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 shrink-0">
                  <AlertTriangle className="size-6 text-rose-600" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    تأكيد حذف شركة ({tenantToDelete.company_name})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                    تحذير أمني: هل أنت مقتنع برغبتك في حذف اشتراك هذه الشركة وحسابها كلياً من المنصة؟
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 space-y-1 text-xs text-rose-700 dark:text-rose-400">
              <p className="font-semibold">البيانات التي سيتم حذفها كلياً:</p>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 pt-1">
                <li>سجل الاشتراك التابع للشركة ({tenantToDelete.plan}).</li>
                <li>سجل الدعوة والرابط المستعمل ({tenantToDelete.owner_email}).</li>
                <li>الملف الشخصي والحساب التابع للـ Owner بـ Auth System.</li>
              </ul>
            </div>

            <DialogFooter className="gap-2 pt-3">
              <Button type="button" variant="ghost" onClick={() => setTenantToDelete(null)} className="rounded-xl">
                إلغاء
              </Button>
              <Button
                type="button"
                disabled={deletingTenant}
                onClick={handleDeleteTenant}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl gap-2 font-semibold cursor-pointer shadow-md"
              >
                {deletingTenant ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                تأكيد الحذف النهائي
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Tenant Subscription Edit Modal with 2 Dropdown Selects */}
      {selectedTenant && (
        <Dialog open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
          <DialogContent className="sm:max-w-md dir-rtl text-right rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="size-5 text-amber-500" />
                {t('editModalTitle', { name: selectedTenant.company_name })}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t('editModalSubtitle')}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveTenantChanges} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-tenant-price" className="text-xs font-semibold">{t('editModalPriceLabel')}</Label>
                <Input
                  id="edit-tenant-price"
                  type="number"
                  min={0}
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="rounded-xl font-bold text-foreground"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-tenant-days" className="text-xs font-semibold">{t('editModalDurationLabel')}</Label>
                <Input
                  id="edit-tenant-days"
                  type="number"
                  min={1}
                  max={3650}
                  value={editExtendDays}
                  onChange={(e) => setEditExtendDays(Number(e.target.value))}
                  className="rounded-xl"
                  required
                />
              </div>

              {/* 1. Dropdown Select for CRM Contact */}
              <div className="space-y-1.5 dir-rtl text-right">
                <Label htmlFor="select-contact-id" className="text-xs font-semibold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                  <UserCheck className="size-3.5" />
                  {t('editModalSelectContact')}
                </Label>
                <select
                  id="select-contact-id"
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground font-medium focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">{t('noContactLinked')}</option>
                  {availableContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || 'N/A'} ({c.email || c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Dropdown Select for CRM Kanban Deal */}
              <div className="space-y-1.5 dir-rtl text-right">
                <Label htmlFor="select-deal-id" className="text-xs font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Kanban className="size-3.5" />
                  {t('editModalSelectDeal')}
                </Label>
                <select
                  id="select-deal-id"
                  value={selectedDealId}
                  onChange={(e) => setSelectedDealId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground font-medium focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">{t('noDealLinked')}</option>
                  {availableDeals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.value ?? 0}) - [{d.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 space-y-2 text-xs text-blue-700 dark:text-blue-300">
                <div className="flex items-center gap-2 font-semibold">
                  <ExternalLink className="size-4" />
                  {t('editModalCrmQuickLinks')}
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Link href="/contacts" target="_blank" className="underline font-bold text-purple-600 dark:text-purple-400">
                    {t('editModalContactsPage')}
                  </Link>
                  <Link href="/pipelines" target="_blank" className="underline font-bold text-blue-600 dark:text-blue-400">
                    {t('editModalKanbanPage')}
                  </Link>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setSelectedTenant(null)}>
                  {t('editModalCancelBtn')}
                </Button>
                <Button type="submit" disabled={updatingTenant} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-2 font-semibold">
                  {updatingTenant ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  {t('editModalSaveBtn')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Tenant Invitation Link Generator Card */}
      <Card className="border-border bg-card shadow-sm rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Building2 className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">توليد روابط تخصيص الشركات الجدد (New Tenant Provisioning)</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                قم بتوليد رابط مخصص وابعثه للمشتري ليقوم بإنشاء شركته المستقلة كـ Owner دون فتح التسجيل العام بالمنصة.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <form onSubmit={handleGenerateTenantLink} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 dir-rtl text-right">
                <Label htmlFor="gen-company-name" className="text-xs font-semibold text-foreground">اسم الشركة المشتراة</Label>
                <Input
                  id="gen-company-name"
                  type="text"
                  placeholder="مثال: شركة النور للمقاولات"
                  value={genCompanyName}
                  onChange={(e) => setGenCompanyName(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5 dir-rtl text-right">
                <Label htmlFor="gen-duration" className="text-xs font-semibold text-foreground">مدة الاشتراك / التجربة (أيام)</Label>
                <Input
                  id="gen-duration"
                  type="number"
                  placeholder="30"
                  min={1}
                  max={365}
                  value={genDurationDays}
                  onChange={(e) => setGenDurationDays(Number(e.target.value))}
                  className="rounded-xl"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={generatingLink}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-2 font-semibold transition-all cursor-pointer"
            >
              {generatingLink ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  جاري توليد الرابط...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  توليد رابط دعوة الشركة الجديدة
                </>
              )}
            </Button>
          </form>

          {generatedUrl && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3 dir-rtl text-right animate-in fade-in-50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-xs">
                  <Link2 className="size-4" />
                  <span>الرابط الجاهز للإرسال للعميل:</span>
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px]">
                  مستقل كلياً (Isolated Tenant)
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={(generatedUrl || '').replace(/wacrm-real-app\.vercel\.app|wacrm-real\.vercel\.app|wacrm\.tech|wacrm[^\/.]*/g, 'vorder-app.vercel.app')}
                  className="font-mono text-xs bg-background rounded-xl border-amber-500/30 text-foreground"
                />
                <Button
                  type="button"
                  onClick={() => {
                    const clean = (generatedUrl || '').replace(/wacrm-real-app\.vercel\.app|wacrm-real\.vercel\.app|wacrm\.tech|wacrm[^\/.]*/g, 'vorder-app.vercel.app');
                    navigator.clipboard.writeText(clean);
                    setCopied(true);
                    toast.success('تم نسخ الرابط إلى الحافظة!');
                    setTimeout(() => setCopied(false), 2500);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-1.5 shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      تم النسخ
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      نسخ الرابط
                    </>
                  )}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                💡 أرسل هذا الرابط للمشتري ليفتح الصفحة وينشئ حسابه كـ Owner لشركته الخاصة بـ 0 صفقات وتأمين تام.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration & System Security Card */}
      <Card className="border-border bg-card shadow-sm rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Server className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">{t('publicSignupTitle')}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {t('publicSignupDesc')}
                </CardDescription>
              </div>
            </div>
            {loading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant={allowPublicSignup ? 'default' : 'destructive'} className="gap-1 px-3 py-1 text-xs font-semibold rounded-lg">
                {allowPublicSignup ? (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    {t('statusEnabled')}
                  </>
                ) : (
                  <>
                    <XCircle className="size-3.5" />
                    {t('statusDisabled')}
                  </>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="flex items-center justify-between rounded-xl border border-border p-4 bg-muted/20 hover:bg-muted/40 transition-all">
            <div className="space-y-1 dir-rtl text-right">
              <Label htmlFor="public-signup-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
                {t('toggleLabel')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('toggleSubtext')}
              </p>
            </div>
            <Switch
              id="public-signup-toggle"
              checked={allowPublicSignup}
              onCheckedChange={handleToggle}
              disabled={loading || updating}
              className="data-[state=checked]:bg-purple-600 cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
