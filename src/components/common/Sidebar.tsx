import React from "react";
import { useApp } from "../../context/AppContext";
import { NavigationTab } from "../../types";
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Inbox,
  Users,
  Clock,
  CheckSquare,
  FileSpreadsheet,
  FileCheck2,
  DollarSign,
  Receipt,
  TrendingUp,
  BarChart3,
  Building2,
  Settings,
  ChevronRight,
  ChevronLeft,
  Flame,
  UploadCloud,
  Camera,
  Target,
  Package,
  ShieldAlert,
} from "lucide-react";

interface NavGroup {
  title: string;
  items: {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
    isAi?: boolean;
    adminOnly?: boolean;
  }[];
}

export const Sidebar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    todayFollowUps,
    overdueFollowUps,
    hotCustomers,
    quotesNeedingFollowUp,
    filteredOpportunities,
    filteredTasks,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    currentUser,
  } = useApp();

  const totalOverdue = overdueFollowUps.length;
  const totalToday = todayFollowUps.length + overdueFollowUps.length;
  const pendingTasksCount = filteredTasks.filter((t) => t.status === "pending").length;

  const allNavGroups: NavGroup[] = [
    {
      title: "الرئيسية",
      items: [
        {
          id: "dashboard",
          label: "الرئيسية",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "اليوم",
      items: [
        {
          id: "today",
          label: "اليوم",
          icon: CalendarDays,
          badge: totalToday > 0 ? totalToday : undefined,
          badgeColor: totalOverdue > 0 ? "bg-[#EF4444] text-white" : "bg-[#F59E0B] text-slate-950 font-bold",
        },
      ],
    },
    {
      title: "المبيعات",
      items: [
        {
          id: "inquiries",
          label: "الاستفسارات",
          icon: Inbox,
        },
        {
          id: "followups",
          label: "المتابعات",
          icon: Clock,
          badge: totalOverdue > 0 ? totalOverdue : undefined,
          badgeColor: "bg-[#EF4444] text-white",
        },
        {
          id: "tasks",
          label: "المهام",
          icon: CheckSquare,
          badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
          badgeColor: "bg-blue-900/70 text-blue-300 border border-blue-700/40",
        },
        {
          id: "customers",
          label: "العملاء",
          icon: Users,
          badge: hotCustomers.length > 0 ? `${hotCustomers.length} 🔥` : undefined,
          badgeColor: "bg-orange-950 text-orange-400 border border-orange-800/40",
        },
        {
          id: "opportunities",
          label: "مركز الفرص",
          icon: Target,
          badge:
            filteredOpportunities.filter((o) => o.status === "open").length > 0
              ? filteredOpportunities.filter((o) => o.status === "open").length
              : undefined,
          badgeColor: "bg-amber-950 text-amber-300 border border-amber-800/40",
        },
        {
          id: "quotations",
          label: "عروض الأسعار",
          icon: FileSpreadsheet,
          badge: quotesNeedingFollowUp.length > 0 ? quotesNeedingFollowUp.length : undefined,
          badgeColor: "bg-blue-950 text-blue-300 border border-blue-800/40",
        },
        {
          id: "contracts",
          label: "التعاقدات",
          icon: FileCheck2,
        },
      ],
    },
    {
      title: "التشغيل والمال",
      items: [
        {
          id: "collections",
          label: "التنفيذ والتحصيل",
          icon: Receipt,
        },
        {
          id: "review",
          label: "مراجعة واعتماد البيانات",
          icon: ShieldAlert,
        },
      ],
    },
    {
      title: "المنتجات",
      items: [
        {
          id: "products",
          label: "المنتجات",
          icon: Package,
        },
      ],
    },
    {
      title: "التحليلات والأداء",
      items: [
        {
          id: "analytics",
          label: "مركز التحليلات",
          icon: BarChart3,
        },
        {
          id: "performance",
          label: "أداء الشهر",
          icon: TrendingUp,
        },
        {
          id: "companies",
          label: "أداء الشركات",
          icon: Building2,
        },
      ],
    },
    {
      title: "الأدوات",
      items: [
        {
          id: "import",
          label: "الاستيراد الذكي",
          icon: UploadCloud,
          badge: "AI",
          badgeColor: "bg-[#C8A75A] text-[#111111] font-black",
        },
      ],
    },
    {
      title: "الإدارة",
      items: [
        {
          id: "settings",
          label: "الإعدادات",
          icon: Settings,
        },
      ],
    },
  ];

  const navGroups = allNavGroups;


  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-[#111111] text-[#EDEDED] border-l border-[#292B2E] transition-all duration-300 select-none ${
        isSidebarCollapsed ? "w-18" : "w-64"
      } min-h-[calc(100vh-61px)]`}
      dir="rtl"
    >
      {/* Navigation Scrollable Body */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isSidebarCollapsed && (
              <div className="px-3 py-1 text-[10px] font-bold text-[#6B7280] tracking-wider uppercase">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between rounded-xl py-2 px-2.5 text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-[#18191B] text-[#EDEDED] font-bold border-r-3 border-[#C8A75A] shadow-xs"
                      : "text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#18191B]/60"
                  } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? "text-[#C8A75A]"
                          : item.isAi
                          ? "text-[#C8A75A]/80"
                          : "text-[#6B7280]"
                      }`}
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>

                  {!isSidebarCollapsed && item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                        item.badgeColor || "bg-[#202225] text-[#A1A1AA] border border-[#292B2E]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {isSidebarCollapsed && item.badge !== undefined && (
                    <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-[#EF4444]" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sidebar Footer & Collapse Toggle */}
      <div className="p-2 border-t border-[#292B2E] flex items-center justify-between text-xs text-[#6B7280]">
        {!isSidebarCollapsed && (
          <div className="px-2 py-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span className="text-[11px] font-medium text-[#A1A1AA]">NESTA OS v1.2</span>
          </div>
        )}
        <button
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          className={`p-2 rounded-xl text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#18191B] transition-colors cursor-pointer ${
            isSidebarCollapsed ? "mx-auto" : ""
          }`}
          title={isSidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {isSidebarCollapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
};
