"use client";

import { useState, useEffect, useCallback } from "react";

export interface BrandingState {
  logoUrl: string | null;
  brandingName: string;
  isLoading: boolean;
  error: string | null;
  uploadLogo: (file: File) => Promise<void>;
  removeLogo: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useBranding(): BrandingState {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandingName, setBrandingName] = useState<string>("Vorder");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const formatLogoUrl = (url: string | null) => {
    if (!url || url === "/vorder-logo.png") return url;
    // Append timestamp query parameter to bust browser and CDN cache
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${Date.now()}`;
  };

  const fetchBranding = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Primary: try system settings branding
      const res = await fetch("/api/settings/branding");
      if (res.ok) {
        const data = await res.json();
        if (data?.logoUrl && data.logoUrl !== "/vorder-logo.png") {
          setLogoUrl(formatLogoUrl(data.logoUrl));
          setBrandingName(data.nameAr || data.nameEn || "Vorder");
          setIsLoading(false);
          return;
        }
      }

      // Secondary: try account branding
      const accRes = await fetch("/api/account");
      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData?.account) {
          if (accData.account.logo_url) {
            setLogoUrl(formatLogoUrl(accData.account.logo_url));
          }
          setBrandingName(accData.account.branding_name || accData.account.name || "Vorder");
        }
      }
    } catch (err) {
      console.error("[useBranding] Failed to fetch branding:", err);
      setError("Failed to load branding info");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const uploadLogo = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/account/branding", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }

      const data = await res.json();
      if (data?.account?.logo_url) {
        setLogoUrl(formatLogoUrl(data.account.logo_url));
        setBrandingName(data.account.branding_name || data.account.name || "Vorder");
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload logo");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeLogo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/branding", {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Removal failed");
      }

      setLogoUrl(null);
    } catch (err: any) {
      setError(err.message || "Failed to remove logo");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    logoUrl,
    brandingName,
    isLoading,
    error,
    uploadLogo,
    removeLogo,
    refresh: fetchBranding,
  };
}
