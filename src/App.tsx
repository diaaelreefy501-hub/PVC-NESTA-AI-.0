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
import { CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";
import { supabase } from "./integrations/supabase/client";

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

const MainContent: React.FC = () => {
  const { currentTab, isIntakeModalOpen, setIsIntakeModalOpen, toast } = useApp();

  const renderActiveView = () => {
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
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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
