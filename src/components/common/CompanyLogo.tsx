import React, { useState, useEffect } from "react";
import { Company } from "../../types";

interface CompanyLogoProps {
  company?: Company | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "print";
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

  // Retrieve logo directly or fallback to persistent storage
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
        className={`rounded-xl bg-[#111111] text-[#C8A75A] flex items-center justify-center font-bold font-mono text-xs ${className}`}
      >
        PN
      </div>
    );
  }

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px] rounded-md",
    sm: "w-8 h-8 text-xs rounded-lg",
    md: "w-10 h-10 text-sm rounded-xl",
    lg: "w-14 h-14 text-base rounded-2xl",
    xl: "w-20 h-20 text-xl rounded-2xl",
    print: "w-20 h-20 text-lg rounded-2xl",
  };

  const hasImage = Boolean(logoSrc && !imgError);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {hasImage ? (
        <div
          className={`${sizeClasses[size]} overflow-hidden flex items-center justify-center bg-white border border-[#EAEAEA] shadow-2xs shrink-0 p-1`}
        >
          <img
            src={logoSrc!}
            alt={company.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain rounded"
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
        <div className="leading-tight">
          <div className="font-extrabold text-[#111111] text-sm">{company.name}</div>
          {company.nameEn && (
            <div className="text-[10px] text-[#6B7280] font-mono">{company.nameEn}</div>
          )}
        </div>
      )}
    </div>
  );
};
