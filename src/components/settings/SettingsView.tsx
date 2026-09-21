import React, { useState, useMemo, useRef, useEffect } from "react";
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
import { CompaniesView } from "../companies/CompaniesView";

export const SettingsView: React.FC = () => {
  const {
    companies,
    allCompanies,
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
    isPremiumAiEnabled,
    setIsPremiumAiEnabled,
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
    | "ai_system"
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
    email: "",
    monthlyTarget: 300000,
    annualTarget: 3600000,
    color: "#C8A75A",
    secondaryColor: "#111111",
    logoUrl: "",
    commissionTiming: "contract_signing" as "contract_signing" | "down_payment" | "full_collection" | "custom",
    commissionRate: 2.5,
    employeeAllocationRatio: 50,
    monthlyAdvertisingBudget: 25000,
  });

  const [showArchivedFilter, setShowArchivedFilter] = useState(false);

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
      email: companyForm.email.trim() || undefined,
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
      commissionTiming: companyForm.commissionTiming,
      commissionRate: companyForm.commissionRate,
      employeeAllocationRatio: companyForm.employeeAllocationRatio,
      monthlyAdvertisingBudget: companyForm.monthlyAdvertisingBudget,
    });

    setShowAddCompanyModal(false);
    setCompanyForm({
      name: "",
      nameEn: "",
      phone: "",
      email: "",
      monthlyTarget: 300000,
      annualTarget: 3600000,
      color: "#C8A75A",
      secondaryColor: "#111111",
      logoUrl: "",
      commissionTiming: "contract_signing",
      commissionRate: 2.5,
      employeeAllocationRatio: 50,
      monthlyAdvertisingBudget: 25000,
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
      email: companyForm.email.trim() || undefined,
      monthlyTarget: companyForm.monthlyTarget,
      annualTarget: companyForm.annualTarget,
      color: companyForm.color,
      secondaryColor: companyForm.secondaryColor,
      logoUrl: companyForm.logoUrl || undefined,
      commissionTiming: companyForm.commissionTiming,
      commissionRate: companyForm.commissionRate,
      employeeAllocationRatio: companyForm.employeeAllocationRatio,
      monthlyAdvertisingBudget: companyForm.monthlyAdvertisingBudget,
    });

    setEditingCompany(null);
    showToast("تم تحديث بيانات الشركة بنجاح", "success");
  };

  const handleToggleCompanyStatus = (company: Company) => {
    const nextActive = !company.active;

    if (!nextActive) {
      // Safety Check: Check for active contracts and open inquiries
      const activeContracts = contracts.filter(
        (c) => c.companyId === company.id && c.recordStatus !== "duplicate" && c.recordStatus !== "excluded" && c.status === "active"
      );
      const openInquiries = inquiries.filter(
        (i) => i.companyId === company.id && i.recordStatus !== "duplicate" && i.recordStatus !== "excluded" && i.status !== "lost" && i.status !== "won" && i.status !== "contracted"
      );

      if (activeContracts.length > 0 || openInquiries.length > 0) {
        const details = [
          activeContracts.length > 0 ? `عقود نشطة (${activeContracts.length})` : "",
          openInquiries.length > 0 ? `استفسارات مفتوحة (${openInquiries.length})` : ""
        ].filter(Boolean).join(" و ");
        showToast(`⚠️ لا يمكن أرشفة شركة ${company.name} بسبب وجود ${details}! يرجى تسويتها أو نقلها أولاً.`, "warning");
        return;
      }
    }

    updateCompany(company.id, {
      active: nextActive,
      status: nextActive ? "active" : "archived",
    });
    showToast(
      nextActive
        ? `تم استعادة وتفعيل شركة ${company.name} بنجاح ✅`
        : `تم أرشفة شركة ${company.name} بنجاح (كافة العقود والسجلات محفوظة بدون حذف)`,
      "info"
    );
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
  const [userAuditData, setUserAuditData] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const callAdminApi = async (endpoint: string, options: RequestInit = {}) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as any),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(endpoint, {
      ...options,
      headers,
    });
  };

  const loadUserAudit = async () => {
    try {
      setLoadingAudit(true);
      const res = await callAdminApi("/api/admin/users/audit");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.audit) {
          setUserAuditData(data.audit);
        }
      }
    } catch (e) {
      console.warn("Audit load error:", e);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      loadUserAudit();
    }
  }, [activeTab]);

  const handleFixOrphanUser = async (userId: string) => {
    try {
      const res = await callAdminApi("/api/admin/users/fix-orphan", {
        method: "POST",
        body: JSON.stringify({ publicUserId: userId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل ربط المستخدم");
      }
      showToast(data.message || "تم ربط الحساب وتأكيده بنجاح", "success");
      await loadUserAudit();
      const { data: refreshedUsers } = await supabase.from("users").select("*");
      if (refreshedUsers) {
        setUsers(
          refreshedUsers.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            allowedCompanyIds: u.allowed_company_ids || u.allowedCompanyIds || [],
            active: u.active,
          }))
        );
      }
    } catch (err: any) {
      showToast("خطأ أثناء الربط: " + err.message, "error");
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
      showToast("يرجى تعبئة جميع الحقول المطلوبة", "warning");
      return;
    }

    setIsAddingUser(true);
    try {
      const normalizedEmail = newUser.email.trim().toLowerCase();
      const res = await callAdminApi("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: newUser.name.trim(),
          email: normalizedEmail,
          password: newUser.password,
          role: newUser.role,
          allowedCompanyIds: newUser.allowedCompanyIds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "فشل إنشاء المستخدم عبر خدمة الإدارة في الخادم");
      }

      setUsers((prev) => {
        const filtered = prev.filter((u) => u.id !== data.user.id);
        return [...filtered, data.user];
      });
      setNewUser({ name: "", email: "", password: "", role: "sales", allowedCompanyIds: ["all"] });
      showToast("تم إنشاء وتأكيد حساب المستخدم في Supabase Auth بنجاح — يمكنه تسجيل الدخول فوراً", "success");
      loadUserAudit();
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء إضافة المستخدم", "error");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً من المصادقة وقاعدة البيانات؟")) return;
    try {
      const res = await callAdminApi(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "تعذر حذف المستخدم من النظام");
      }

      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast("تم حذف المستخدم وحسابه نهائياً من النظام", "success");
      loadUserAudit();
    } catch (err: any) {
      showToast("فشل الحذف: " + err.message, "error");
    }
  };

  const handleToggleUserActive = async (user: AppUser) => {
    try {
      const nextActive = !user.active;
      const res = await callAdminApi(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "تعذر تحديث حالة المستخدم");
      }

      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active: nextActive } : u)));
      showToast(nextActive ? "تم تفعيل المستخدم بنجاح" : "تم إيقاف حساب المستخدم وحظره من الدخول", "success");
      loadUserAudit();
    } catch (err: any) {
      showToast("فشل التحديث: " + err.message, "error");
    }
  };

  const handleUpdateUserRoleAndCompany = async (
    user: AppUser,
    newRole: "owner" | "admin" | "sales",
    newCompanyId: string
  ) => {
    try {
      const res = await callAdminApi(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole, allowedCompanyIds: [newCompanyId] }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "تعذر تحديث صلاحيات المستخدم");
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, role: newRole, allowedCompanyIds: [newCompanyId] } : u
        )
      );
      showToast("تم تحديث صلاحيات المستخدم والشركة بنجاح", "success");
      loadUserAudit();
    } catch (err: any) {
      showToast("فشل التحديث: " + err.message, "error");
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    if (!editUserForm.name.trim()) return showToast("الاسم مطلوب", "warning");

    try {
      setIsEditingUser(true);
      const res = await callAdminApi(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editUserForm.name.trim(),
          password: editUserForm.password.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "تعذر تحديث بيانات المستخدم");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, name: editUserForm.name.trim() } : u))
      );
      setEditingUser(null);
      showToast("تم تحديث بيانات المستخدم وكلمة المرور بنجاح", "success");
      loadUserAudit();
    } catch (err: any) {
      showToast(err.message, "error");
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
          { id: "ai_system", label: "نظام الذكاء الاصطناعي", icon: Sparkles },
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
          <CompaniesView />
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
                    <th className="pb-2.5 font-semibold">حالة الحساب</th>
                    <th className="pb-2.5 font-semibold">هوية Supabase Auth</th>
                    <th className="pb-2.5 font-semibold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292B2E]">
                  {users.map((u) => {
                    const auditEntry = userAuditData.find(
                      (a) => a.publicId === u.id || a.email?.toLowerCase() === u.email?.toLowerCase()
                    );
                    return (
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
                          {auditEntry?.status === "MATCHED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/40">
                              ✓ مؤكد في Auth
                            </span>
                          ) : auditEntry?.status === "ORPHANED_PROFILE" || !auditEntry ? (
                            <button
                              onClick={() => handleFixOrphanUser(u.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60 hover:bg-amber-900 transition-colors shadow-sm"
                              title="المستخدم مسجل في جدول public.users فقط بدون هوية في Supabase Auth. انقر للربط والتأكيد فوراً."
                            >
                              ⚠️ ربط وتأكيد Auth
                            </button>
                          ) : auditEntry?.status === "UNCONFIRMED_AUTH" ? (
                            <button
                              onClick={() => handleFixOrphanUser(u.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950/80 text-yellow-300 border border-yellow-800/60 hover:bg-yellow-900 transition-colors"
                              title="البريد بانتظار التأكيد. انقر لتأكيده فورا."
                            >
                              تأكيد الحساب فورا
                            </button>
                          ) : (
                            <button
                              onClick={() => handleFixOrphanUser(u.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60 hover:bg-rose-900"
                            >
                              مزامنة المعرف
                            </button>
                          )}
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
                  );
                })}
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
         TAB: AI SYSTEM CONFIGURATION
         ========================================================================= */}
      {activeTab === "ai_system" && (
        <div className="space-y-6">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-[#292B2E] pb-4">
              <div className="p-2.5 rounded-xl bg-[#C8A75A]/15 text-[#C8A75A] border border-[#C8A75A]/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#EDEDED]">إعدادات الذكاء الاصطناعي والتشغيل الذكي</h3>
                <p className="text-xs text-[#A1A1AA]">التحكم في محرك التحليل Heuristic Engine والربط مع Gemini API</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Local Intelligence Engine */}
              <div className={`p-5 rounded-2xl border transition-all ${!isPremiumAiEnabled ? 'bg-[#C8A75A]/5 border-[#C8A75A]/30 ring-1 ring-[#C8A75A]/20' : 'bg-[#202225] border-[#292B2E]'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-[#EDEDED]">محرك التشغيل المحلي (Zero-Cost)</h4>
                  </div>
                  {!isPremiumAiEnabled && <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">نشط حالياً</span>}
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
                  يعتمد على محرك قواعد (Heuristic Engine) محلي 100% لتحليل رحلة العميل، تدقيق الحسابات، واكتشاف الأخطاء دون الحاجة لاتصال خارجي أو تكاليف إضافية.
                </p>
                <button 
                  onClick={() => setIsPremiumAiEnabled(false)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${!isPremiumAiEnabled ? 'bg-emerald-600 text-white cursor-default' : 'bg-[#141517] text-[#A1A1AA] border border-[#292B2E] hover:border-[#C8A75A] hover:text-[#C8A75A] cursor-pointer'}`}
                >
                  {!isPremiumAiEnabled ? 'وضع التشغيل الافتراضي مفعل' : 'تفعيل المحرك المحلي فقط'}
                </button>
              </div>

              {/* Premium Gemini AI */}
              <div className={`p-5 rounded-2xl border transition-all ${isPremiumAiEnabled ? 'bg-[#C8A75A]/5 border-[#C8A75A]/30 ring-1 ring-[#C8A75A]/20' : 'bg-[#202225] border-[#292B2E]'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-[#EDEDED]">محرك Gemini Premium</h4>
                  </div>
                  {isPremiumAiEnabled && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold">نشط حالياً</span>}
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
                  يضيف قدرات لغوية متقدمة لفهم النصوص المعقدة، توليد رسائل متابعة إبداعية، وتحليل الأنماط السلوكية غير المهيكلة (يتطلب Gemini API Key).
                </p>
                <button 
                  onClick={() => setIsPremiumAiEnabled(true)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${isPremiumAiEnabled ? 'bg-purple-600 text-white cursor-default' : 'bg-[#141517] text-[#A1A1AA] border border-[#292B2E] hover:border-[#C8A75A] hover:text-[#C8A75A] cursor-pointer'}`}
                >
                  {isPremiumAiEnabled ? 'محرك Gemini مفعل' : 'تفعيل القدرات المتقدمة (Gemini)'}
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#141517] border border-[#292B2E] rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-[#EDEDED] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#C8A75A]" />
                <span>حالة التكامل والنزاهة</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-[#18191B] rounded-lg border border-[#292B2E]">
                  <div className="text-[10px] text-[#A1A1AA] mb-1">دقة المحرك المحلي</div>
                  <div className="text-lg font-black text-emerald-400">100%</div>
                  <div className="text-[9px] text-[#6B7280]">بناءً على قواعد العمل Frozen v1.0</div>
                </div>
                <div className="p-3 bg-[#18191B] rounded-lg border border-[#292B2E]">
                  <div className="text-[10px] text-[#A1A1AA] mb-1">سرعة الاستجابة</div>
                  <div className="text-lg font-black text-blue-400">&lt; 50ms</div>
                  <div className="text-[9px] text-[#6B7280]">معالجة فورية داخل المتصفح والخادم</div>
                </div>
                <div className="p-3 bg-[#18191B] rounded-lg border border-[#292B2E]">
                  <div className="text-[10px] text-[#A1A1AA] mb-1">توفير التكاليف</div>
                  <div className="text-lg font-black text-[#C8A75A]">عالي جداً</div>
                  <div className="text-[9px] text-[#6B7280]">لا توجد فواتير استهلاك خارجية</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
