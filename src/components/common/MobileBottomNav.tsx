import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { NavigationTab } from "../../types";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Plus,
  Menu,
  Sparkles,
  PhoneCall,
  FileSpreadsheet,
  UserPlus,
  X,
  FileCheck2,
  DollarSign,
  Receipt,
  TrendingUp,
  BarChart3,
  Building2,
  Settings,
} from "lucide-react";

export const MobileBottomNav: React.FC<{
  onOpenCustomerModal?: () => void;
  onOpenFollowUpModal?: () => void;
  onOpenQuoteModal?: () => void;
}> = ({ onOpenCustomerModal, onOpenFollowUpModal, onOpenQuoteModal }) => {
  const {
    currentTab,
    setCurrentTab,
    todayFollowUps,
    overdueFollowUps,
    setIsIntakeModalOpen,
  } = useApp();

  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);

  const totalAlerts = overdueFollowUps.length + todayFollowUps.length;

  const moreTabs: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "inquiries", label: "الاستفسارات", icon: Sparkles },
    { id: "followups", label: "المتابعات", icon: CalendarDays },
    { id: "tasks", label: "المهام والعمليات", icon: FileCheck2 },
    { id: "opportunities", label: "مركز الفرص", icon: TrendingUp },
    { id: "quotations", label: "عروض الأسعار", icon: FileSpreadsheet },
    { id: "contracts", label: "التعاقدات", icon: FileCheck2 },
    { id: "collections", label: "التنفيذ والتحصيل", icon: Receipt },
    { id: "products", label: "المنتجات والقطاعات", icon: Building2 },
    { id: "performance", label: "الأداء الشهري", icon: TrendingUp },
    { id: "analytics", label: "التحليلات", icon: BarChart3 },
    { id: "companies", label: "إدارة الشركات", icon: Building2 },
    { id: "settings", label: "الإعدادات والمزامنة", icon: Settings },
  ];

  return (
    <>
      {/* Action Sheet Modal */}
      {isActionSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setIsActionSheetOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#18191B] text-[#EDEDED] rounded-t-3xl sm:rounded-2xl p-5 space-y-4 border-t sm:border border-[#292B2E] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#292B2E]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C8A75A]" />
                <h3 className="font-bold text-sm text-[#EDEDED]">إجراء جديد سريع</h3>
              </div>
              <button
                onClick={() => setIsActionSheetOpen(false)}
                className="p-1 text-[#A1A1AA] hover:text-[#EDEDED] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* AI Intake */}
              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  setCurrentTab("intake");
                }}
                className="col-span-2 flex items-center justify-between p-3.5 bg-[#202225] border border-[#C8A75A]/40 rounded-xl hover:border-[#C8A75A] transition-all cursor-pointer text-right group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#C8A75A] text-black flex items-center justify-center font-bold shadow-xs">
                    <Sparkles className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#EDEDED] group-hover:text-[#C8A75A] transition-colors">
                      تسجيل بواسطة AI
                    </div>
                    <div className="text-[10px] text-[#A1A1AA]">
                      الصق محادثة واتساب أو رسالة ليحللها النظام تلقائياً
                    </div>
                  </div>
                </div>
              </button>

              {/* New Customer */}
              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  if (onOpenCustomerModal) onOpenCustomerModal();
                  else setCurrentTab("customers");
                }}
                className="flex flex-col items-start p-3 bg-[#202225] hover:bg-[#25282C] border border-[#292B2E] rounded-xl text-right transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mb-2">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-[#EDEDED]">عميل جديد</div>
                <div className="text-[10px] text-[#A1A1AA]">تسجيل بيانات عميل</div>
              </button>

              {/* New Follow Up */}
              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  if (onOpenFollowUpModal) onOpenFollowUpModal();
                  else setCurrentTab("followups");
                }}
                className="flex flex-col items-start p-3 bg-[#202225] hover:bg-[#25282C] border border-[#292B2E] rounded-xl text-right transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-400 flex items-center justify-center mb-2">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-[#EDEDED]">متابعة جديدة</div>
                <div className="text-[10px] text-[#A1A1AA]">تحديد موعد اتصال</div>
              </button>

              {/* New Quotation */}
              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  if (onOpenQuoteModal) onOpenQuoteModal();
                  else setCurrentTab("quotations");
                }}
                className="col-span-2 flex items-center gap-3 p-3 bg-[#202225] hover:bg-[#25282C] border border-[#292B2E] rounded-xl text-right transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#EDEDED]">إنشاء عرض سعر</div>
                  <div className="text-[10px] text-[#A1A1AA]">حساب مساحات PVC والأسعار</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* More Drawer */}
      {isMoreDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end justify-center p-0 animate-in fade-in"
          onClick={() => setIsMoreDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#18191B] text-[#EDEDED] rounded-t-3xl p-5 space-y-4 border-t border-[#292B2E] shadow-2xl max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#292B2E]">
              <h3 className="font-bold text-sm text-[#EDEDED]">جميع الأقسام والصفحات</h3>
              <button
                onClick={() => setIsMoreDrawerOpen(false)}
                className="p-1 text-[#A1A1AA] hover:text-[#EDEDED] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {moreTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setCurrentTab(tab.id);
                      setIsMoreDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold text-right transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#1D1F21] text-[#EDEDED] border-r-3 border-[#C8A75A] shadow-xs"
                        : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#25282C]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#C8A75A]" : "text-[#6B7280]"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111111]/98 backdrop-blur-md border-t border-[#292B2E] px-3 pt-1.5 flex items-center justify-between shadow-2xl text-[#EDEDED]"
        dir="rtl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0.375rem)" }}
      >
        {/* 1. Dashboard */}
        <button
          id="mobile-nav-dashboard"
          onClick={() => setCurrentTab("dashboard")}
          className={`flex-1 flex flex-col items-center py-1 text-[10px] font-medium transition-colors ${
            currentTab === "dashboard" ? "text-[#C8A75A] font-bold" : "text-[#A1A1AA] hover:text-[#EDEDED]"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>الرئيسية</span>
        </button>

        {/* 2. Today */}
        <button
          id="mobile-nav-today"
          onClick={() => setCurrentTab("today")}
          className={`flex-1 flex flex-col items-center py-1 text-[10px] font-medium relative transition-colors ${
            currentTab === "today" ? "text-[#C8A75A] font-bold" : "text-[#A1A1AA] hover:text-[#EDEDED]"
          }`}
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span>اليوم</span>
          {totalAlerts > 0 && (
            <span className="absolute -top-1 right-3 w-4 h-4 bg-[#EF4444] text-white rounded-full text-[9px] flex items-center justify-center font-bold">
              {totalAlerts}
            </span>
          )}
        </button>

        {/* 3. Central Plus Action Button */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            id="mobile-nav-quick-add"
            onClick={() => setIsActionSheetOpen(true)}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#18191B] to-[#202225] border-2 border-[#C8A75A] text-[#C8A75A] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="إجراء جديد"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. Customers */}
        <button
          id="mobile-nav-customers"
          onClick={() => setCurrentTab("customers")}
          className={`flex-1 flex flex-col items-center py-1 text-[10px] font-medium transition-colors ${
            currentTab === "customers" ? "text-[#C8A75A] font-bold" : "text-[#A1A1AA] hover:text-[#EDEDED]"
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>العملاء</span>
        </button>

        {/* 5. More */}
        <button
          id="mobile-nav-more"
          onClick={() => setIsMoreDrawerOpen(true)}
          className="flex-1 flex flex-col items-center py-1 text-[10px] font-medium text-[#A1A1AA] hover:text-[#EDEDED] transition-colors"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>المزيد</span>
        </button>
      </nav>
    </>
  );
};
