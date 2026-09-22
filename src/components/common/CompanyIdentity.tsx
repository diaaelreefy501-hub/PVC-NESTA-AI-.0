import React from "react";
import { useApp } from "../../context/AppContext";
import { CompanyLogo } from "./CompanyLogo";

interface CompanyIdentityProps {
  className?: string;
  size?: "2xs" | "xs" | "sm" | "md";
}

export const CompanyIdentity: React.FC<CompanyIdentityProps> = ({
  className = "",
  size = "xs",
}) => {
  const { companies, selectedCompanyIds } = useApp();

  if (!companies || companies.length === 0) {
    return null;
  }

  // Determine active selected companies
  const isAllSelected =
    selectedCompanyIds.length === 0 ||
    selectedCompanyIds.includes("all") ||
    selectedCompanyIds.length === companies.length;

  const selectedCompanies = isAllSelected
    ? companies
    : companies.filter((c) => selectedCompanyIds.includes(c.id));

  // Case 1: Single company selected
  if (!isAllSelected && selectedCompanies.length === 1) {
    const comp = selectedCompanies[0];
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 bg-[#18191B] rounded-xl border border-[#292B2E] text-xs font-bold text-[#EDEDED] shadow-2xs transition-all ${className}`}
        title={`الشركة الحالية: ${comp.name}`}
      >
        <CompanyLogo company={comp} size={size} />
        <span className="truncate max-w-[120px] font-bold text-[#EDEDED]">
          {comp.name}
        </span>
      </div>
    );
  }

  // Case 2: Two companies selected
  if (!isAllSelected && selectedCompanies.length === 2) {
    const comp1 = selectedCompanies[0];
    const comp2 = selectedCompanies[1];
    return (
      <div
        className={`inline-flex items-center gap-2 px-2 py-1 bg-[#18191B] rounded-xl border border-[#292B2E] text-xs font-bold text-[#EDEDED] shadow-2xs transition-all ${className}`}
      >
        <div className="inline-flex items-center gap-1">
          <CompanyLogo company={comp1} size={size} />
          <span className="truncate max-w-[85px]">{comp1.name}</span>
        </div>
        <span className="text-[#6B7280] font-normal">•</span>
        <div className="inline-flex items-center gap-1">
          <CompanyLogo company={comp2} size={size} />
          <span className="truncate max-w-[85px]">{comp2.name}</span>
        </div>
        <span className="text-[10px] text-[#C8A75A] font-mono bg-[#202225] px-1.5 py-0.5 rounded border border-[#292B2E]">
          2 من {companies.length}
        </span>
      </div>
    );
  }

  // Case 3: Multiple companies (3 or more) or All companies selected
  return (
    <div
      className={`inline-flex items-center gap-2 px-2 py-1 bg-[#18191B] rounded-xl border border-[#292B2E] text-xs font-bold text-[#EDEDED] shadow-2xs transition-all ${className}`}
    >
      <div className="flex -space-x-1.5 space-x-reverse overflow-hidden py-0.5">
        {selectedCompanies.slice(0, 3).map((comp) => (
          <CompanyLogo
            key={comp.id}
            company={comp}
            size={size}
            className="ring-2 ring-[#18191B] rounded-md"
          />
        ))}
      </div>
      <span className="text-xs font-bold text-[#EDEDED]">
        {isAllSelected
          ? `${companies.length} من ${companies.length} شركات`
          : `${selectedCompanies.length} من ${companies.length} شركات`}
      </span>
    </div>
  );
};
