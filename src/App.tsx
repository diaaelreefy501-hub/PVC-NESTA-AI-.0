import React, { useEffect, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Header } from "./components/common/Header";
import { Sidebar } from "./components/common/Sidebar";
import { MobileBottomNav } from "./components/common/MobileBottomNav";
import { DuplicateCustomerModal } from "./components/common/DuplicateCustomerModal";
import { Customer360Modal } from "./components/customers/Customer360Modal";
import { QuotationPrintModal } from "./components/quotations/QuotationPrintModal";
import { NestaAssistantDrawer } from "./components/ai/NestaAssistantDrawer";
import { HealthCenterModal } from "./components/ai/HealthCenterModal";
import { DataLineageModal } from "./components/ai/DataLineageModal";
import { SmartAiIntake } from "./components/ai/SmartAiIntake";
import { CheckCircle2, AlertCircle, Info, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "./integrations/supabase/client";
import { canAccessTab } from "./utils/rbac";

// Views
import { LoginView } from "./components/auth/LoginView";
import { MyDayView } from "./components/today/MyDayView";
import { DashboardView } from "./components/dashboard/DashboardView";
import { CustomersView } from "./components/customers/CustomersView";
import { QuotationsView } from "./components/quotations/QuotationsView";
import { FollowupsView } from "./components/followups/FollowupsView";
import { InquiriesView } from "./components/inquiries/InquiriesView";
import { InspectionsView } from "./components/inspections/InspectionsView";
import { ContractsView } from "./components/contracts/ContractsView";
import { SalesView } from "./components/sales/SalesView";
import { CollectionsView } from "./components/collections/CollectionsView";
import { MonthlyPerformanceView } from "./components/performance/MonthlyPerformanceView";
import { AnalyticsView } from "./components/analytics/AnalyticsView";
import { CompanyPerformanceView } from "./components/companies/CompanyPerformanceView";
import { OpportunitiesView } from "./components/opportunities/OpportunitiesView";
import { SettingsView } from "./components/settings/SettingsView";
import { ExcelImportView } from "./components/import/ExcelImportView";
import { ProductsView } from "./components/products/ProductsView";
import { TasksView } from "./components/tasks/TasksView";
import { DataReviewCenter } from "./components/DataReviewCenter";
import { FinanceView } from "./components/finance/FinanceView";
import { ReportsView } from "./components/reports/ReportsView";

const MainContent: React.FC = () => {
  const { currentTab, setCurrentTab, isIntakeModalOpen, setIsIntakeModalOpen, toast, currentUser, currentCompanyRole, isInitialLoading } = useApp();

  // Redirect if unauthorized tab is opened (Always declare hooks unconditionally before any early return)
  useEffect(() => {
    if (currentUser && !canAccessTab(currentTab, currentUser, currentCompanyRole)) {
      setCurrentTab("dashboard");
    }
  }, [currentTab, currentUser, currentCompanyRole, setCurrentTab]);

  // Smooth loading screen while profile & permissions initialize, preventing layout flashes or premature unauthorized redirects
  if (isInitialLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#0C0D0E] flex flex-col items-center justify-center space-y-4" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-[#C8A75A]/10 border border-[#C8A75A]/30 flex items-center justify-center text-[#C8A75A] shadow-lg">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <p className="text-[#A1A1AA] text-sm font-medium">جاري إعداد مساحة العمل والبيانات التشغيلية...</p>
      </div>
    );
  }

  const renderActiveView = () => {
    if (currentUser && !canAccessTab(currentTab, currentUser, currentCompanyRole)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/50 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#EDEDED]">غير مصرح بالوصول</h2>
          <p className="text-sm text-[#A1A1AA] max-w-md">
            عذراً، هذه الصفحة مخصصة لمديري الشركات ومالك النظام فقط ولا تملك الصلاحية الكافية لفتحها.
          </p>
          <button
            onClick={() => setCurrentTab("dashboard")}
            className="px-5 py-2.5 bg-[#C8A75A] text-black font-bold rounded-xl hover:bg-[#D4AF37] transition-all cursor-pointer shadow-lg"
          >
            العودة للرئيسية
          </button>
        </div>
      );
    }

    switch (currentTab) {
      case "today":
        return <MyDayView />;
      case "dashboard":
        return <DashboardView />;
      case "customers":
        return <CustomersView />;
      case "quotations":
        return <QuotationsView />;
      case "inquiries":
        return <InquiriesView />;
      case "followups":
        return <FollowupsView />;
      case "tasks":
        return <TasksView />;
      case "products":
        return <ProductsView />;
      case "inspections":
        return <InspectionsView />;
      case "contracts":
        return <ContractsView />;
      case "sales":
        return <SalesView />;
      case "collections":
        return <CollectionsView />;
      case "finance":
        return <FinanceView />;
      case "reports":
        return <ReportsView />;
      case "performance":
        return <MonthlyPerformanceView />;
      case "opportunities":
        return <OpportunitiesView />;
      case "analytics":
        return <AnalyticsView />;
      case "companies":
        return <CompanyPerformanceView />;
      case "settings":
        return <SettingsView />;
      case "import":
        return <ExcelImportView />;
      case "review":
        return <DataReviewCenter />;
      case "intake":
        return (
          <div className="max-w-2xl mx-auto py-2 sm:py-4">
            <SmartAiIntake onClose={() => {}} isEmbedded />
          </div>
        );
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0D0E] flex flex-col antialiased text-[#EDEDED]" dir="rtl">
      {/* Top Universal Header */}
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Right Sidebar (Desktop) */}
        <Sidebar />

        {/* Main Content Stage */}
        <main 
          className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 md:pb-6"
          style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar */}
      <MobileBottomNav />

      {/* Global Toast Alert */}
      {toast && (
        <div className="fixed bottom-16 md:bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-[#111111] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#C8A75A]/40 flex items-center gap-2.5 text-xs font-semibold">
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-[#C8A75A]" />}
            {toast.type === "warning" && <AlertCircle className="w-4 h-4 text-amber-400" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-500" />}
            {toast.type === "info" && <Info className="w-4 h-4 text-blue-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Global Modals & Drawers */}
      <Customer360Modal />
      <QuotationPrintModal />
      <DuplicateCustomerModal />
      <NestaAssistantDrawer />
      <HealthCenterModal />
      <DataLineageModal />

      {/* Smart Intake Modal (when opened from Quick Action Button) */}
      {isIntakeModalOpen && (
        <SmartAiIntake onClose={() => setIsIntakeModalOpen(false)} />
      )}
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session on initial load/refresh
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if ((import.meta as any).env?.DEV) {
        console.log("[Auth Initial getSession]:", {
          hasSession: !!initialSession,
          authUserId: initialSession?.user?.id,
          email: initialSession?.user?.email,
          hasAccessToken: !!initialSession?.access_token,
        });
      }
      setSession(initialSession);
      setLoading(false);
    });

    // 2. Listen for auth changes (SIGNED_IN, SIGNED_OUT, INITIAL_SESSION, TOKEN_REFRESHED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if ((import.meta as any).env?.DEV) {
        console.log("[Auth onAuthStateChange]:", event, {
          hasSession: !!currentSession,
          authUserId: currentSession?.user?.id,
          email: currentSession?.user?.email,
        });
      }

      setSession(currentSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C8A75A] animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <AppProvider session={session}>
      <MainContent />
    </AppProvider>
  );
}
