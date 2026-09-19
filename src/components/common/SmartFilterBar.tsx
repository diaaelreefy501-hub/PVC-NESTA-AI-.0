import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { CompanyId } from "../../types";
import {
  Search,
  Filter,
  X,
  RotateCcw,
  Calendar,
  Building2,
  Users,
  MapPin,
  Flame,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface FilterState {
  search: string;
  companyId: string;
  stage: string;
  status: string;
  area: string;
  responsible: string;
  source: string;
  interestLevel: string;
  priority: string;
  datePreset: string; // 'all' | 'today' | 'week' | 'month' | 'custom'
  startDate?: string;
  endDate?: string;
  followUpStatus?: string;
}

export interface SmartFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;

  // Options toggles
  showCompanyFilter?: boolean;
  showStageFilter?: boolean;
  stageOptions?: Array<{ value: string; label: string }>;
  showStatusFilter?: boolean;
  statusOptions?: Array<{ value: string; label: string }>;
  showAreaFilter?: boolean;
  areaOptions?: string[];
  showResponsibleFilter?: boolean;
  showSourceFilter?: boolean;
  showInterestFilter?: boolean;
  showPriorityFilter?: boolean;
  showDateFilter?: boolean;
  showFollowUpStatusFilter?: boolean;
  totalResultsCount?: number;
}

