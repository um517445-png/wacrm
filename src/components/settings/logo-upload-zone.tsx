"use client";

import { useState, useEffect, useRef, DragEvent, ChangeEvent } from "react";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { UploadCloud, Image as ImageIcon, Trash2, RefreshCw, Type, Globe, CheckCircle, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useBranding } from "@/hooks/use-branding";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No 2D context");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export function LogoUploadZone() {
  const { accountRole } = useAuth();
  const isSuperAdmin = accountRole === "owner";

  const { logoUrl, uploadLogo, removeLogo, isLoading, refresh } = useBranding();
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop & Compress State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // White-Label State — nameAr & nameEn
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    async function loadBrandingInfo() {
      try {
        const res = await fetch("/api/settings/branding");
        if (res.ok) {
          const data = await res.json();
          if (data.nameAr) setNameAr(data.nameAr);
          if (data.nameEn) setNameEn(data.nameEn);
        }
      } catch (err) {
        console.error("[LogoUploadZone] Failed to load branding:", err);
      }
    }
    loadBrandingInfo();
  }, []);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("نوع الملف غير مدعوم! يرجى رفع صورة بصيغة PNG أو JPG أو WEBP أو SVG");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً! يجب ألا يتجاوز 5 ميجابايت");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropAndCompress = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsCompressing(true);
    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);

      // Compress with browser-image-compression to max ~50KB
      const compressedBlob = await imageCompression(croppedBlob as File, {
        maxSizeMB: 0.05,
        maxWidthOrHeight: 512,
        useWebWorker: true,
        fileType: "image/png",
      });

      const finalFile = new File([compressedBlob], `logo-${Date.now()}.png`, { type: "image/png" });

      // Update local preview
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(finalFile);

      await uploadLogo(finalFile);
      await refresh();
      setImageToCrop(null);
      toast.success("تم اقتصاص وضغط الشعار ورفعه بنجاح! 🎨");
    } catch (err: any) {
      console.error("[LogoUploadZone] Crop/Compress error:", err);
      toast.error(`فشل اقتصاص وضغط الشعار: ${err.message || "حدث خطأ غير متوقع"}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemove = async () => {
    try {
      await removeLogo();
      setPreviewUrl(null);
      toast.success("تم حذف الشعار وإعادة الشعار الافتراضي");
    } catch (err: any) {
      toast.error("فشل حذف الشعار");
    }
  };

  const handleSaveWhiteLabel = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSavingSettings(true);
    try {
      const payload: any = {
        logoUrl: previewUrl || logoUrl,
        nameAr,
        nameEn,
      };

      const res = await fetch("/api/settings/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "فشل حفظ إعدادات الهوية");
      }

      const data = await res.json();
      if (data.logoUrl) setPreviewUrl(data.logoUrl);
      if (data.nameAr) setNameAr(data.nameAr);
      if (data.nameEn) setNameEn(data.nameEn);

      await refresh();
      toast.success("تم حفظ وتطبيق اسم السستم والهوية البصرية بنجاح دون ريلود! 🚀");
    } catch (err: any) {
      console.error("[LogoUploadZone] Save White-Label error:", err);
      toast.error(`فشل حفظ الهوية: ${err.message || "تأكد من الاتصال وسجل البيانات"}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const currentLogo = previewUrl || logoUrl;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            {isSuperAdmin ? <Sparkles className="size-5" /> : <ImageIcon className="size-5" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {isSuperAdmin ? "إدارة الهوية الشاملة والـ White-Label (Super-Admin)" : "شعار مساحة العمل والحساب"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSuperAdmin
                ? "خصّص الشعار والاسم والدومين الرئيسي المعتمد بجميع أجزاء المنظومة (صلاحيات المالك)."
                : "خصّص شعار مساحة العمل الخاصة بشركتك وحسابك الشخصي."}
            </p>
          </div>
        </div>
        {currentLogo && (
          <button
            onClick={handleRemove}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-destructive/20"
          >
            <Trash2 className="size-3.5" />
            إزالة الشعار
          </button>
        )}
      </div>

      {/* 1. Drag & Drop Logo Section */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ImageIcon className="size-4 text-purple-600" />
          شعار المنظومة الرئيسي (Drag & Drop Logo)
        </Label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Preview Box */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/80 bg-muted/30 min-h-[140px]">
            <span className="text-xs font-medium text-muted-foreground mb-2">المعاينة الحالية</span>
            {currentLogo ? (
              <div className="relative group p-2 rounded-lg bg-background shadow-xs border border-border flex items-center justify-center">
                <img
                  src={currentLogo}
                  alt="Logo Preview"
                  className="max-h-20 max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center text-center p-3">
                <div className="size-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-lg mb-1">
                  V
                </div>
                <span className="text-xs font-semibold text-foreground">WA CRM | فوردَر</span>
                <span className="text-[10px] text-muted-foreground">الشعار الافتراضي الرسمى</span>
              </div>
            )}
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`md:col-span-2 cursor-pointer flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all duration-200 min-h-[140px] text-center ${
              isDragging
                ? "border-purple-500 bg-purple-500/5 scale-[0.99]"
                : "border-border hover:border-purple-400 hover:bg-muted/20"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
            />

            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="size-7 text-purple-600 animate-spin" />
                <span className="text-xs font-medium text-muted-foreground">جاري رفع وتطبيق الشعار...</span>
              </div>
            ) : (
              <>
                <div className="size-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
                  <UploadCloud className="size-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  اسحب صورة الشعار هنا أو <span className="text-purple-600 underline">اضغط للاختيار والتعديل</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  يتضمن واجهة قص وتعديل تلقائي | PNG, JPG, WEBP بحجم أقصى 5MB
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Super-Admin Only Controls */}
      {isSuperAdmin && (
        <>
          {/* 2. System Names Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="name-ar" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Type className="size-4 text-purple-600" />
                اسم المنظومة (بالعربية)
              </Label>
              <Input
                id="name-ar"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveWhiteLabel(e); } }}
                placeholder="WA CRM | فوردَر"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name-en" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Type className="size-4 text-purple-600" />
                اسم المنظومة (بالإنجليزية)
              </Label>
              <Input
                id="name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveWhiteLabel(e); } }}
                placeholder="WA CRM | Vorder"
              />
            </div>
          </div>

          {/* Save Button for Super-Admin */}
          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              type="button"
              onClick={(e) => handleSaveWhiteLabel(e)}
              disabled={savingSettings || isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2 rounded-xl shadow-md transition-all"
            >
              {savingSettings ? (
                <>
                  <RefreshCw className="size-4 animate-spin ml-2" />
                  جاري حفظ وتطبيق اسم السستم والهوية...
                </>
              ) : (
                "حفظ وتطبيق اسم السستم والهوية البصرية"
              )}
            </Button>
          </div>
        </>
      )}

      {/* Crop & Resize Modal */}
      <Dialog open={!!imageToCrop} onOpenChange={() => setImageToCrop(null)}>
        <DialogContent className="sm:max-w-lg bg-card border border-border p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-5 text-purple-600" />
              ضبط واقتطاع أبعاد الشعار (Logo Crop & Resize)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative w-full h-64 bg-slate-950 rounded-xl overflow-hidden border border-border">
              {imageToCrop && (
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={4 / 1}
                  onCropChange={setCrop}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                  onZoomChange={setZoom}
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>تكبير / تصغير (Zoom)</span>
                <span>{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setImageToCrop(null)}
              disabled={isCompressing}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCropAndCompress}
              disabled={isCompressing}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-4 py-2 rounded-xl"
            >
              {isCompressing ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin ml-1.5" />
                  جاري الضغط والرفع...
                </>
              ) : (
                "قص وتأكيد الشعار ✂️"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
