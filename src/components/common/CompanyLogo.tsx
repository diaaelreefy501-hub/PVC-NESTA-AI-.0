import React, { useState, useEffect } from "react";
import { Company } from "../../types";

interface CompanyLogoProps {
  company?: Company | null;
  size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "print";
  className?: string;
  showName?: boolean;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  company,
  size = "md",
  className = "",
  showName = false,
}) => {
  const [imgError, setImgError] = useState(false);

  // Retrieve logo directly from company object (Supabase source of truth)
  const logoSrc = React.useMemo(() => {
    if (!company) return null;
    if (company.logoUrl) return company.logoUrl;
    if (typeof window !== "undefined" && company.id) {
      const local =
        localStorage.getItem(`pvc_nesta_v1_comp_logo_${company.id}`) ||
        localStorage.getItem(`pvc_nesta_v4_comp_logo_${company.id}`) ||
        localStorage.getItem(`pvc_nesta_v3_comp_logo_${company.id}`);
      if (local) return local;
    }
    return null;
  }, [company?.logoUrl, company?.id]);

  // Reset error state whenever the logo URL changes
  useEffect(() => {
    setImgError(false);
  }, [logoSrc]);

  if (!company) {
    return (
      <div
        className={`rounded-md bg-[#111111] text-[#C8A75A] flex items-center justify-center font-bold font-mono text-[9px] shrink-0 ${className}`}
      >
        PN
      </div>
    );
  }

  const sizeClasses = {
    "2xs": "w-4 h-4 text-[8px] rounded-xs",
    xs: "w-5 h-5 text-[9px] rounded-md",
    sm: "w-7 h-7 text-[10px] rounded-lg",
    md: "w-9 h-9 text-xs rounded-xl",
    lg: "w-12 h-12 text-sm rounded-2xl",
    xl: "w-16 h-16 text-base rounded-2xl",
    print: "w-16 h-16 text-xs rounded-xl",
  };

  const hasImage = Boolean(logoSrc && !imgError);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {hasImage ? (
        <div
          className={`${sizeClasses[size]} overflow-hidden flex items-center justify-center bg-white border border-[#EAEAEA] shadow-2xs shrink-0 p-0.5`}
        >
          <img
            src={logoSrc!}
            alt={company.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain rounded-xs"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div
          className={`${sizeClasses[size]} flex items-center justify-center font-extrabold text-white shadow-2xs shrink-0 tracking-wider`}
          style={{ backgroundColor: company.color || "#111111" }}
        >
          {company.logoText || company.name.substring(0, 2).toUpperCase()}
        </div>
      )}

      {showName && (
        <div className="leading-tight truncate">
          <div className="font-bold text-[#EDEDED] text-xs truncate">{company.name}</div>
          {company.nameEn && (
            <div className="text-[9px] text-[#A1A1AA] font-mono truncate">{company.nameEn}</div>
          )}
        </div>
      )}
    </div>
  );
};