export const SmartFilterBar: React.FC<SmartFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  showCompanyFilter = true,
  showStageFilter = true,
  stageOptions,
  showStatusFilter = false,
  statusOptions,
  showAreaFilter = true,
  areaOptions,
  showResponsibleFilter = true,
  showSourceFilter = true,
  showInterestFilter = true,
  showPriorityFilter = false,
  showDateFilter = true,
  showFollowUpStatusFilter = false,
  totalResultsCount,
}) => {
  const { companies, users, areas, navigationFilter, clearNavigationFilter } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);

  // Available unique areas
  const effectiveAreas = areaOptions && areaOptions.length > 0 ? areaOptions : areas;

  // Calculate active filter count
  const activeCount = [
    filters.search.trim() ? 1 : 0,
    filters.companyId && filters.companyId !== "all" ? 1 : 0,
    filters.stage && filters.stage !== "all" ? 1 : 0,
    filters.status && filters.status !== "all" ? 1 : 0,
    filters.area && filters.area !== "all" ? 1 : 0,
    filters.responsible && filters.responsible !== "all" ? 1 : 0,
    filters.source && filters.source !== "all" ? 1 : 0,
    filters.interestLevel && filters.interestLevel !== "all" ? 1 : 0,
    filters.priority && filters.priority !== "all" ? 1 : 0,
    filters.datePreset && filters.datePreset !== "all" ? 1 : 0,
    filters.followUpStatus && filters.followUpStatus !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const updateField = (field: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  const handleReset = () => {
    clearNavigationFilter();
    onReset();
  };

  return (
    <div className="bg-[#18191B] rounded-2xl border border-[#292B2E] shadow-2xs overflow-hidden transition-all duration-200" dir="rtl">
      {/* Top Search Bar & Quick Toggles */}
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateField("search", e.target.value)}
            placeholder="بحث بالاسم، الهاتف، المنطقة، الملاحظات..."
            className="w-full pr-10 pl-9 py-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs sm:text-sm text-[#EDEDED] placeholder:text-[#6B7280] focus:border-[#C8A75A] focus:outline-none transition-all"
          />
          {filters.search && (
            <button
              onClick={() => updateField("search", "")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#EDEDED] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Filter Count Badge */}
          {activeCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#C8A75A]/20 text-[#C8A75A] border border-[#C8A75A]/30 flex items-center gap-1">
              <span>{activeCount} فلتر نشط</span>
            </span>
          )}

          {/* Reset button */}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#292B2E]"
              title="إعادة ضبط الفلاتر"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#C8A75A]" />
              <span className="hidden sm:inline">مسح الفلاتر</span>
            </button>
          )}

          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              isExpanded || activeCount > 0
                ? "bg-[#C8A75A] text-[#111111] border-[#C8A75A]"
                : "bg-[#202225] text-[#EDEDED] border-[#292B2E] hover:border-[#C8A75A]/50"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>فلاتر متقدمة</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Drill-down notification banner */}
      {navigationFilter && (
        <div className="px-4 py-2 bg-[#C8A75A]/10 border-t border-[#C8A75A]/30 flex items-center justify-between text-xs text-[#C8A75A]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C8A75A] animate-pulse" />
            <span>
              عرض مفلتر موجه من لوحة التحكم (Drill-down)
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-[#EDEDED] hover:text-[#C8A75A] font-bold underline cursor-pointer"
          >
            إلغاء الفلتر وععرض الكل
          </button>
        </div>
      )}

      {/* Expanded Smart Filters Panel */}
      {isExpanded && (
        <div className="p-4 border-t border-[#292B2E] bg-[#1D1F21] space-y-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Company Filter */}
            {showCompanyFilter && (
              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#C8A75A]" />
                  الشركة
                </label>
                <select
                  value={filters.companyId}
                  onChange={(e) => updateField("companyId", e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-medium text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                >
                  <option value="all">جميع الشركات</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Stage Filter */}
            {showStageFilter && (
              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#C8A75A]" />
                  المرحلة
                </label>
                <select
                  value={filters.stage}
                  onChange={(e) => updateField("stage", e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-medium text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                >
                  <option value="all">جميع المراحل</option>
                  {stageOptions?.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  )) || (
                    <>
                      <option value="inquiry">استفسار جديد</option>
                      <option value="contacted">تم التواصل</option>
                      <option value="inspection">معاينة ومقايسة</option>
                      <option value="quotation">عرض سعر</option>
                      <option value="contracted">تم التعاقد ✓</option>
                      <option value="lost">صفقة خاسرة</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Status Filter */}
            {showStatusFilter && statusOptions && (
              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1">
                  الحالة
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-medium text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                >
                  <option value="all">جميع الحالات</option>
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Area Filter */}
            {showAreaFilter && (
              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#C8A75A]" />
                  المنطقة
                </label>
                <select
                  value={filters.area}
                  onChange={(e) => updateField("area", e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-medium text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                >
                  <option value="all">جميع المناطق</option>
                  {effectiveAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Responsible Salesperson Filter */}
            {showResponsibleFilter && (
              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#C8A75A]" />
                  المسؤول
                </label>
                <select
                  value={filters.responsible}
                  onChange={(e) => updateField("responsible", e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-medium text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                >
                  <option value="all">الكل</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Source Filter */}
            {showSourceFilter && (
              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1">
                  المصدر
                </label>
                <select
                  value={filters.source}
                  onChange={(e) => updateField("source", e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-medium text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                >
                  <option value="all">جميع المصادر</option>
                  <option value="facebook">فيسبوك</option>
                  <option value="instagram">انستجرام</option>
                  <option value="whatsapp">واتساب</option>
                  <option value="tiktok">تيك توك</option>
                  <option value="recommendation">ترشيح / عميل سابق</option>
                  <option value="direct">مباشر / مقر الشركة</option>
                  <option value="phone">مكالمة هاتفية</option>
                </select>
              </div>
            )}

            {/* Interest Level Filter */}
            {showInterestFilter && (
              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-500" />
                  درجة الاهتمام
                </label>
                <select
                  value={filters.interestLevel}
                  onChange={(e) => updateField("interestLevel", e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-medium text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                >
                  <option value="all">الكل</option>
                  <option value="hot">ساخن جداً 🔥 (Hot)</option>
                  <option value="warm">متوسط (Warm)</option>
                  <option value="cold">بارد (Cold)</option>
                </select>
              </div>
            )}

            {/* Priority Filter */}
            {showPriorityFilter && (
              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1">
                  الأولوية
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => updateField("priority", e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-medium text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                >
                  <option value="all">جميع الأولويات</option>
                  <option value="high">عالية 🔥</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                </select>
              </div>
            )}

            {/* Follow-up Status Filter */}
            {showFollowUpStatusFilter && (
              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1">
                  حالة المتابعة
                </label>
                <select
                  value={filters.followUpStatus}
                  onChange={(e) => updateField("followUpStatus", e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-medium text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                >
                  <option value="all">جميع المتابعات</option>
                  <option value="today">اليوم ⏰</option>
                  <option value="overdue">متأخرة ⚠️</option>
                  <option value="upcoming">قادمة 📅</option>
                  <option value="completed">مكتملة ✓</option>
                </select>
              </div>
            )}

            {/* Date Preset Filter */}
            {showDateFilter && (
              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#C8A75A]" />
                  الفترة الزمنية
                </label>
                <select
                  value={filters.datePreset}
                  onChange={(e) => updateField("datePreset", e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-medium text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                >
                  <option value="all">كل الأوقات</option>
                  <option value="today">اليوم</option>
                  <option value="week">هذا الأسبوع</option>
                  <option value="month">هذا الشهر</option>
                  <option value="custom">فترة مخصصة...</option>
                </select>
              </div>
            )}
          </div>

          {/* Custom Date Range if selected */}
          {filters.datePreset === "custom" && (
            <div className="pt-2 flex items-center gap-2">
              <span className="text-xs text-[#A1A1AA]">من:</span>
              <input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => updateField("startDate", e.target.value)}
                className="p-1.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg text-xs font-mono"
              />
              <span className="text-xs text-[#A1A1AA]">إلى:</span>
              <input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => updateField("endDate", e.target.value)}
                className="p-1.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg text-xs font-mono"
              />
            </div>
          )}
        </div>
      )}

      {/* Active Filter Chips Bar */}
      {activeCount > 0 && (
        <div className="px-4 py-2 bg-[#1D1F21] border-t border-[#292B2E] flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[#A1A1AA] text-[11px] ml-1">الفلاتر المطبقة:</span>

          {filters.companyId && filters.companyId !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#202225] border border-[#292B2E] text-[#EDEDED] text-[11px]">
              <span>الشركة: {companies.find((c) => c.id === filters.companyId)?.name || filters.companyId}</span>
              <button onClick={() => updateField("companyId", "all")} className="hover:text-rose-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.stage && filters.stage !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#202225] border border-[#292B2E] text-[#EDEDED] text-[11px]">
              <span>المرحلة: {filters.stage}</span>
              <button onClick={() => updateField("stage", "all")} className="hover:text-rose-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.area && filters.area !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#202225] border border-[#292B2E] text-[#EDEDED] text-[11px]">
              <span>المنطقة: {filters.area}</span>
              <button onClick={() => updateField("area", "all")} className="hover:text-rose-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.interestLevel && filters.interestLevel !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#202225] border border-[#292B2E] text-[#EDEDED] text-[11px]">
              <span>الاهتمام: {filters.interestLevel}</span>
              <button onClick={() => updateField("interestLevel", "all")} className="hover:text-rose-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.followUpStatus && filters.followUpStatus !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#202225] border border-[#292B2E] text-[#EDEDED] text-[11px]">
              <span>المتابعة: {filters.followUpStatus}</span>
              <button onClick={() => updateField("followUpStatus", "all")} className="hover:text-rose-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.datePreset && filters.datePreset !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#202225] border border-[#292B2E] text-[#EDEDED] text-[11px]">
              <span>الفترة: {filters.datePreset}</span>
              <button onClick={() => updateField("datePreset", "all")} className="hover:text-rose-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {totalResultsCount !== undefined && (
            <span className="mr-auto font-mono text-[#C8A75A] font-bold text-[11px]">
              النتائج: {totalResultsCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
