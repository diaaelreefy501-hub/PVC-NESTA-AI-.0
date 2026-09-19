import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { DateFilterOption } from "../../types";
import {
  Filter,
  Building2,
  Package,
  Calendar,
  X,
  RotateCcw,
  ChevronDown,
  Check,
} from "lucide-react";

interface GlobalFilterBarProps {
  showProductFilter?: boolean;
  showCompanyFilter?: boolean;
  showDateFilter?: boolean;
  className?: string;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  showProductFilter = true,
  showCompanyFilter = true,
  showDateFilter = true,
  className = "",
}) => {
  const {
    companies,
    products,
    globalFilters,
    updateGlobalCompanyFilter,
    updateGlobalProductFilter,
    updateGlobalDateFilter,
    resetGlobalFilters,
    activeCompanyId,
  } = useApp();

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [customStart, setCustomStart] = useState(globalFilters.customStartDate || "");
  const [customEnd, setCustomEnd] = useState(globalFilters.customEndDate || "");

  // Unique product categories & names
  const productCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];
  const productList = products.slice(0, 30);

  const dateOptions: { id: DateFilterOption; label: string }[] = [
    { id: "all", label: "كل الفترات" },
    { id: "today", label: "اليوم" },
    { id: "week", label: "آخر 7 أيام" },
    { id: "month", label: "هذا الشهر" },
    { id: "last_month", label: "الشهر السابق" },
    { id: "custom", label: "تاريخ مخصص" },
  ];

  const hasActiveFilters =
    (globalFilters.companyIds && globalFilters.companyIds.length > 0) ||
    (globalFilters.productIds && globalFilters.productIds.length > 0) ||
    globalFilters.dateRange !== "all";

  const handleToggleCompany = (compId: string) => {
    const current = globalFilters.companyIds || [];
    if (current.includes(compId)) {
      updateGlobalCompanyFilter(current.filter((id) => id !== compId));
    } else {
      updateGlobalCompanyFilter([...current, compId]);
    }
  };

  const handleToggleProduct = (prodIdOrCategory: string) => {
    const current = globalFilters.productIds || [];
    if (current.includes(prodIdOrCategory)) {
      updateGlobalProductFilter(current.filter((id) => id !== prodIdOrCategory));
    } else {
      updateGlobalProductFilter([...current, prodIdOrCategory]);
    }
  };

  const handleApplyCustomDate = () => {
    if (customStart || customEnd) {
      updateGlobalDateFilter("custom", customStart, customEnd);
      setIsDateDropdownOpen(false);
    }
  };

  return (
    <div
      id="nesta-global-filter-bar"
      className={`bg-[#18191B] border border-[#292B2E] rounded-xl p-3 text-xs text-[#EDEDED] shadow-sm flex flex-wrap items-center justify-between gap-3 ${className}`}
      dir="rtl"
    >
      {/* Left / Start: Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-[#A1A1AA] font-semibold text-[11px] ml-1">
          <Filter className="w-3.5 h-3.5 text-[#C8A75A]" />
          <span>فلترة شاملة:</span>
        </div>

        {/* 1. Company Filter */}
        {showCompanyFilter && (
          <div className="relative">
            <button
              id="filter-company-btn"
              onClick={() => {
                setIsCompanyDropdownOpen(!isCompanyDropdownOpen);
                setIsProductDropdownOpen(false);
                setIsDateDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                globalFilters.companyIds && globalFilters.companyIds.length > 0
                  ? "bg-[#C8A75A]/15 border-[#C8A75A] text-[#C8A75A]"
                  : "bg-[#202225] border-[#292B2E] text-[#EDEDED] hover:border-[#3E4247]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>
                {globalFilters.companyIds && globalFilters.companyIds.length > 0
                  ? `${globalFilters.companyIds.length} شركات محددة`
                  : "الشركات (الكل)"}
              </span>
              <ChevronDown className="w-3 h-3 text-[#A1A1AA]" />
            </button>

            {isCompanyDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-60 bg-[#202225] border border-[#292B2E] rounded-xl shadow-xl z-50 p-2 space-y-1">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#292B2E] px-1 text-[11px] text-[#A1A1AA]">
                  <span>تحديد الشركات</span>
                  <button
                    onClick={() => updateGlobalCompanyFilter([])}
                    className="text-[#C8A75A] hover:underline cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 pt-1">
                  {companies.map((c) => {
                    const isSelected = globalFilters.companyIds?.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleToggleCompany(c.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-right transition-colors cursor-pointer text-xs ${
                          isSelected
                            ? "bg-[#C8A75A]/20 text-[#C8A75A] font-bold"
                            : "text-[#EDEDED] hover:bg-[#292B2E]"
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#C8A75A]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Product Filter */}
        {showProductFilter && (
          <div className="relative">
            <button
              id="filter-product-btn"
              onClick={() => {
                setIsProductDropdownOpen(!isProductDropdownOpen);
                setIsCompanyDropdownOpen(false);
                setIsDateDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                globalFilters.productIds && globalFilters.productIds.length > 0
                  ? "bg-[#C8A75A]/15 border-[#C8A75A] text-[#C8A75A]"
                  : "bg-[#202225] border-[#292B2E] text-[#EDEDED] hover:border-[#3E4247]"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>
                {globalFilters.productIds && globalFilters.productIds.length > 0
                  ? `${globalFilters.productIds.length} منتجات/فئات`
                  : "المنتجات (الكل)"}
              </span>
              <ChevronDown className="w-3 h-3 text-[#A1A1AA]" />
            </button>

            {isProductDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-64 bg-[#202225] border border-[#292B2E] rounded-xl shadow-xl z-50 p-2 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#292B2E] px-1 text-[11px] text-[#A1A1AA]">
                  <span>فلترة بالمنتج أو الفئة</span>
                  <button
                    onClick={() => updateGlobalProductFilter([])}
                    className="text-[#C8A75A] hover:underline cursor-pointer"
                  >
                    تفريغ
                  </button>
                </div>

                {/* Categories */}
                {productCategories.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-[#A1A1AA] font-bold px-1">الفئات:</div>
                    <div className="flex flex-wrap gap-1">
                      {productCategories.map((cat) => {
                        const isSelected = globalFilters.productIds?.includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => handleToggleProduct(cat)}
                            className={`px-2 py-0.5 rounded text-[11px] border transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[#C8A75A] text-black font-bold border-[#C8A75A]"
                                : "bg-[#18191B] text-[#A1A1AA] border-[#292B2E] hover:text-white"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Specific Products List */}
                <div className="max-h-40 overflow-y-auto space-y-1 pt-1 border-t border-[#292B2E]">
                  <div className="text-[10px] text-[#A1A1AA] font-bold px-1 mb-1">المنتجات:</div>
                  {productList.map((prod) => {
                    const isSelected = globalFilters.productIds?.includes(prod.id);
                    return (
                      <button
                        key={prod.id}
                        onClick={() => handleToggleProduct(prod.id)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-right transition-colors cursor-pointer text-[11px] ${
                          isSelected
                            ? "bg-[#C8A75A]/20 text-[#C8A75A] font-bold"
                            : "text-[#EDEDED] hover:bg-[#292B2E]"
                        }`}
                      >
                        <span className="truncate">{prod.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-[#C8A75A]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Date Range Filter */}
        {showDateFilter && (
          <div className="relative">
            <button
              id="filter-date-btn"
              onClick={() => {
                setIsDateDropdownOpen(!isDateDropdownOpen);
                setIsCompanyDropdownOpen(false);
                setIsProductDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                globalFilters.dateRange !== "all"
                  ? "bg-[#C8A75A]/15 border-[#C8A75A] text-[#C8A75A]"
                  : "bg-[#202225] border-[#292B2E] text-[#EDEDED] hover:border-[#3E4247]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {dateOptions.find((o) => o.id === globalFilters.dateRange)?.label || "الفترة"}
              </span>
              <ChevronDown className="w-3 h-3 text-[#A1A1AA]" />
            </button>

            {isDateDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-56 bg-[#202225] border border-[#292B2E] rounded-xl shadow-xl z-50 p-2 space-y-1.5">
                <div className="text-[11px] text-[#A1A1AA] pb-1 border-b border-[#292B2E] px-1 font-bold">
                  اختر النطاق الزمني
                </div>
                <div className="space-y-0.5">
                  {dateOptions.map((opt) => {
                    const isSelected = globalFilters.dateRange === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (opt.id !== "custom") {
                            updateGlobalDateFilter(opt.id);
                            setIsDateDropdownOpen(false);
                          } else {
                            updateGlobalDateFilter("custom", customStart, customEnd);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-right transition-colors cursor-pointer text-xs ${
                          isSelected
                            ? "bg-[#C8A75A]/20 text-[#C8A75A] font-bold"
                            : "text-[#EDEDED] hover:bg-[#292B2E]"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#C8A75A]" />}
                      </button>
                    );
                  })}
                </div>

                {globalFilters.dateRange === "custom" && (
                  <div className="pt-2 border-t border-[#292B2E] space-y-2">
                    <div>
                      <label className="text-[10px] text-[#A1A1AA] block mb-1">من تاريخ:</label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full bg-[#18191B] border border-[#292B2E] rounded px-2 py-1 text-xs text-[#EDEDED]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#A1A1AA] block mb-1">إلى تاريخ:</label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full bg-[#18191B] border border-[#292B2E] rounded px-2 py-1 text-xs text-[#EDEDED]"
                      />
                    </div>
                    <button
                      onClick={handleApplyCustomDate}
                      className="w-full py-1.5 bg-[#C8A75A] text-black font-bold rounded-lg text-xs hover:bg-[#B3934B] transition-colors cursor-pointer"
                    >
                      تطبيق النطاق
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right / End: Active Filter Pills & Reset */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          {/* Active Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {globalFilters.companyIds &&
              globalFilters.companyIds.map((cId) => {
                const c = companies.find((comp) => comp.id === cId);
                return (
                  <span
                    key={cId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#202225] border border-[#C8A75A]/40 text-[#C8A75A] rounded-md text-[11px]"
                  >
                    <span>{c?.name || cId}</span>
                    <button
                      onClick={() => handleToggleCompany(cId)}
                      className="hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}

            {globalFilters.productIds &&
              globalFilters.productIds.map((pId) => {
                const p = products.find((prod) => prod.id === pId);
                return (
                  <span
                    key={pId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#202225] border border-[#C8A75A]/40 text-[#C8A75A] rounded-md text-[11px]"
                  >
                    <span>{p?.name || pId}</span>
                    <button
                      onClick={() => handleToggleProduct(pId)}
                      className="hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}

            {globalFilters.dateRange !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#202225] border border-[#C8A75A]/40 text-[#C8A75A] rounded-md text-[11px]">
                <span>
                  {dateOptions.find((o) => o.id === globalFilters.dateRange)?.label}
                  {globalFilters.dateRange === "custom" && customStart && ` (${customStart})`}
                </span>
                <button
                  onClick={() => updateGlobalDateFilter("all")}
                  className="hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Reset button */}
          <button
            id="reset-all-filters-btn"
            onClick={resetGlobalFilters}
            className="flex items-center gap-1 text-[11px] text-[#A1A1AA] hover:text-[#EF4444] transition-colors cursor-pointer px-2 py-1 rounded hover:bg-[#202225]"
            title="إعادة ضبط كافة الفلاتر"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إلغاء الفلاتر</span>
          </button>
        </div>
      )}
    </div>
  );
};
