import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  Building2,
  Sparkles,
  Bell,
  Search,
  ChevronDown,
  X,
  Phone,
  User,
  ArrowUpRight,
  RefreshCw,
  LogOut,
  Eye,
  Shield,
  Moon,
  Sun,
} from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { globalPersistenceEngine } from "../../dataLayer/persistenceEngine";

export const Header: React.FC = () => {
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const updateStats = () => {
      const stats = globalPersistenceEngine.getStats();
      setPendingCount(stats.pending);
    };
    updateStats();
    const unsub = globalPersistenceEngine.subscribe(updateStats);
    return () => unsub();
  }, []);
  const {
    companies,
    activeCompanyId,
    setActiveCompanyId,
    activeCompany,
    currentTab,
    setCurrentTab,
    todayFollowUps,
    overdueFollowUps,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setIsAiAssistantOpen,
    searchQuery,
    setSearchQuery,
    customers,
    setSelectedCustomerIdFor360,
    isCloudConnected,
    currentUser,
    syncData,
    setIsHealthCenterOpen,
    selectedCompanyIds,
    toggleCompanySelection,
    selectAllCompanies,
    clearAllCompanySelection,
    guardianHealthReport,
    theme,
    setTheme,
  } = useApp();

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncData();
    setIsSyncing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const totalAlerts = unreadNotificationsCount > 0 ? unreadNotificationsCount : overdueFollowUps.length + todayFollowUps.length;

  const tabTitles: Record<string, string> = {
    dashboard: "الرئيسية",
    today: "اليوم (My Day)",
    intake: "الإدخال الذكي (AI)",
    inquiries: "الاستفسارات",
    customers: "إدارة العملاء",
    followups: "المتابعات",
    quotations: "عروض الأسعار",
    inspections: "المعاينات والقياسات",
    contracts: "العقود والاتفاقيات",
    sales: "المبيعات",
    collections: "التحصيلات المالية",
    performance: "الأداء الشهري",
    analytics: "التحليلات المتقدمة",
    companies: "إدارة الشركات",
    settings: "الإعدادات العامة",
  };

  // Filtered search results preview
  const searchResults = searchQuery.trim()
    ? customers.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.area.toLowerCase().includes(q)
        );
      }).slice(0, 5)
    : [];

  return (
    <header 
      className="sticky top-0 z-30 bg-[#111111]/95 backdrop-blur-md border-b border-[#292B2E] px-2.5 sm:px-6 py-2 sm:py-2.5 shadow-md select-none text-[#EDEDED]"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0.5rem))" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Right side (in RTL): Brand & Current Page Title */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          <div
            onClick={() => setCurrentTab("dashboard")}
            className="cursor-pointer flex items-center gap-1.5 sm:gap-2 group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#18191B] text-white flex items-center justify-center font-black text-sm tracking-tighter border border-[#292B2E] shadow-xs group-hover:scale-105 transition-transform">
              <span className="text-[#C8A75A]">P</span>N
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-sm text-[#EDEDED] tracking-tight">
                  PVC NESTA
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#1D1F21] text-[#C8A75A] border border-[#292B2E]">
                  AI
                </span>
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-[#292B2E] hidden md:block" />

          {/* Current Page Title Badge */}
          <div className="hidden xs:flex items-center gap-1.5">
            <h1 className="text-xs sm:text-sm font-bold text-[#EDEDED] truncate max-w-[90px] sm:max-w-none">
              {tabTitles[currentTab] || "الرئيسية"}
            </h1>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 min-w-0 max-w-md mx-1 sm:mx-4 relative">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => setIsSearchDropdownOpen(true)}
              placeholder="ابحث..."
              className="w-full pl-7 sm:pl-8 pr-8 sm:pr-9 py-1 sm:py-1.5 bg-[#202225] hover:bg-[#25282C] focus:bg-[#202225] text-xs text-[#EDEDED] rounded-xl border border-[#292B2E] focus:border-[#C8A75A] focus:ring-1 focus:ring-[#C8A75A] outline-hidden transition-all placeholder:text-[#6B7280]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#EDEDED] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results Preview */}
          {isSearchDropdownOpen && searchQuery.trim() && (
            <div
              className="absolute top-full mt-1.5 right-0 left-0 bg-[#18191B] border border-[#292B2E] rounded-xl shadow-2xl overflow-hidden z-50 p-1.5"
              onMouseLeave={() => setIsSearchDropdownOpen(false)}
            >
              <div className="px-2.5 py-1 text-[11px] font-bold text-[#A1A1AA] border-b border-[#292B2E] flex items-center justify-between">
                <span>نتائج العملاء ({searchResults.length})</span>
                <span className="text-[10px] text-[#6B7280]">اضغط للملف</span>
              </div>
              {searchResults.length === 0 ? (
                <div className="px-3 py-3 text-xs text-center text-[#6B7280]">
                  لا توجد نتائج مطابقة لـ "{searchQuery}"
                </div>
              ) : (
                searchResults.map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomerIdFor360(cust.id);
                      setIsSearchDropdownOpen(false);
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[#202225] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#111111] text-[#C8A75A] border border-[#292B2E] flex items-center justify-center font-bold text-xs">
                        {cust.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#EDEDED]">{cust.name}</div>
                        <div className="text-[11px] text-[#A1A1AA] flex items-center gap-1.5">
                          <span>{cust.phone}</span>
                          <span>•</span>
                          <span>{cust.area}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#6B7280]" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Left side (in RTL): Connection Status, Company Switcher, Notifications, User */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Real Cloud Connection Status Badge */}
          <div className="hidden sm:flex items-center gap-1">
            {isCloudConnected !== null && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                  isCloudConnected
                    ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                    : "bg-rose-950/40 text-rose-400 border-rose-800/40"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isCloudConnected ? "bg-emerald-400" : "bg-rose-500"
                  }`}
                />
                <span>{isCloudConnected ? "🟢 متصل" : "🔴 غير متصل"}</span>
              </div>
            )}
          </div>

          {/* Multi-Company Switcher */}
          <div className="relative">
            <button
              id="header-company-switcher-btn"
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              className="flex items-center gap-1.5 bg-[#202225] hover:bg-[#272A2D] text-[#EDEDED] font-bold text-[10px] sm:text-xs px-2.5 py-1.5 rounded-xl border border-[#292B2E] transition-colors cursor-pointer"
              title="تحديد الشركات للعمل الموحد"
            >
              {activeCompany && activeCompany.logoUrl ? (
                <img src={activeCompany.logoUrl} alt="Logo" className="w-4 h-4 rounded-md object-contain shrink-0 hidden sm:block" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0 hidden sm:block" />
              )}
              <span className="max-w-[85px] sm:max-w-[130px] truncate">
                {selectedCompanyIds.length === 0 || selectedCompanyIds.includes("all")
                  ? `🌐 كافة الشركات (${companies.length})`
                  : selectedCompanyIds.length === 1
                  ? `🏢 ${companies.find(c => c.id === selectedCompanyIds[0])?.name || "شركة"}`
                  : `🏢 ${selectedCompanyIds.length} شركات`}
              </span>
              <ChevronDown className={`w-3 h-3 text-[#A1A1AA] transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCompanyDropdownOpen && (
              <div 
                className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 bg-[#18191B] rounded-2xl shadow-2xl border border-[#292B2E] p-3 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-2.5"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#292B2E]">
                  <span className="text-xs font-bold text-[#EDEDED] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-400" />
                    تحديد الشركات المعروضة
                  </span>
                  <button 
                    onClick={() => setIsCompanyDropdownOpen(false)}
                    className="text-[#71717A] hover:text-[#EDEDED] p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 px-1">
                  <button
                    onClick={() => {
                      selectAllCompanies();
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <button
                    onClick={() => {
                      clearAllCompanySelection();
                    }}
                    className="text-[11px] text-[#A1A1AA] hover:text-white font-medium cursor-pointer"
                  >
                    عرض الكل (عام)
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5">
                  {companies.map((c) => {
                    const isExplicitlySelected = selectedCompanyIds.includes(c.id);
                    const isAll = selectedCompanyIds.length === 0 || selectedCompanyIds.includes("all");
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCompanySelection(c.id)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                          isExplicitlySelected
                            ? "bg-sky-500/15 text-sky-200 border-sky-500/30"
                            : isAll
                            ? "bg-[#202225] text-[#EDEDED] border-[#292B2E] hover:border-[#383B40]"
                            : "bg-[#1D1F21] text-[#A1A1AA] border-transparent hover:bg-[#202225]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.color || "#38bdf8" }}
                          />
                          <span className="truncate">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isExplicitlySelected ? (
                            <span className="w-4 h-4 rounded bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          ) : isAll ? (
                            <span className="w-4 h-4 rounded border border-sky-400/40 text-sky-400 flex items-center justify-center text-[9px] font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded border border-[#3E4247]" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Today Tasks / Notifications Bell with Dropdown */}
          <div className="relative">
            <button
              id="header-notifications-btn"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              title="مركز التنبيهات التشغيلية الذكية"
              className="relative p-1.5 sm:p-2 text-[#EDEDED] hover:bg-[#202225] rounded-xl border border-[#292B2E] bg-[#1D1F21] transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A1A1AA]" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 bg-[#EF4444] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {totalAlerts}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 bg-[#18191B] rounded-2xl shadow-2xl border border-[#292B2E] p-3 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#292B2E]">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-purple-400" />
                    <span className="font-extrabold text-xs text-[#EDEDED]">
                      تنبيهات العمليات المباشرة ({notifications.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] font-bold text-purple-400 hover:text-purple-300"
                      >
                        قراءة الكل
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsNotificationOpen(false);
                        setCurrentTab("today");
                      }}
                      className="text-[10px] font-bold text-[#C8A75A] hover:underline"
                    >
                      فتح اليوم
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 divide-y divide-[#292B2E]">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#6B7280]">
                      لا توجد تنبيهات عاجلة حالياً ✨
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <div
                        key={n.id}
                        className={`pt-2 first:pt-0 p-2 rounded-xl transition-all ${
                          !n.readAt ? "bg-purple-950/30 border border-purple-900/30" : "hover:bg-[#202225]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                n.severity === "high"
                                  ? "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                                  : "bg-purple-950/60 text-purple-300 border border-purple-800/40"
                              }`}
                            >
                              {n.title}
                            </span>
                            <p className="text-xs font-semibold text-[#EDEDED] mt-1">
                              {n.message}
                            </p>
                          </div>
                          {n.customerId && (
                            <button
                              onClick={() => {
                                setIsNotificationOpen(false);
                                setSelectedCustomerIdFor360(n.customerId!);
                              }}
                              className="p-1 bg-[#202225] text-white rounded-lg hover:bg-[#292B2E] shrink-0 border border-[#292B2E]"
                              title="فتح العميل 360"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#C8A75A]" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-[#292B2E] text-center">
                  <button
                    onClick={() => {
                      setIsNotificationOpen(false);
                      setCurrentTab("today");
                    }}
                    className="w-full py-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] rounded-xl text-xs font-bold transition-all border border-[#292B2E]"
                  >
                    عرض كافة المهام والتنبيهات في My Day
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Theme Selector (Light / Dark) */}
          <div className="flex items-center bg-[#18191B] p-0.5 rounded-xl border border-[#292B2E]">
            <button
              onClick={() => setTheme("dark")}
              title="الوضع الليلي"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                theme === "dark"
                  ? "bg-[#C8A75A] text-black shadow-xs"
                  : "text-[#A1A1AA] hover:text-[#EDEDED]"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline text-[10px]">داكن</span>
            </button>
            <button
              onClick={() => setTheme("light")}
              title="الوضع الفاتح"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                theme === "light"
                  ? "bg-[#C8A75A] text-black shadow-xs"
                  : "text-[#A1A1AA] hover:text-[#EDEDED]"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden xl:inline text-[10px]">فاتح</span>
            </button>
          </div>

          {/* Guardian Health Center Trigger */}
          <button
            id="header-guardian-health-btn"
            onClick={() => setIsHealthCenterOpen(true)}
            title="مركز صحة النظام وحارس NESTA (Guardian)"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-[#18191B] hover:bg-[#202225] text-white rounded-xl text-xs font-bold border border-[#292B2E] hover:border-[#C8A75A]/40 shadow-xs transition-all cursor-pointer"
          >
            <Shield className={`w-3.5 h-3.5 ${guardianHealthReport?.overallStatus?.toLowerCase() === "critical" ? "text-rose-400 animate-pulse" : guardianHealthReport?.overallStatus?.toLowerCase() === "attention" ? "text-amber-400" : "text-[#C8A75A]"}`} />
            <span className="hidden lg:inline text-[11px] text-[#A1A1AA]">الحارس</span>
          </button>

          {/* AI Assistant Trigger Button */}
          <button
            id="header-ai-assistant-btn"
            onClick={() => setIsAiAssistantOpen(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-[#18191B] hover:bg-[#202225] text-white rounded-xl text-xs font-bold border border-[#C8A75A]/50 shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C8A75A]" />
            <span className="hidden md:inline text-[11px] text-[#EDEDED]">NESTA AI</span>
          </button>

          {/* User Profile Pill */}
          {currentUser && (
            <div className="hidden lg:flex items-center gap-2 pr-1 border-r border-[#292B2E]">
              <div className="w-7 h-7 rounded-full bg-[#C8A75A]/15 text-[#C8A75A] font-bold text-xs flex items-center justify-center border border-[#C8A75A]/30 uppercase">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-right leading-none">
                <div className="text-xs font-bold text-[#EDEDED]">{currentUser.name}</div>
                <div className="text-[10px] text-[#A1A1AA]">
                  {currentUser.role === 'owner' ? 'المدير العام' : currentUser.role === 'admin' ? 'مدير النظام' : 'المبيعات'}
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-1.5 sm:p-2 text-red-400 hover:bg-red-950/40 rounded-xl border border-transparent hover:border-red-900/40 transition-colors cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
