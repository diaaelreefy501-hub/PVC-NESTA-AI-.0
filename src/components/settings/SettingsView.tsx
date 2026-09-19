import React, { useState, useMemo, useRef } from "react";
import { useApp } from "../../context/AppContext";
import {
  Settings,
  RotateCcw,
  Download,
  ShieldCheck,
  Database,
  Target,
  Building2,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  ArrowUpRight,
  Save,
  ArrowRight,
  X,
  Users,
  MapPin,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Layers,
  Palette,
  Eye,
  Shield,
  Clock,
  Filter,
  Search,
  Check,
  Package,
  Sliders,
  Sparkles,
  Phone,
  Activity,
  UserPlus,
  RefreshCw,
  Moon,
  Sun,
} from "lucide-react";

import { supabase } from "../../integrations/supabase/client";
import { AppUser, Company, CompanyId, CompanyRole, Product } from "../../types";
import { CompanyLogo } from "../common/CompanyLogo";
import { PersistenceSyncCenter } from "./PersistenceSyncCenter";

export const SettingsView: React.FC = () => {
  const {
    companies,
    addCompany,
    updateCompany,
    deleteCompany,
    updateCompanyTarget,
    sales,
    resetDataToDefault,
    migrateLegacyData,
    customers,
    inquiries,
    quotations,
    contracts,
    payments,
    opportunities,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    auditLogs,
    setCurrentTab,
    users,
    setUsers,
    areas,
    addArea,
    deleteArea,
    lossReasons,
    addLossReason,
    deleteLossReason,
    showToast,
    currentUser,
    guardianAlerts,
    guardianIncidents,
    guardianHealthReport,
    theme,
    setTheme,
  } = useApp();

  // Internal Active Tab
  const [activeTab, setActiveTab] = useState<
    | "companies"
    | "users"
    | "products"
    | "sales_config"
    | "regions"
    | "health"
    | "appearance"
    | "persistence_sync"
    | "audit"
    | "backup"
  >("companies");

  /* =========================================================================
     1. COMPANIES MANAGEMENT STATE & HANDLERS
     ========================================================================= */
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    nameEn: "",
    phone: "",
    monthlyTarget: 300000,
    annualTarget: 3600000,
    color: "#C8A75A",
    secondaryColor: "#111111",
    logoUrl: "",
  });

  const [editingTargets, setEditingTargets] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    companies.forEach((c) => {
      initial[c.id] = c.monthlyTarget;
    });
    return initial;
  });
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});

  const handleTargetChange = (companyId: string, val: number) => {
    setEditingTargets((prev) => ({
      ...prev,
      [companyId]: Math.max(0, val),
    }));
  };

  const handleSaveTarget = (companyId: string) => {
    const targetVal = editingTargets[companyId] || 0;
    updateCompanyTarget(companyId as CompanyId, targetVal);
    setSavedStatus((prev) => ({ ...prev, [companyId]: true }));
    setTimeout(() => {
      setSavedStatus((prev) => ({ ...prev, [companyId]: false }));
    }, 2500);
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name.trim()) {
      showToast("اسم الشركة مطلوب", "warning");
      return;
    }

    addCompany({
      name: companyForm.name.trim(),
      nameEn: companyForm.nameEn.trim() || undefined,
      phone: companyForm.phone.trim(),
      monthlyTarget: companyForm.monthlyTarget || 300000,
      annualTarget: companyForm.annualTarget || 3600000,
      color: companyForm.color,
      secondaryColor: companyForm.secondaryColor,
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-900",
      active: true,
      logoText: companyForm.name.trim().substring(0, 2),
      logoUrl: companyForm.logoUrl || undefined,
      userRoles: currentUser ? { [currentUser.id]: "owner" } : {},
      userTargets: {},
    });

    setShowAddCompanyModal(false);
    setCompanyForm({
      name: "",
      nameEn: "",
      phone: "",
      monthlyTarget: 300000,
      annualTarget: 3600000,
      color: "#C8A75A",
      secondaryColor: "#111111",
      logoUrl: "",
    });
    showToast("تم إنشاء الشركة بنجاح", "success");
  };

  const handleUpdateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    if (!companyForm.name.trim()) return;

    updateCompany(editingCompany.id, {
      name: companyForm.name.trim(),
      nameEn: companyForm.nameEn.trim() || undefined,
      phone: companyForm.phone.trim(),
      monthlyTarget: companyForm.monthlyTarget,
      annualTarget: companyForm.annualTarget,
      color: companyForm.color,
      secondaryColor: companyForm.secondaryColor,
      logoUrl: companyForm.logoUrl || undefined,
    });

    setEditingCompany(null);
    showToast("تم تحديث بيانات الشركة بنجاح", "success");
  };

  const handleToggleCompanyStatus = (company: Company) => {
    const nextStatus = !company.active;
    updateCompany(company.id, { active: nextStatus });
    showToast(nextStatus ? `تم تفعيل شركة ${company.name}` : `تم أرشفة/تعطيل شركة ${company.name}`, "info");
  };

  /* =========================================================================
     2. USERS & ROLES STATE & HANDLERS
     ========================================================================= */
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "sales" as "owner" | "admin" | "sales",
    allowedCompanyIds: ["all"],
  });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: "", password: "" });
  const [isEditingUser, setIsEditingUser] = useState(false);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      showToast("يرجى تعبئة جميع الحقول المطلوبة", "warning");
      return;
    }

    setIsAddingUser(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("يجب تسجيل الدخول كمسؤول أولاً");

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل إنشاء المستخدم");
      }

      setUsers([...users, data.user]);
      setNewUser({ name: "", email: "", password: "", role: "sales", allowedCompanyIds: ["all"] });
      showToast("تم إنشاء وتفعيل حساب المستخدم إدارياً بنجاح", "success");
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء إضافة المستخدم", "warning");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً؟")) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("يجب تسجيل الدخول أولاً");

      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل الحذف");

      setUsers(users.filter((u) => u.id !== id));
      showToast("تم حذف المستخدم وحسابه نهائياً", "success");
    } catch (err: any) {
      showToast("فشل الحذف: " + err.message, "warning");
    }
  };

  const handleToggleUserActive = async (user: AppUser) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("يجب تسجيل الدخول أولاً");

      const nextActive = !user.active;
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل التحديث");

      setUsers(users.map((u) => (u.id === user.id ? { ...u, active: nextActive } : u)));
      showToast(nextActive ? "تم تفعيل المستخدم" : "تم إيقاف المستخدم وتعطيل دخوله", "success");
    } catch (err: any) {
      showToast("فشل التحديث: " + err.message, "warning");
    }
  };

  const handleUpdateUserRoleAndCompany = async (
    user: AppUser,
    newRole: "owner" | "admin" | "sales",
    newCompanyId: string
  ) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("يجب تسجيل الدخول أولاً");

      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole, allowedCompanyIds: [newCompanyId] }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل التحديث");

      setUsers(
        users.map((u) =>
          u.id === user.id ? { ...u, role: newRole, allowedCompanyIds: [newCompanyId] } : u
        )
      );
      showToast("تم تحديث صلاحيات المستخدم", "success");
    } catch (err: any) {
      showToast("فشل التحديث: " + err.message, "warning");
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    if (!editUserForm.name.trim()) return showToast("الاسم مطلوب", "warning");

    try {
      setIsEditingUser(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("يجب تسجيل الدخول أولاً");

      const bodyData: any = { name: editUserForm.name };
      if (editUserForm.password.trim()) {
        bodyData.password = editUserForm.password;
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل التحديث");

      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, name: editUserForm.name } : u)));
      setEditingUser(null);
      showToast("تم تحديث بيانات المستخدم وكلمة المرور بنجاح", "success");
    } catch (err: any) {
      showToast(err.message, "warning");
    } finally {
      setIsEditingUser(false);
    }
  };

  /* =========================================================================
     3. PRODUCT CATEGORIES & PRODUCTS STATE
     ========================================================================= */
  const [productCategories, setProductCategories] = useState<string[]>([
    "UPVC",
    "Aluminum",
    "Doors",
    "Windows",
    "Accessories",
    "Glass",
    "Hardware",
  ]);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (productCategories.includes(newCategoryName.trim())) {
      showToast("هذه الفئة موجودة بالفعل", "warning");
      return;
    }
    setProductCategories([...productCategories, newCategoryName.trim()]);
    setNewCategoryName("");
    showToast("تمت إضافة الفئة بنجاح", "success");
  };

  const handleDeleteCategory = (cat: string) => {
    setProductCategories(productCategories.filter((c) => c !== cat));
    showToast("تم حذف الفئة", "info");
  };

  /* =========================================================================
     4. SALES CONFIGURATION STATE
     ========================================================================= */
  const [newArea, setNewArea] = useState("");
  const [newLossReason, setNewLossReason] = useState("");

  const defaultSources = [
    "WhatsApp",
    "Facebook",
    "Instagram",
    "Website",
    "Direct",
    "Manual",
    "Excel Import",
    "Other",
  ];

  const opportunityStagesList = [
    { id: "new", name: "جديدة (New)", color: "text-blue-400" },
    { id: "qualified", name: "مؤهلة (Qualified)", color: "text-indigo-400" },
    { id: "inspection", name: "معاينة / قياس (Inspection)", color: "text-amber-400" },
    { id: "quotation", name: "عرض سعر (Quotation)", color: "text-purple-400" },
    { id: "negotiation", name: "تفاوض (Negotiation)", color: "text-orange-400" },
    { id: "followup", name: "متابعة مستمرة (Follow-up)", color: "text-sky-400" },
    { id: "won", name: "تم التعاقد / فوز (Won)", color: "text-emerald-400" },
    { id: "lost", name: "خسارة (Lost)", color: "text-rose-400" },
  ];

  const taskTypesList = [
    { id: "followup", name: "متابعة بيعية", icon: "📞" },
    { id: "inspection", name: "معاينة ورفع مقاسات", icon: "📐" },
    { id: "quote_review", name: "مراجعة عرض السعر", icon: "📄" },
    { id: "contract_delivery", name: "تسليم وتوقيع العقد", icon: "✍️" },
    { id: "payment_collection", name: "تحصيل دفعة مالية", icon: "💰" },
    { id: "general", name: "مهمة عامة", icon: "📌" },
  ];

  /* =========================================================================
     5. AUDIT LOG FILTERING
     ========================================================================= */
  const [auditSearch, setAuditSearch] = useState("");
  const [auditEntityFilter, setAuditEntityFilter] = useState("all");

  const filteredAuditLogs = useMemo(() => {
    return (auditLogs || []).filter((log) => {
      const matchSearch =
        !auditSearch ||
        log.description?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.userName?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.entityId?.toLowerCase().includes(auditSearch.toLowerCase());
      const matchEntity = auditEntityFilter === "all" || log.entityType === auditEntityFilter;
      return matchSearch && matchEntity;
    });
  }, [auditLogs, auditSearch, auditEntityFilter]);

  /* =========================================================================
     6. DATA HEALTH CHECK REAL-TIME STATS
     ========================================================================= */
  const dataHealthStats = useMemo(() => {
    // 1. Missing Company ID check
    const missingCustComp = customers.filter((c) => !c.companyId).length;
    const missingInqComp = inquiries.filter((i) => !i.companyId).length;
    const missingOppComp = opportunities.filter((o) => !o.companyId).length;
    const missingContractComp = contracts.filter((c) => !c.companyId).length;
    const totalMissingComp = missingCustComp + missingInqComp + missingOppComp + missingContractComp;

    // 2. Duplicate phone check in customers
    const phoneMap: Record<string, number> = {};
    customers.forEach((c) => {
      if (c.phone) phoneMap[c.phone] = (phoneMap[c.phone] || 0) + 1;
    });
    const dupPhoneCount = Object.values(phoneMap).filter((cnt) => cnt > 1).length;

    // 3. Broken relationships (Contract without Customer or Opportunity)
    const customerIdSet = new Set(customers.map((c) => c.id));
    const brokenContracts = contracts.filter((c) => !customerIdSet.has(c.customerId)).length;
    const brokenSales = sales.filter((s) => s.customerId && !customerIdSet.has(s.customerId)).length;

    return {
      totalMissingComp,
      dupPhoneCount,
      brokenContracts,
      brokenSales,
      totalCustomers: customers.length,
      totalInquiries: inquiries.length,
      totalContracts: contracts.length,
      totalSales: sales.length,
      totalProducts: products.length,
    };
  }, [customers, inquiries, opportunities, contracts, sales, products]);

  /* =========================================================================
     7. EXPORT / BACKUP HANDLER
     ========================================================================= */
  const handleExportData = () => {
    const data = {
      exportDate: new Date().toISOString(),
      systemVersion: "PVC NESTA AI v1.2",
      companies,
      customers,
      inquiries,
      quotations,
      contracts,
      payments,
      sales,
      products,
      users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pvc_nesta_owner_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    showToast("تم تنزيل النسخة الاحتياطية بنجاح", "success");
  };

  const handleReset = () => {
    if (confirm("هل أنت متأكد من رغبتك في استعادة البيانات الافتراضية؟ سيتم مسح أي تعديلات محلية غير محفوظة.")) {
      resetDataToDefault();
      showToast("تمت استعادة البيانات الافتراضية بنجاح", "info");
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto" dir="rtl" id="settings-control-center">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292B2E] pb-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-[#C8A75A]/15 text-[#C8A75A] border border-[#C8A75A]/30">
            <Settings className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#EDEDED]">
                مركز تحكم مالك النظام (System Owner Control Center)
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C8A75A]/20 text-[#C8A75A] border border-[#C8A75A]/40">
                إدارة شاملة
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              لوحة الإدارة المركزية للشركات، المستخدمين، الصلاحيات، المنتجات، وقنوات المزامنة والربط السحابي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTab("dashboard")}
            className="p-2 rounded-xl bg-[#18191B] border border-[#292B2E] text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225] transition-colors cursor-pointer"
            title="الرجوع للرئيسية"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={async () => {
              if (confirm("هل تريد تحديث ومزامنة مسار المبيعات وإصلاح البيانات المتطابقة؟")) {
                await migrateLegacyData();
                showToast("تم تحديث مسار المبيعات وإصلاح البيانات بنجاح", "success");
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-[#18191B] border border-[#292B2E] text-xs font-bold text-[#EDEDED] hover:bg-[#202225] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>إصلاح البيانات</span>
          </button>
          <button
            onClick={handleExportData}
            className="px-3 py-1.5 rounded-xl bg-[#C8A75A] text-slate-950 font-bold text-xs hover:bg-[#dfba66] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير نسخة JSON</span>
          </button>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#292B2E] no-scrollbar">
        {[
          { id: "companies", label: "الشركات والمؤسسات", icon: Building2 },
          { id: "users", label: "المستخدمون والصلاحيات", icon: Users },
          { id: "products", label: "المنتجات والفئات", icon: Package },
          { id: "sales_config", label: "سير المبيعات والحالات", icon: Sliders },
          { id: "regions", label: "المناطق والمحافظات", icon: MapPin },
          { id: "appearance", label: "المظهر والسمة البصرية", icon: Palette },
          { id: "health", label: "صحة وتكامل البيانات", icon: Activity },
          { id: "persistence_sync", label: "مركز المزامنة وسجل التعديلات", icon: Database },
          { id: "audit", label: "سجل التدقيق (Audit Log)", icon: Clock },
          { id: "backup", label: "النسخ الاحتياطي والنظام", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                isActive
                  ? "bg-[#C8A75A] text-slate-950 shadow-md font-black"
                  : "bg-[#18191B] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E] hover:border-[#3E4247]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
         TAB 1: COMPANIES MANAGEMENT
         ========================================================================= */}
      {activeTab === "companies" && (
        <div className="space-y-6">
          {/* Top Actions & Target Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-[#EDEDED] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#C8A75A]" />
                <span>إدارة الشركات وتحديد الأهداف البيعية الشهرية</span>
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                يمكن لمالك النظام إضافة وتعديل وأرشفة الشركات وتحديد المستهدفات التقديرية
              </p>
            </div>
            <button
              onClick={() => setShowAddCompanyModal(true)}
              className="px-4 py-2 bg-[#C8A75A] text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-[#dfba66] transition-all cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة شركة جديدة</span>
            </button>
          </div>

          {/* Companies Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((comp) => {
              const compSales = sales
                .filter((s) => s.companyId === comp.id)
                .reduce((acc, s) => acc + s.amount, 0);
              const currentTarget = editingTargets[comp.id] ?? comp.monthlyTarget;
              const rate = currentTarget > 0 ? Math.round((compSales / currentTarget) * 100) : 0;
              const isSaved = savedStatus[comp.id];

              return (
                <div
                  key={comp.id}
                  className="bg-[#18191B] border border-[#292B2E] hover:border-[#3E4247] rounded-2xl p-5 space-y-4 relative overflow-hidden transition-all shadow-sm"
                >
                  {/* Top Color Accent */}
                  <div
                    className="absolute top-0 right-0 left-0 h-1.5"
                    style={{ backgroundColor: comp.color || "#C8A75A" }}
                  />

                  {/* Company Header */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      <CompanyLogo company={comp} size="md" />
                      <div>
                        <h4 className="text-sm font-bold text-[#EDEDED]">{comp.name}</h4>
                        <div className="text-[11px] text-[#A1A1AA] flex items-center gap-1 mt-0.5">
                          <span>{comp.nameEn || "Company"}</span>
                          <span>•</span>
                          <span>{comp.phone || "بدون هاتف"}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        comp.active !== false
                          ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/40"
                          : "bg-rose-950/70 text-rose-400 border border-rose-800/40"
                      }`}
                    >
                      {comp.active !== false ? "نشطة" : "مؤرشفة"}
                    </span>
                  </div>

                  {/* Target & Sales Bar */}
                  <div className="bg-[#202225] p-3 rounded-xl space-y-2 border border-[#292B2E]">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#A1A1AA]">المبيعات المحققة:</span>
                      <strong className="text-emerald-400 font-mono">
                        {compSales.toLocaleString()} ج.م
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#A1A1AA]">الهدف المستهدف:</span>
                      <strong className="text-[#EDEDED] font-mono">
                        {currentTarget.toLocaleString()} ج.م
                      </strong>
                    </div>
                    <div className="w-full h-1.5 bg-[#18191B] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, rate)}%`,
                          backgroundColor: comp.color || "#C8A75A",
                        }}
                      />
                    </div>
                    <div className="text-left text-[10px] text-[#C8A75A] font-bold">
                      نسبة الإنجاز: {rate}%
                    </div>
                  </div>

                  {/* Target Editor Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-[#A1A1AA]">
                      تعديل الهدف البيعي الشهري:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step={10000}
                        value={currentTarget}
                        onChange={(e) => handleTargetChange(comp.id, Number(e.target.value))}
                        className="w-full pl-10 pr-3 py-1.5 bg-[#202225] text-[#EDEDED] font-mono font-bold text-xs rounded-xl border border-[#292B2E] focus:border-[#C8A75A] outline-hidden"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#A1A1AA]">
                        ج.م
                      </span>
                    </div>
                  </div>

                  {/* Save Target Button */}
                  <button
                    onClick={() => handleSaveTarget(comp.id)}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSaved
                        ? "bg-emerald-600 text-white"
                        : "bg-[#202225] hover:bg-[#292B2E] text-[#C8A75A] border border-[#292B2E]"
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم الحفظ ✓</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>حفظ الهدف</span>
                      </>
                    )}
                  </button>

                  {/* Action Buttons: Edit, Toggle Status */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#292B2E]">
                    <button
                      onClick={() => {
                        setEditingCompany(comp);
                        setCompanyForm({
                          name: comp.name,
                          nameEn: comp.nameEn || "",
                          phone: comp.phone || "",
                          monthlyTarget: comp.monthlyTarget || 300000,
                          annualTarget: comp.annualTarget || 3600000,
                          color: comp.color || "#C8A75A",
                          secondaryColor: comp.secondaryColor || "#111111",
                          logoUrl: comp.logoUrl || "",
                        });
                      }}
                      className="flex-1 py-1.5 px-2 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] text-xs font-semibold rounded-lg border border-[#292B2E] flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-[#C8A75A]" />
                      <span>تعديل البيانات</span>
                    </button>
                    <button
                      onClick={() => handleToggleCompanyStatus(comp)}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        comp.active !== false
                          ? "text-amber-400 border-amber-800/40 bg-amber-950/30 hover:bg-amber-950/60"
                          : "text-emerald-400 border-emerald-800/40 bg-emerald-950/30 hover:bg-emerald-950/60"
                      }`}
                    >
                      {comp.active !== false ? "أرشفة" : "تفعيل"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add / Edit Company Modal */}
          {(showAddCompanyModal || editingCompany) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#292B2E] pb-3">
                  <h3 className="font-bold text-base text-[#EDEDED] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#C8A75A]" />
                    <span>{editingCompany ? "تعديل بيانات الشركة" : "إضافة شركة ومؤسسة جديدة"}</span>
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddCompanyModal(false);
                      setEditingCompany(null);
                    }}
                    className="p-1 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#202225]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form
                  onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany}
                  className="space-y-4 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#A1A1AA] mb-1">اسم الشركة (عربي) *</label>
                      <input
                        type="text"
                        required
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
                        placeholder="مثال: نيوهاوس للقطاعات"
                      />
                    </div>
                    <div>
                      <label className="block text-[#A1A1AA] mb-1">اسم الشركة (إنجليزي)</label>
                      <input
                        type="text"
                        value={companyForm.nameEn}
                        onChange={(e) => setCompanyForm({ ...companyForm, nameEn: e.target.value })}
                        className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
                        placeholder="e.g. NewHouse UPVC"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#A1A1AA] mb-1">رقم الهاتف / التواصل</label>
                      <input
                        type="text"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                        className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
                        placeholder="010XXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-[#A1A1AA] mb-1">الهدف البيعي الشهري (ج.م)</label>
                      <input
                        type="number"
                        value={companyForm.monthlyTarget}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, monthlyTarget: Number(e.target.value) })
                        }
                        className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#A1A1AA] mb-1">اللون الأساسي للعلامة</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={companyForm.color}
                          onChange={(e) => setCompanyForm({ ...companyForm, color: e.target.value })}
                          className="w-10 h-10 rounded-lg bg-transparent border border-[#292B2E] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={companyForm.color}
                          onChange={(e) => setCompanyForm({ ...companyForm, color: e.target.value })}
                          className="flex-1 p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#A1A1AA] mb-1">رابط الشعار (Logo URL)</label>
                      <input
                        type="text"
                        value={companyForm.logoUrl}
                        onChange={(e) => setCompanyForm({ ...companyForm, logoUrl: e.target.value })}
                        className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-[#292B2E]">
                    <button
                      type="submit"
                      className="flex-1 bg-[#C8A75A] text-slate-950 font-bold py-2.5 rounded-xl hover:bg-[#dfba66] transition-all cursor-pointer shadow-xs"
                    >
                      {editingCompany ? "حفظ التعديلات" : "إنشاء الشركة الآن"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCompanyModal(false);
                        setEditingCompany(null);
                      }}
                      className="px-5 bg-[#202225] text-[#A1A1AA] hover:text-white rounded-xl border border-[#292B2E]"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
         TAB 2: USERS & ROLES & PERMISSIONS
         ========================================================================= */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Add User Bar */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#C8A75A]" />
              <span>إضافة مستخدم جديد للنظام</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <input
                type="text"
                placeholder="الاسم الكامل *"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              />
              <input
                type="email"
                placeholder="البريد الإلكتروني *"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              />
              <input
                type="password"
                placeholder="كلمة المرور *"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                className="p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              >
                <option value="owner">مالك النظام (System Owner)</option>
                <option value="admin">مدير شركة (Company Manager)</option>
                <option value="sales">مسؤول مبيعات (Employee)</option>
              </select>
              <select
                value={newUser.allowedCompanyIds[0]}
                onChange={(e) => setNewUser({ ...newUser, allowedCompanyIds: [e.target.value] })}
                className="p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              >
                <option value="all">كافة الشركات (All)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAddUser}
              disabled={isAddingUser}
              className="w-full py-2.5 bg-[#C8A75A] text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-[#dfba66] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingUser ? "جاري الإنشاء والمزامنة..." : "إنشاء وتفعيل حساب المستخدم"}</span>
            </button>
          </div>

          {/* Users List Table */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C8A75A]" />
              <span>قائمة المستخدمين الحاليين ({users.length})</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-[#EDEDED]">
                <thead>
                  <tr className="border-b border-[#292B2E] text-[#A1A1AA] pb-2">
                    <th className="pb-2.5 font-semibold">المستخدم</th>
                    <th className="pb-2.5 font-semibold">البريد</th>
                    <th className="pb-2.5 font-semibold">الدور</th>
                    <th className="pb-2.5 font-semibold">الشركة المحددة</th>
                    <th className="pb-2.5 font-semibold">الحالة</th>
                    <th className="pb-2.5 font-semibold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292B2E]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#202225]/40 transition-colors">
                      <td className="py-3 font-bold">{u.name}</td>
                      <td className="py-3 text-[#A1A1AA] font-mono text-[11px]">{u.email}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === "owner"
                              ? "bg-amber-950/70 text-amber-400 border border-amber-800/40"
                              : u.role === "admin"
                              ? "bg-blue-950/70 text-blue-400 border border-blue-800/40"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {u.role === "owner"
                            ? "مالك النظام"
                            : u.role === "admin"
                            ? "مدير شركة"
                            : "موظف مبيعات"}
                        </span>
                      </td>
                      <td className="py-3 text-[#A1A1AA]">
                        {u.allowedCompanyIds[0] === "all"
                          ? "كافة الشركات"
                          : companies.find((c) => c.id === u.allowedCompanyIds[0])?.name ||
                            u.allowedCompanyIds[0]}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.active !== false
                              ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/40"
                              : "bg-rose-950/70 text-rose-400 border border-rose-800/40"
                          }`}
                        >
                          {u.active !== false ? "نشط" : "موقوف"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {u.role !== "owner" ? (
                            <>
                              <button
                                onClick={() => handleToggleUserActive(u)}
                                className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                                  u.active !== false
                                    ? "text-amber-400 border-amber-800/40 bg-amber-950/30 hover:bg-amber-950/60"
                                    : "text-emerald-400 border-emerald-800/40 bg-emerald-950/30 hover:bg-emerald-950/60"
                                }`}
                              >
                                {u.active !== false ? "إيقاف" : "تفعيل"}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditUserForm({ name: u.name, password: "" });
                                }}
                                className="p-1 text-blue-400 hover:bg-blue-950/40 rounded border border-transparent hover:border-blue-800/40"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1 text-rose-400 hover:bg-rose-950/40 rounded border border-transparent hover:border-rose-800/40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-[#C8A75A] font-bold">مالك أساسي</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
                <h3 className="font-bold text-base text-[#EDEDED]">تعديل بيانات المستخدم</h3>
                <p className="text-xs text-[#A1A1AA]">{editingUser.email}</p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#A1A1AA] mb-1">الاسم الكامل</label>
                    <input
                      type="text"
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                      className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A1A1AA] mb-1">
                      كلمة المرور الجديدة (اتركه فارغاً لعدم التغيير)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={editUserForm.password}
                      onChange={(e) =>
                        setEditUserForm({ ...editUserForm, password: e.target.value })
                      }
                      className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleEditUser}
                    disabled={isEditingUser}
                    className="flex-1 bg-[#C8A75A] text-slate-950 font-bold py-2.5 rounded-xl text-xs disabled:opacity-50"
                  >
                    {isEditingUser ? "جاري الحفظ..." : "حفظ التعديلات"}
                  </button>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 bg-[#202225] text-[#A1A1AA] hover:text-white border border-[#292B2E] py-2.5 rounded-xl text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Roles & Permissions Matrix */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C8A75A]" />
              <span>مصفوفة الصلاحيات المعتمدة (Roles & Permissions Matrix)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-[#EDEDED]">
                <thead>
                  <tr className="border-b border-[#292B2E] text-[#A1A1AA] pb-2">
                    <th className="pb-2.5 font-semibold">الوحدة / القسم</th>
                    <th className="pb-2.5 font-semibold text-center">مالك النظام (Owner)</th>
                    <th className="pb-2.5 font-semibold text-center">مدير الشركة (Manager)</th>
                    <th className="pb-2.5 font-semibold text-center">موظف المبيعات (Employee)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292B2E]">
                  {[
                    { module: "العملاء والاستفسارات", owner: "تحكم كامل بكافة الشركات", manager: "تحكم كامل بشركته", employee: "إنشاء وتعديل عملائه" },
                    { module: "المتابعات والمهام", owner: "عرض وإسناد للجميع", manager: "إسناد ومتابعة شركته", employee: "إنجاز وإعادة جدولة مهامه" },
                    { module: "مركز الفرص وعروض الأسعار", owner: "تحكم واعتماد وحذف", manager: "إنشاء واعتماد بشركته", employee: "إنشاء وتعديل عروضه" },
                    { module: "التعاقدات والمبيعات", owner: "تحكم كامل وتوثيق", manager: "إبرام وتعديل بشركته", employee: "عرض وتسجيل الصفقات" },
                    { module: "التنفيذ والتحصيل المالي", owner: "إدارة وتدقيق وتحصيل", manager: "متابعة تحصيلات شركته", employee: "تسجيل سندات القبض" },
                    { module: "المنتجات والفئات", owner: "إضافة وتعديل وأرشفة", manager: "عرض وتطبيق الأسعار", employee: "عرض المواصفات والأسعار" },
                    { module: "مركز التحليلات والأداء", owner: "مقارنات شاملة للجميع", manager: "تحليلات شركته وموظفيه", employee: "أداؤه الشخصي فقط" },
                    { module: "إعدادات النظام والـ Sheets", owner: "صلاحية حصرية كاملة", manager: "عرض إعدادات شركته", employee: "غير متاح" },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#202225]/40 transition-colors">
                      <td className="py-2.5 font-bold text-[#EDEDED]">{row.module}</td>
                      <td className="py-2.5 text-center text-amber-400 font-semibold">{row.owner}</td>
                      <td className="py-2.5 text-center text-blue-400">{row.manager}</td>
                      <td className="py-2.5 text-center text-[#A1A1AA]">{row.employee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 3: PRODUCTS & CATEGORIES
         ========================================================================= */}
      {activeTab === "products" && (
        <div className="space-y-6">
          {/* Categories Manager */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#C8A75A]" />
              <span>إدارة فئات المنتجات والخامات (Multi-Category Engine)</span>
            </h3>
            <p className="text-xs text-[#A1A1AA]">
              يدعم النظام كافة أنواع الخامات والقطاعات (UPVC، ألومنيوم، أبواب، شبابيك، إكسسوارات، زجاج) دون قيود
            </p>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="اسم الفئة الجديدة (مثال: قطاعات شتر، مقابض تركي...)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2.5 bg-[#C8A75A] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-[#dfba66] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فئة</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {productCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-semibold text-[#EDEDED]"
                >
                  <span>{cat}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="text-[#A1A1AA] hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Quick Products Overview */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#EDEDED]">
                المنتجات المسجلة في النظام ({products.length})
              </h3>
              <button
                onClick={() => setCurrentTab("products")}
                className="text-xs text-[#C8A75A] hover:underline flex items-center gap-1 font-bold"
              >
                <span>فتح صفحة المنتجات الكاملة</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {products.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-[#202225] border border-[#292B2E] rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#EDEDED]">{p.name}</span>
                    <span className="text-[10px] text-[#C8A75A] px-1.5 py-0.5 bg-[#C8A75A]/10 rounded border border-[#C8A75A]/30">
                      {p.category}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#A1A1AA]">
                    <span>السعر: {p.price?.toLocaleString()} ج.م</span>
                    <span>الوحدة: {p.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 4: SALES WORKFLOW CONFIG
         ========================================================================= */}
      {activeTab === "sales_config" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Lead Sources */}
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#C8A75A]" />
                <span>مصادر الاستفسارات والعملاء (Lead Sources)</span>
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                القنوات المدعومة لاستقبال وتسجيل العملاء في مسار البيع
              </p>
              <div className="flex flex-wrap gap-2">
                {defaultSources.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] font-semibold"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Opportunity Stages */}
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#C8A75A]" />
                <span>مراحل مسار المبيعات (Sales Funnel Stages)</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {opportunityStagesList.map((stage) => (
                  <div
                    key={stage.id}
                    className="p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl flex items-center justify-between"
                  >
                    <span className={`font-bold ${stage.color}`}>{stage.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Lost Reasons */}
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C8A75A]" />
                <span>أسباب الخسارة / رفض عروض الأسعار</span>
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="سبب خسارة جديد..."
                  value={newLossReason}
                  onChange={(e) => setNewLossReason(e.target.value)}
                  className="flex-1 p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
                />
                <button
                  onClick={() => {
                    if (newLossReason.trim()) {
                      addLossReason(newLossReason.trim());
                      setNewLossReason("");
                      showToast("تمت إضافة سبب الخسارة", "success");
                    }
                  }}
                  className="p-2.5 bg-[#C8A75A] text-slate-950 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {lossReasons.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#202225] border border-[#292B2E] rounded-lg text-xs font-semibold text-[#EDEDED]"
                  >
                    <span>{r}</span>
                    <button
                      onClick={() => deleteLossReason(r)}
                      className="text-[#A1A1AA] hover:text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Task Types */}
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C8A75A]" />
                <span>أنواع المهام والعمليات اليومية</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {taskTypesList.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl flex items-center gap-2"
                  >
                    <span>{t.icon}</span>
                    <span className="font-bold text-[#EDEDED]">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 5: REGIONS & AREAS
         ========================================================================= */}
      {activeTab === "regions" && (
        <div className="space-y-6">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#C8A75A]" />
              <span>إدارة المناطق الجغرافية ونطاقات العمل</span>
            </h3>
            <p className="text-xs text-[#A1A1AA]">
              تستخدم المناطق في تصنيف العملاء، تنظيم المعاينات، وإعداد تقارير وتحليلات المبيعات
            </p>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="اسم المنطقة أو المحافظة الجديدة..."
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                className="flex-1 p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              />
              <button
                onClick={() => {
                  if (newArea.trim()) {
                    addArea(newArea.trim());
                    setNewArea("");
                    showToast("تمت إضافة المنطقة بنجاح", "success");
                  }
                }}
                className="px-4 py-2.5 bg-[#C8A75A] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-[#dfba66] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة منطقة</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {areas.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-semibold text-[#EDEDED]"
                >
                  <span>{a}</span>
                  <button
                    onClick={() => deleteArea(a)}
                    className="text-[#A1A1AA] hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 6: APPEARANCE & THEME CONTROL
         ========================================================================= */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="font-extrabold text-base text-[#EDEDED] flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#C8A75A]" />
                <span>إعدادات المظهر والسمة البصرية (Appearance & Theme)</span>
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-1">
                التحكم المباشر في الوضع الليلي (Dark Mode) والوضع الفاتح (Light Mode) مع التبديل اللحظي والحفظ التلقائي على جميع الشاشات والمكونات.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dark Mode Card */}
              <div
                onClick={() => {
                  setTheme("dark");
                  showToast("تم تفعيل الوضع الليلي (Dark Mode)", "info");
                }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                  theme === "dark"
                    ? "bg-[#202225] border-[#C8A75A] ring-2 ring-[#C8A75A]/20"
                    : "bg-[#141517] border-[#292B2E] hover:border-[#3E4247]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-[#0C0D0E] text-[#C8A75A] border border-[#292B2E]">
                      <Moon className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#EDEDED]">الوضع الليلي الداكن (Dark Mode)</h4>
                      <span className="text-[11px] text-[#A1A1AA]">موصى به للاستخدام الفعلي ولتقليل إجهاد العين</span>
                    </div>
                  </div>
                  {theme === "dark" && (
                    <span className="px-2.5 py-1 bg-[#C8A75A] text-black text-[10px] font-black rounded-lg">
                      مفعل حالياً ✓
                    </span>
                  )}
                </div>
                <div className="p-3 bg-[#0C0D0E] rounded-xl border border-[#292B2E] text-[11px] text-[#A1A1AA] flex items-center justify-between">
                  <span>خلفية داكنة (#0C0D0E) مع نصوص مرتفعة التباين (#EDEDED)</span>
                  <span className="w-3 h-3 rounded-full bg-[#0C0D0E] border border-[#C8A75A]" />
                </div>
              </div>

              {/* Light Mode Card */}
              <div
                onClick={() => {
                  setTheme("light");
                  showToast("تم تفعيل الوضع الفاتح (Light Mode)", "info");
                }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                  theme === "light"
                    ? "bg-[#202225] border-[#C8A75A] ring-2 ring-[#C8A75A]/20"
                    : "bg-[#141517] border-[#292B2E] hover:border-[#3E4247]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-[#F3F4F6] text-[#C8A75A] border border-[#CBD5E1]">
                      <Sun className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#EDEDED]">الوضع الفاتح (Light Mode)</h4>
                      <span className="text-[11px] text-[#A1A1AA]">مناسب للعروض للعملاء والمحيط المضيء</span>
                    </div>
                  </div>
                  {theme === "light" && (
                    <span className="px-2.5 py-1 bg-[#C8A75A] text-black text-[10px] font-black rounded-lg">
                      مفعل حالياً ✓
                    </span>
                  )}
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] text-[11px] text-[#0F172A] flex items-center justify-between font-bold">
                  <span>خلفية فاتحة ناصعة (#F3F4F6) مع نصوص واضحة (#0F172A)</span>
                  <span className="w-3 h-3 rounded-full bg-[#F3F4F6] border border-[#C8A75A]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 7: DATA HEALTH CENTER
         ========================================================================= */}
      {activeTab === "health" && (
        <div className="space-y-6">
          {/* Health Overview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 space-y-1">
              <div className="text-[11px] text-[#A1A1AA]">السجلات المفقودة لمعرف الشركة</div>
              <div
                className={`text-xl font-bold font-mono ${
                  dataHealthStats.totalMissingComp === 0 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {dataHealthStats.totalMissingComp}
              </div>
              <div className="text-[10px] text-[#A1A1AA]">
                {dataHealthStats.totalMissingComp === 0 ? "سليمة تماماً ✓" : "تحتاج فحص"}
              </div>
            </div>

            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 space-y-1">
              <div className="text-[11px] text-[#A1A1AA]">تكرار أرقام الهواتف</div>
              <div
                className={`text-xl font-bold font-mono ${
                  dataHealthStats.dupPhoneCount === 0 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {dataHealthStats.dupPhoneCount}
              </div>
              <div className="text-[10px] text-[#A1A1AA]">أرقام مكررة</div>
            </div>

            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 space-y-1">
              <div className="text-[11px] text-[#A1A1AA]">العقود بدون عميل مرتبط</div>
              <div
                className={`text-xl font-bold font-mono ${
                  dataHealthStats.brokenContracts === 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {dataHealthStats.brokenContracts}
              </div>
              <div className="text-[10px] text-[#A1A1AA]">
                {dataHealthStats.brokenContracts === 0 ? "لا توجد علاقات مكسورة" : "علاقات مكسورة"}
              </div>
            </div>

            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 space-y-1">
              <div className="text-[11px] text-[#A1A1AA]">إجمالي الكيانات في النظام</div>
              <div className="text-xl font-bold font-mono text-[#C8A75A]">
                {(
                  dataHealthStats.totalCustomers +
                  dataHealthStats.totalInquiries +
                  dataHealthStats.totalContracts +
                  dataHealthStats.totalSales
                ).toLocaleString()}
              </div>
              <div className="text-[10px] text-[#A1A1AA]">سجل متكامل</div>
            </div>
          </div>

          {/* Diagnostic Details */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>فحص النزاهة والتناسق التشغيلي (Operational Data Integrity)</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[#202225] rounded-xl border border-[#292B2E] flex justify-between items-center">
                <span className="text-[#EDEDED]">عزل بيانات الشركات (Multi-Company Isolation):</span>
                <span className="text-emerald-400 font-bold">مُفعل ومحمي 100% ✓</span>
              </div>
              <div className="p-3 bg-[#202225] rounded-xl border border-[#292B2E] flex justify-between items-center">
                <span className="text-[#EDEDED]">منع التكرار التلقائي للعملاء (Duplicate Prevention):</span>
                <span className="text-emerald-400 font-bold">مُفعل عبر الهاتف والاسم ✓</span>
              </div>
              <div className="p-3 bg-[#202225] rounded-xl border border-[#292B2E] flex justify-between items-center">
                <span className="text-[#EDEDED]">حفظ التواريخ الأصلية للعمليات (Event Date Preservation):</span>
                <span className="text-emerald-400 font-bold">مضمون وغير قابل للتغيير العرضي ✓</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 7: PERSISTENCE SYNC & CHANGE LEDGER
         ========================================================================= */}
      {activeTab === "persistence_sync" && (
        <PersistenceSyncCenter />
      )}

      {/* =========================================================================
         TAB 8: AUDIT LOG
         ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C8A75A]" />
                <span>سجل تدقيق العمليات والتعديلات (System Audit Log)</span>
              </h3>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                  <input
                    type="text"
                    placeholder="بحث في العمليات..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pr-8 pl-3 py-1.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
                  />
                </div>

                <select
                  value={auditEntityFilter}
                  onChange={(e) => setAuditEntityFilter(e.target.value)}
                  className="py-1.5 px-3 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden"
                >
                  <option value="all">كافة الكيانات</option>
                  <option value="customer">عميل (Customer)</option>
                  <option value="inquiry">استفسار (Inquiry)</option>
                  <option value="quotation">عرض سعر (Quotation)</option>
                  <option value="contract">عقد (Contract)</option>
                  <option value="sale">مبيعات (Sale)</option>
                  <option value="payment">تحصيل (Payment)</option>
                  <option value="product">منتج (Product)</option>
                </select>
              </div>
            </div>

            {filteredAuditLogs.length === 0 ? (
              <div className="text-center py-10 text-[#A1A1AA] text-xs">
                لا توجد عمليات مسجلة تطابق معايير البحث
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-[#EDEDED]">
                  <thead>
                    <tr className="border-b border-[#292B2E] text-[#A1A1AA] pb-2">
                      <th className="pb-2.5 font-semibold">التوقيت</th>
                      <th className="pb-2.5 font-semibold">المستخدم</th>
                      <th className="pb-2.5 font-semibold">نوع العملية</th>
                      <th className="pb-2.5 font-semibold">الكيان</th>
                      <th className="pb-2.5 font-semibold">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292B2E]">
                    {filteredAuditLogs.slice(0, 50).map((log) => (
                      <tr key={log.id} className="hover:bg-[#202225]/40 transition-colors">
                        <td className="py-2.5 text-[#A1A1AA] font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString("ar-EG")}
                        </td>
                        <td className="py-2.5 font-bold">{log.userName || "النظام"}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#202225] border border-[#292B2E] text-[#C8A75A]">
                            {log.actionType}
                          </span>
                        </td>
                        <td className="py-2.5 text-[#A1A1AA]">{log.entityType}</td>
                        <td className="py-2.5 text-[#EDEDED]">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 9: BACKUP & SYSTEM
         ========================================================================= */}
      {activeTab === "backup" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* System Specs */}
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>حالة النظام والبيئة التشغيلية</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-[#202225] border border-[#292B2E] flex justify-between items-center">
                  <span className="text-[#A1A1AA]">إصدار المنظومة:</span>
                  <strong className="text-[#EDEDED] font-mono">PVC NESTA AI v1.2 PRO</strong>
                </div>
                <div className="p-3 rounded-xl bg-[#202225] border border-[#292B2E] flex justify-between items-center">
                  <span className="text-[#A1A1AA]">معمارية قواعد البيانات:</span>
                  <strong className="text-[#EDEDED] font-mono">Supabase + Sheets Two-Way</strong>
                </div>
                <div className="p-3 rounded-xl bg-[#202225] border border-[#292B2E] flex justify-between items-center">
                  <span className="text-[#A1A1AA]">محرك الذكاء الاصطناعي:</span>
                  <strong className="text-[#C8A75A] font-mono">Gemini 2.5 Flash</strong>
                </div>
              </div>
            </div>

            {/* Backup & Danger Zone */}
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#C8A75A]" />
                <span>النسخ الاحتياطي والتحكم في البيانات</span>
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                تنزيل نسخة احتياطية كاملة بصيغة JSON لجميع العملاء، الاستفسارات، عروض الأسعار، العقود، والمنتجات.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleExportData}
                  className="px-4 py-2 bg-[#C8A75A] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-[#dfba66] transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير نسخة احتياطية (JSON)</span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-950/80 text-rose-400 border border-rose-800/40 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>استعادة البيانات الافتراضية</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
