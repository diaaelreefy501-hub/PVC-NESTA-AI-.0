import React, { useState, useMemo, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { Company, CompanyRole, AppUser, Employee } from "../../types";
import { CompanyLogo } from "../common/CompanyLogo";
import { supabase } from "../../integrations/supabase/client";
import {
  Building2,
  Plus,
  Target,
  Users,
  DollarSign,
  Edit2,
  Trash2,
  Check,
  X,
  Phone,
  Settings,
  TrendingUp,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Palette,
  Shield,
  UserPlus,
  UserMinus,
  Eye,
  CheckCircle2,
  AlertCircle,
  Award,
  Archive,
  RotateCcw,
  Briefcase,
  UserCheck,
  UserX,
  Calendar,
  ShieldAlert,
} from "lucide-react";

export const CompaniesView: React.FC = () => {
  const {
    companies,
    allCompanies,
    addCompany,
    updateCompany,
    archiveCompany,
    restoreCompany,
    deleteCompany,
    customers,
    sales,
    employees,
    addEmployee,
    updateEmployee,
    toggleEmployeeStatus,
    updateEmployeeSalary,
    updateCompanyTarget,
    updateUserTarget,
    assignUserCompanyRole,
    removeUserFromCompany,
    getUserRoleInCompany,
    hasPermission,
    users,
    currentUser,
    setCurrentTab,
    showToast,
  } = useApp();

  const [showAdd, setShowAdd] = useState(false);
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'disabled' | 'archived'>('all');
  const [editingComp, setEditingComp] = useState<Company | null>(null);
  const [activeTabInModal, setActiveTabInModal] = useState<
    "identity" | "employees" | "targets" | "users" | "preview"
  >("identity");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Employee management state inside company modal
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("مهندس مبيعات");
  const [empPhone, setEmpPhone] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empSalary, setEmpSalary] = useState<number>(6000);
  const [empCommissionRule, setEmpCommissionRule] = useState<
    "percentage_of_contract" | "percentage_of_collection" | "fixed_per_contract"
  >("percentage_of_contract");
  const [empCommissionPercentage, setEmpCommissionPercentage] = useState<number>(2.5);
  const [empCommissionTiming, setEmpCommissionTiming] = useState<
    "contract_signing" | "down_payment" | "full_collection" | "custom"
  >("contract_signing");
  const [empCommissionNotes, setEmpCommissionNotes] = useState("");
  const [empStartDate, setEmpStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [empActive, setEmpActive] = useState(true);

  const resetEmployeeForm = () => {
    setEmpName("");
    setEmpRole("مهندس مبيعات");
    setEmpPhone("");
    setEmpEmail("");
    setEmpSalary(6000);
    setEmpCommissionRule("percentage_of_contract");
    setEmpCommissionPercentage(2.5);
    setEmpCommissionTiming("contract_signing");
    setEmpCommissionNotes("");
    setEmpStartDate(new Date().toISOString().split("T")[0]);
    setEmpActive(true);
    setEditingEmployeeId(null);
    setShowAddEmployeeForm(false);
  };

  const startEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEmpName(emp.name);
    setEmpRole(emp.role);
    setEmpPhone(emp.phone || "");
    setEmpEmail(emp.email || "");
    setEmpSalary(emp.monthlySalary || 0);
    setEmpCommissionRule(emp.commissionRule || "percentage_of_contract");
    setEmpCommissionPercentage(emp.commissionPercentage || 0);
    setEmpCommissionTiming(emp.commissionTiming || "contract_signing");
    setEmpCommissionNotes(emp.commissionNotes || "");
    setEmpStartDate(emp.startDate || new Date().toISOString().split("T")[0]);
    setEmpActive(emp.active !== false);
    setShowAddEmployeeForm(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComp) return;
    if (!empName.trim()) {
      showToast("يرجى إدخال اسم الموظف", "warning");
      return;
    }

    if (editingEmployeeId) {
      updateEmployee(editingEmployeeId, {
        name: empName.trim(),
        role: empRole.trim(),
        phone: empPhone.trim() || undefined,
        email: empEmail.trim() || undefined,
        monthlySalary: Number(empSalary) || 0,
        commissionRule: empCommissionRule,
        commissionPercentage: Number(empCommissionPercentage) || 0,
        commissionTiming: empCommissionTiming,
        commissionNotes: empCommissionNotes.trim() || undefined,
        startDate: empStartDate,
        active: empActive,
      });
      showToast("تم تحديث بيانات الموظف بنجاح", "success");
    } else {
      addEmployee({
        companyId: editingComp.id,
        name: empName.trim(),
        role: empRole.trim(),
        phone: empPhone.trim() || undefined,
        email: empEmail.trim() || undefined,
        monthlySalary: Number(empSalary) || 0,
        commissionRule: empCommissionRule,
        commissionPercentage: Number(empCommissionPercentage) || 0,
        commissionTiming: empCommissionTiming,
        commissionNotes: empCommissionNotes.trim() || undefined,
        startDate: empStartDate,
        active: empActive,
      });
    }

    resetEmployeeForm();
  };

  // New Company form state
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState(300000);
  const [annualTarget, setAnnualTarget] = useState(3600000);
  const [color, setColor] = useState("#C8A75A");
  const [secondaryColor, setSecondaryColor] = useState("#111111");
  const [logoUrl, setLogoUrl] = useState<string>("");
  
  // NESTA Service plan fields for creation
  const [servicePlan, setServicePlan] = useState("لوحة تحكم احترافية للشركات");
  const [monthlyServicePrice, setMonthlyServicePrice] = useState<number>(3500);
  const [serviceStartDate, setServiceStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [serviceStatus, setServiceStatus] = useState<'Active' | 'Paused' | 'Cancelled' | 'Expired'>("Active");
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Quarterly' | 'Yearly'>("Monthly");
  const [serviceNotes, setServiceNotes] = useState("");

  // Assign user to company state
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<string>("");
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<CompanyRole>("sales");
  const [selectedUserTarget, setSelectedUserTarget] = useState<number>(100000);

  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. File type validation
    if (!file.type.startsWith("image/")) {
      showToast("يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)", "warning");
      return;
    }

    // 2. File size validation (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("حجم الملف كبير جداً. الحد الأقصى هو 5 ميجابايت", "warning");
      return;
    }

    // Attempt Supabase Storage Upload
    try {
      const targetCompId = editingComp?.id || `comp_${Date.now()}`;
      const fileExt = file.name.split(".").pop() || "png";
      const filePath = `logos/${targetCompId}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file, { upsert: true });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from("company-logos")
          .getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) {
          setter(publicUrlData.publicUrl);
          showToast("تم رفع وتحديث شعار الشركة في Supabase Storage بنجاح", "success");
          return;
        }
      }
    } catch (err) {
      console.warn("Supabase storage bucket read fallback:", err);
    }

    // Fallback: Read & optimize as canvas data URL (100% persistent in Supabase DB)
    const reader = new FileReader();
    reader.onerror = () => {
      showToast("حدث خطأ أثناء قراءة الصورة المختارة", "error");
    };
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onerror = () => {
        showToast("تنسيق الصورة غير صالح أو محتوى تالف", "error");
      };
      img.onload = () => {
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL("image/png", 0.9);
          setter(optimizedDataUrl);
          showToast("تمت معالجة وتثبيت الشعار بنجاح", "success");
        } else {
          setter(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCompany({
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      monthlyTarget: monthlyTarget || 300000,
      annualTarget: annualTarget || (monthlyTarget ? monthlyTarget * 12 : 3600000),
      color,
      secondaryColor,
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-900",
      active: true,
      logoText: name.trim().substring(0, 2),
      logoUrl: logoUrl || undefined,
      userRoles: currentUser ? { [currentUser.id]: "owner" } : {},
      userTargets: {},
      servicePlan,
      monthlyServicePrice: Number(monthlyServicePrice) || 0,
      serviceStartDate,
      serviceStatus,
      billingCycle,
      serviceNotes,
      address,
    });

    setName("");
    setNameEn("");
    setPhone("");
    setEmail("");
    setAddress("");
    setLogoUrl("");
    setServicePlan("لوحة تحكم احترافية للشركات");
    setMonthlyServicePrice(3500);
    setServiceStartDate(new Date().toISOString().split("T")[0]);
    setServiceStatus("Active");
    setBillingCycle("Monthly");
    setServiceNotes("");
    setShowAdd(false);
  };

  const openEditModal = (
    comp: Company,
    tab: "identity" | "targets" | "users" | "preview" = "identity"
  ) => {
    setEditingComp({
      ...comp,
      logoUrl: comp.logoUrl || undefined,
    });
    setActiveTabInModal(tab);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComp) return;

    updateCompany(editingComp.id, {
      name: editingComp.name,
      nameEn: editingComp.nameEn,
      phone: editingComp.phone,
      email: editingComp.email,
      monthlyTarget: editingComp.monthlyTarget,
      annualTarget: editingComp.annualTarget || editingComp.monthlyTarget * 12,
      color: editingComp.color,
      secondaryColor: editingComp.secondaryColor || "#111111",
      logoUrl: editingComp.logoUrl || undefined,
      active: editingComp.active,
      servicePlan: editingComp.servicePlan,
      monthlyServicePrice: editingComp.monthlyServicePrice !== undefined ? Number(editingComp.monthlyServicePrice) : undefined,
      serviceStartDate: editingComp.serviceStartDate,
      serviceStatus: editingComp.serviceStatus,
      billingCycle: editingComp.billingCycle,
      serviceNotes: editingComp.serviceNotes,
      address: editingComp.address,
    });
    showToast("تم تحديث بيانات الشركة وشعارها بنجاح", "success");
    setEditingComp(null);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      deleteCompany(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  // Check if a user belongs to this company
  const getCompanyUsers = (comp: Company): { user: AppUser; role: CompanyRole; target?: number }[] => {
    return users
      .filter(
        (u) =>
          u.allowedCompanyIds.includes("all") ||
          u.allowedCompanyIds.includes(comp.id) ||
          (u.companyRoles && u.companyRoles[comp.id]) ||
          (comp.userRoles && comp.userRoles[u.id])
      )
      .map((u) => {
        const role = getUserRoleInCompany(u, comp.id);
        const target = comp.userTargets?.[u.id];
        return { user: u, role, target };
      });
  };

  const baseCompanies = useMemo(() => {
    return allCompanies && allCompanies.length > 0 ? allCompanies : companies;
  }, [allCompanies, companies]);

  const activeCount = useMemo(() => baseCompanies.filter(c => c.active !== false && c.status !== 'archived' && c.status !== 'closed').length, [baseCompanies]);
  const disabledCount = useMemo(() => baseCompanies.filter(c => c.active === false && c.status !== 'archived').length, [baseCompanies]);
  const archivedCount = useMemo(() => baseCompanies.filter(c => c.status === 'archived' || c.status === 'closed').length, [baseCompanies]);

  const filteredCompanies = useMemo(() => {
    return baseCompanies.filter((c) => {
      if (statusTab === 'active') return c.active !== false && c.status !== 'archived' && c.status !== 'closed';
      if (statusTab === 'disabled') return c.active === false && c.status !== 'archived';
      if (statusTab === 'archived') return c.status === 'archived' || c.status === 'closed';
      return true;
    });
  }, [baseCompanies, statusTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#C8A75A]" />
            <span>إدارة الشركات والهوية المؤسسية (Company Management)</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280]">
            تخصيص الهوية والشعار والألوان، ضبط الأهداف البيعية وإدارة صلاحيات المستخدمين لكل شركة
          </p>
        </div>

        {hasPermission("manage_company_settings") && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شركة جديدة</span>
          </button>
        )}
      </div>

      {/* Company Status Tabs */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#292B2E] pt-1">
          <button
            onClick={() => setStatusTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === 'all'
                ? 'bg-[#C8A75A] text-black shadow-xs'
                : 'bg-[#18191B] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            جميع الشركات ({baseCompanies.length})
          </button>
          <button
            onClick={() => setStatusTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-[#18191B] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            الشركات النشطة 🟢 ({activeCount})
          </button>
          <button
            onClick={() => setStatusTab('disabled')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === 'disabled'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-[#18191B] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            الشركات المعطلة 🟡 ({disabledCount})
          </button>
          <button
            onClick={() => setStatusTab('archived')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusTab === 'archived'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-[#18191B] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            الشركات المؤرشفة 🔴 ({archivedCount})
          </button>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map((comp) => {
          // Customers & Sales isolated to this company
          const compCustomers = customers.filter((c) => c.companyId === comp.id);
          const compSales = sales.filter((s) => s.companyId === comp.id);
          const totalSales = compSales.reduce((acc, s) => acc + s.amount, 0);
          const currentMonthPrefix = new Date().toISOString().substring(0, 7);
          const monthSales = compSales
            .filter((s) => s.date && s.date.startsWith(currentMonthPrefix))
            .reduce((acc, s) => acc + s.amount, 0);

          const target = comp.monthlyTarget || 300000;
          const pct = Math.min(100, Math.round((monthSales / target) * 100));
          const remaining = Math.max(0, target - monthSales);
          const companyUsersList = getCompanyUsers(comp);
          const compEmployees = employees.filter((e) => e.companyId === comp.id);
          const isArchived = comp.status === "archived" || comp.status === "closed";

          return (
            <div
              key={comp.id}
              className={`bg-white rounded-3xl border shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${
                isArchived ? "border-amber-200/80 bg-stone-50/50 opacity-95" : "border-[#EAEAEA]"
              }`}
            >
              {/* Top Accent Band with Brand Colors */}
              <div
                className="h-3 w-full"
                style={{
                  background: isArchived
                    ? "#9CA3AF"
                    : `linear-gradient(to left, ${comp.color}, ${
                        comp.secondaryColor || "#111111"
                      })`,
                }}
              />

              <div className="p-5 space-y-4">
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CompanyLogo company={comp} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-[#111111]">{comp.name}</h3>
                        {isArchived && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                            مؤرشفة
                          </span>
                        )}
                      </div>
                      {comp.nameEn && (
                        <span className="text-[11px] text-[#9CA3AF] font-mono block">
                          {comp.nameEn}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: comp.color }}
                        />
                        <span className="text-[11px] text-[#6B7280] font-mono">
                          {comp.color}
                        </span>
                        {comp.secondaryColor && (
                          <>
                            <span
                              className="w-2.5 h-2.5 rounded-full ml-1"
                              style={{ backgroundColor: comp.secondaryColor }}
                            />
                            <span className="text-[11px] text-[#6B7280] font-mono">
                              {comp.secondaryColor}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Edit / Archive / Restore / Delete) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(comp, "identity")}
                      className="p-1.5 text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5] rounded-xl transition-colors cursor-pointer"
                      title="إدارة بيانات وهوية وموظفي الشركة"
                    >
                      <Settings className="w-4 h-4" />
                    </button>

                    {hasPermission("manage_company_settings") && (
                      <>
                        {isArchived ? (
                          <button
                            onClick={() => restoreCompany(comp.id)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                            title="استعادة الشركة وتفعيلها بنفس البيانات"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => archiveCompany(comp.id)}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                            title="أرشفة الشركة وحفظ كافة بياناتها"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}

                    {companies.length > 1 && hasPermission("manage_company_settings") && (
                      <button
                        onClick={() => setDeleteTargetId(comp.id)}
                        className="p-1.5 text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="حذف الشركة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Company Status & Phone */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#F0F0EE]">
                  <div className="flex items-center gap-1 text-[#6B7280]">
                    <Phone className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    <span>{comp.phone || "بدون رقم مسجل"}</span>
                  </div>
                  {isArchived ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-300 flex items-center gap-1">
                      <Archive className="w-3 h-3 text-stone-500" />
                      <span>مؤرشفة (محفوظة)</span>
                    </span>
                  ) : comp.active !== false ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"></span>
                      <span>مفعلة للنظام</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block"></span>
                      <span>معطلة مؤقتًا</span>
                    </span>
                  )}
                </div>

                {/* Statistics Box */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-[#F8F8F5] rounded-2xl border border-[#F0F0EE] text-xs text-center">
                  <div>
                    <span className="text-[#6B7280] text-[11px] block">عملاء</span>
                    <strong className="text-sm font-bold text-[#111111]">
                      {compCustomers.length}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#6B7280] text-[11px] block">موظفون</span>
                    <strong className="text-sm font-bold text-[#111111]">
                      {compEmployees.length}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#6B7280] text-[11px] block">المبيعات</span>
                    <strong className="text-sm font-bold text-[#C8A75A] font-mono">
                      {totalSales.toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Monthly Target & Performance */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#111111] flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-[#C8A75A]" />
                      <span>الهدف الشهري الحالي:</span>
                    </span>
                    <strong className="font-mono text-[#111111]">
                      {target.toLocaleString()} ج.م
                    </strong>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#EAEAEA] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: comp.color,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#6B7280] font-mono">
                    <span>المحقق هذا الشهر: {monthSales.toLocaleString()} ج.م ({pct}%)</span>
                    <span>المتبقي: {remaining.toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* Users Badge & Team Preview */}
                <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-2 border-t border-[#F0F0EE]">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#C8A75A]" />
                    <span>فريق العمل:</span>
                    <strong className="text-[#111111] font-bold">
                      {companyUsersList.length} مستخدم
                    </strong>
                  </div>
                  <span className="text-[10px] text-stone-500">
                    صلاحيات Company-Scoped
                  </span>
                </div>
              </div>

              {/* Bottom Quick Actions */}
              <div className="p-3 bg-[#FAFAFA] border-t border-[#EAEAEA] flex items-center justify-between gap-2">
                <button
                  onClick={() => openEditModal(comp, "users")}
                  className="text-xs text-[#111111] hover:text-[#C8A75A] font-bold flex items-center gap-1.5 cursor-pointer py-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>إدارة المستخدمين والأدوار</span>
                </button>

                <button
                  onClick={() => openEditModal(comp, "identity")}
                  className="text-xs text-[#6B7280] hover:text-[#111111] flex items-center gap-1 cursor-pointer py-1"
                >
                  <Palette className="w-3.5 h-3.5 text-[#C8A75A]" />
                  <span>الهوية والشعار</span>
                </button>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Edit Company Modal with Complete Management */}
      {editingComp && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#EAEAEA] overflow-hidden my-6 animate-in fade-in">
            {/* Modal Header */}
            <div className="p-5 bg-[#111111] text-white flex items-center justify-between border-b border-[#222222]">
              <div className="flex items-center gap-3">
                <CompanyLogo company={editingComp} size="md" />
                <div>
                  <h3 className="font-bold text-sm">
                    إدارة شركة: {editingComp.name}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    الهوية المؤسسية، الأهداف البيعية، وإدارة فريق العمل والصلاحيات
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingComp(null)}
                className="text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center border-b border-[#EAEAEA] bg-[#F8F8F5] px-4 text-xs font-bold">
              <button
                onClick={() => setActiveTabInModal("identity")}
                className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTabInModal === "identity"
                    ? "border-[#C8A75A] text-[#111111]"
                    : "border-transparent text-[#6B7280] hover:text-[#111111]"
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>الهوية والشعار</span>
              </button>

              <button
                onClick={() => setActiveTabInModal("employees")}
                className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTabInModal === "employees"
                    ? "border-[#C8A75A] text-[#111111]"
                    : "border-transparent text-[#6B7280] hover:text-[#111111]"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>
                  الموظفون والرواتب (
                  {employees.filter((e) => e.companyId === editingComp.id).length})
                </span>
              </button>

              <button
                onClick={() => setActiveTabInModal("targets")}
                className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTabInModal === "targets"
                    ? "border-[#C8A75A] text-[#111111]"
                    : "border-transparent text-[#6B7280] hover:text-[#111111]"
                }`}
              >
                <Target className="w-4 h-4" />
                <span>الأهداف البيعية</span>
              </button>

              <button
                onClick={() => setActiveTabInModal("users")}
                className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTabInModal === "users"
                    ? "border-[#C8A75A] text-[#111111]"
                    : "border-transparent text-[#6B7280] hover:text-[#111111]"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>المستخدمون والصلاحيات</span>
              </button>

              <button
                onClick={() => setActiveTabInModal("preview")}
                className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTabInModal === "preview"
                    ? "border-[#C8A75A] text-[#111111]"
                    : "border-transparent text-[#6B7280] hover:text-[#111111]"
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>معاينة الهوية (Live Preview)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Tab 1: Identity & Brand */}
              {activeTabInModal === "identity" && (
                <form onSubmit={handleUpdate} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-[#111111]">اسم الشركة (بالعربية) *:</label>
                      <input
                        type="text"
                        required
                        value={editingComp.name}
                        onChange={(e) =>
                          setEditingComp({ ...editingComp, name: e.target.value })
                        }
                        className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold focus:border-[#C8A75A] outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#111111]">اسم الشركة (بالانجليزية):</label>
                      <input
                        type="text"
                        value={editingComp.nameEn || ""}
                        onChange={(e) =>
                          setEditingComp({ ...editingComp, nameEn: e.target.value })
                        }
                        placeholder="e.g. Nesta UPVC"
                        className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono focus:border-[#C8A75A] outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Logo Upload / URL */}
                  <div className="space-y-2 p-4 bg-[#F8F8F5] rounded-2xl border border-[#EAEAEA]">
                    <label className="font-bold text-[#111111] block">
                      شعار الشركة (Logo):
                    </label>
                    <div className="flex items-center gap-4">
                      <CompanyLogo company={editingComp} size="xl" />
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EAEAEA] hover:border-[#C8A75A] text-[#111111] rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
                          >
                            <Upload className="w-3.5 h-3.5 text-[#C8A75A]" />
                            <span>رفع صورة من الجهاز</span>
                          </button>
                          {editingComp.logoUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingComp({ ...editingComp, logoUrl: undefined });
                                showToast("تم إزالة الشعار (احفظ التغييرات للتأكيد)", "info");
                              }}
                              className="text-rose-600 hover:underline text-[11px] font-bold"
                            >
                              إزالة الشعار
                            </button>
                          )}
                        </div>
                        <input
                          ref={editFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(e, (url) => {
                              setEditingComp((prev) => (prev ? { ...prev, logoUrl: url } : null));
                            })
                          }
                        />
                        <input
                          type="text"
                          value={editingComp.logoUrl || ""}
                          onChange={(e) =>
                            setEditingComp({ ...editingComp, logoUrl: e.target.value })
                          }
                          placeholder="أو ضع رابط مباشر للصورة (URL)..."
                          className="w-full p-2 bg-white border border-[#EAEAEA] rounded-xl text-[11px] font-mono focus:border-[#C8A75A] outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Colors: Primary and Secondary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-[#111111]">
                        اللون الأساسي (Primary Color):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingComp.color}
                          onChange={(e) =>
                            setEditingComp({ ...editingComp, color: e.target.value })
                          }
                          className="w-10 h-10 p-1 rounded-xl border border-[#EAEAEA] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editingComp.color}
                          onChange={(e) =>
                            setEditingComp({ ...editingComp, color: e.target.value })
                          }
                          className="w-28 p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#111111]">
                        اللون الثانوي (Secondary Color):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingComp.secondaryColor || "#111111"}
                          onChange={(e) =>
                            setEditingComp({
                              ...editingComp,
                              secondaryColor: e.target.value,
                            })
                          }
                          className="w-10 h-10 p-1 rounded-xl border border-[#EAEAEA] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editingComp.secondaryColor || "#111111"}
                          onChange={(e) =>
                            setEditingComp({
                              ...editingComp,
                              secondaryColor: e.target.value,
                            })
                          }
                          className="w-28 p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone, Email & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-[#111111]">هاتف الشركة:</label>
                      <input
                        type="text"
                        value={editingComp.phone}
                        onChange={(e) =>
                          setEditingComp({ ...editingComp, phone: e.target.value })
                        }
                        className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl focus:border-[#C8A75A] outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#111111]">البريد الإلكتروني للشركة:</label>
                      <input
                        type="email"
                        value={editingComp.email || ""}
                        onChange={(e) =>
                          setEditingComp({ ...editingComp, email: e.target.value })
                        }
                        placeholder="info@company.com"
                        className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl focus:border-[#C8A75A] outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#111111]">عنوان وموقع الشركة:</label>
                      <input
                        type="text"
                        value={editingComp.address || ""}
                        onChange={(e) =>
                          setEditingComp({ ...editingComp, address: e.target.value })
                        }
                        placeholder="مثال: التجمع الخامس، القاهرة"
                        className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl focus:border-[#C8A75A] outline-hidden"
                      />
                    </div>
                  </div>

                  {/* NESTA Service Plan & Billing Contract */}
                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-3">
                    <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5 border-b border-amber-200/40 pb-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <span>تفاصيل باقة وعقد خدمة NESTA للشركة</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-amber-900">باقة الخدمة (Service Plan):</label>
                        <input
                          type="text"
                          value={editingComp.servicePlan || ""}
                          onChange={(e) =>
                            setEditingComp({ ...editingComp, servicePlan: e.target.value })
                          }
                          placeholder="مثال: لوحة تحكم احترافية للشركات"
                          className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-500 outline-hidden"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-amber-900">سعر الخدمة الشهري للشركة (ج.م):</label>
                        <input
                          type="number"
                          value={editingComp.monthlyServicePrice || ""}
                          onChange={(e) =>
                            setEditingComp({ ...editingComp, monthlyServicePrice: Number(e.target.value) || 0 })
                          }
                          placeholder="3500"
                          className="w-full p-2 bg-white border border-amber-200 rounded-xl font-mono focus:border-amber-500 outline-hidden"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-amber-900">تاريخ بدء العقد:</label>
                        <input
                          type="date"
                          value={editingComp.serviceStartDate || ""}
                          onChange={(e) =>
                            setEditingComp({ ...editingComp, serviceStartDate: e.target.value })
                          }
                          className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-500 outline-hidden text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-amber-900">دورة الفوترة:</label>
                        <select
                          value={editingComp.billingCycle || "Monthly"}
                          onChange={(e) =>
                            setEditingComp({ ...editingComp, billingCycle: e.target.value as any })
                          }
                          className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-500 outline-hidden"
                        >
                          <option value="Monthly">شهري (Monthly)</option>
                          <option value="Quarterly">ربع سنوي (Quarterly)</option>
                          <option value="Yearly">سنوي (Yearly)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-amber-900">حالة خطة الخدمة:</label>
                        <select
                          value={editingComp.serviceStatus || "Active"}
                          onChange={(e) =>
                            setEditingComp({ ...editingComp, serviceStatus: e.target.value as any })
                          }
                          className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-500 outline-hidden"
                        >
                          <option value="Active">نشط (Active)</option>
                          <option value="Paused">موقوف مؤقتاً (Paused)</option>
                          <option value="Cancelled">ملغى (Cancelled)</option>
                          <option value="Expired">منتهي الصلاحية (Expired)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-amber-900">ميزانية الإعلانات الشهرية (ج.م):</label>
                        <input
                          type="number"
                          value={editingComp.monthlyAdvertisingBudget || ""}
                          onChange={(e) =>
                            setEditingComp({ ...editingComp, monthlyAdvertisingBudget: Number(e.target.value) || 0 })
                          }
                          placeholder="20000"
                          className="w-full p-2 bg-white border border-amber-200 rounded-xl font-mono focus:border-amber-500 outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-amber-900">ملاحظات العقد والخدمة:</label>
                      <textarea
                        rows={2}
                        value={editingComp.serviceNotes || ""}
                        onChange={(e) =>
                          setEditingComp({ ...editingComp, serviceNotes: e.target.value })
                        }
                        placeholder="تفاصيل إضافية حول عقد تقديم الخدمة والدعم الفني والمبيعات..."
                        className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-500 outline-hidden resize-none"
                      />
                    </div>
                  </div>

                  {/* Status checkbox */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-[#111111]">
                        حالة التفعيل للمستخدم الحالي:
                      </label>
                      <div className="flex items-center gap-3 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold">
                          <input
                            type="checkbox"
                            checked={editingComp.active !== false}
                            onChange={(e) =>
                              setEditingComp({
                                ...editingComp,
                                active: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-[#C8A75A] rounded-md cursor-pointer"
                          />
                          <span>تفعيل الشركة في القوائم والمبيعات</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-[#F0F0EE]">
                    <button
                      type="button"
                      onClick={() => setEditingComp(null)}
                      className="px-4 py-2 text-[#6B7280] rounded-xl cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      حفظ بيانات الهوية
                    </button>
                  </div>
                </form>
              )}

              {/* Tab: Employees & Salaries (الموظفون والرواتب وعمولات المبيعات) */}
              {activeTabInModal === "employees" && (
                <div className="space-y-5 text-xs">
                  {/* Summary Header */}
                  <div className="p-4 bg-[#F8F8F5] border border-[#EAEAEA] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-[#111111]">
                        <Users className="w-4 h-4 text-[#C8A75A]" />
                        <span className="text-sm">إدارة موظفي شركة {editingComp.name}</span>
                      </div>
                      <p className="text-[11px] text-[#6B7280]">
                        تحديد الراتب الأساسي الشهري، قواعد احتساب العمولات، تاريخ البداية، وحالة النشاط.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (showAddEmployeeForm && !editingEmployeeId) {
                          resetEmployeeForm();
                        } else {
                          resetEmployeeForm();
                          setShowAddEmployeeForm(true);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{showAddEmployeeForm && !editingEmployeeId ? "إغلاق النموذج" : "إضافة موظف جديد"}</span>
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  {(() => {
                    const compEmps = employees.filter((e) => e.companyId === editingComp.id);
                    const activeEmps = compEmps.filter((e) => e.active !== false);
                    const totalMonthlySalary = compEmps.reduce((acc, curr) => acc + (Number(curr.monthlySalary) || 0), 0);

                    return (
                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="p-3 bg-white border border-[#EAEAEA] rounded-xl shadow-2xs">
                          <span className="text-[10px] text-[#6B7280] block">إجمالي الموظفين</span>
                          <strong className="text-base font-bold text-[#111111]">{compEmps.length}</strong>
                        </div>
                        <div className="p-3 bg-white border border-[#EAEAEA] rounded-xl shadow-2xs">
                          <span className="text-[10px] text-[#6B7280] block">الموظفون النشطون</span>
                          <strong className="text-base font-bold text-emerald-600">{activeEmps.length}</strong>
                        </div>
                        <div className="p-3 bg-white border border-[#EAEAEA] rounded-xl shadow-2xs">
                          <span className="text-[10px] text-[#6B7280] block">إجمالي مسير الرواتب</span>
                          <strong className="text-base font-bold text-[#C8A75A] font-mono">
                            {totalMonthlySalary.toLocaleString()} ج.م
                          </strong>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Add / Edit Employee Form */}
                  {showAddEmployeeForm && (
                    <form onSubmit={handleSaveEmployee} className="p-4 bg-white border-2 border-[#C8A75A]/40 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-[#F0F0EE]">
                        <h4 className="font-bold text-sm text-[#111111] flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-[#C8A75A]" />
                          <span>{editingEmployeeId ? "تعديل بيانات الموظف" : "إضافة موظف جديد للشركة"}</span>
                        </h4>
                        <button
                          type="button"
                          onClick={resetEmployeeForm}
                          className="text-[#9CA3AF] hover:text-[#111111] cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-[#111111]">اسم الموظف *:</label>
                          <input
                            type="text"
                            required
                            value={empName}
                            onChange={(e) => setEmpName(e.target.value)}
                            placeholder="مثال: أحمد محمود"
                            className="w-full p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold focus:border-[#C8A75A] outline-hidden"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#111111]">المسمى الوظيفي / الدور *:</label>
                          <input
                            type="text"
                            required
                            value={empRole}
                            onChange={(e) => setEmpRole(e.target.value)}
                            placeholder="مهندس مبيعات / فني تركيبات / مشرف..."
                            className="w-full p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl focus:border-[#C8A75A] outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-[#111111]">رقم الهاتف:</label>
                          <input
                            type="tel"
                            value={empPhone}
                            onChange={(e) => setEmpPhone(e.target.value)}
                            placeholder="010XXXXXXXX"
                            className="w-full p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono focus:border-[#C8A75A] outline-hidden"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#111111]">البريد الإلكتروني:</label>
                          <input
                            type="email"
                            value={empEmail}
                            onChange={(e) => setEmpEmail(e.target.value)}
                            placeholder="employee@example.com"
                            className="w-full p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono focus:border-[#C8A75A] outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#F0F0EE]">
                        <div className="space-y-1">
                          <label className="font-bold text-[#111111]">الراتب الأساسي الشهري (ج.م) *:</label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              step={500}
                              required
                              value={empSalary}
                              onChange={(e) => setEmpSalary(Number(e.target.value))}
                              className="w-full p-2 pl-12 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono font-bold text-[#111111] focus:border-[#C8A75A] outline-hidden"
                            />
                            <span className="absolute left-3 top-2.5 text-[11px] font-bold text-[#6B7280]">
                              ج.م
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#111111]">تاريخ بداية العمل / التعيين:</label>
                          <input
                            type="date"
                            value={empStartDate}
                            onChange={(e) => setEmpStartDate(e.target.value)}
                            className="w-full p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono focus:border-[#C8A75A] outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Commission Rules Configuration */}
                      <div className="p-3.5 bg-[#F8F8F5] rounded-xl border border-[#EAEAEA] space-y-3">
                        <div className="flex items-center gap-2 font-bold text-[#111111]">
                          <Award className="w-4 h-4 text-[#C8A75A]" />
                          <span>إعدادات ونظام العمولة (Commission Rules):</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-[#6B7280]">قاعدة الاحتساب:</label>
                            <select
                              value={empCommissionRule}
                              onChange={(e) => setEmpCommissionRule(e.target.value as any)}
                              className="w-full p-2 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold focus:border-[#C8A75A] outline-hidden cursor-pointer"
                            >
                              <option value="percentage_of_contract">نسبة من إجمالي قيمة العقد</option>
                              <option value="percentage_of_collection">نسبة من المبالغ المحصلة فعلياً</option>
                              <option value="fixed_per_contract">مبلغ ثابت لكل عقد مبرم</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-[#6B7280]">
                              {empCommissionRule === "fixed_per_contract" ? "قيمة العمولة (ج.م):" : "نسبة العمولة (%):"}
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={empCommissionRule === "fixed_per_contract" ? 100 : 0.25}
                              value={empCommissionPercentage}
                              onChange={(e) => setEmpCommissionPercentage(Number(e.target.value))}
                              className="w-full p-2 bg-white border border-[#EAEAEA] rounded-xl font-mono font-bold text-xs focus:border-[#C8A75A] outline-hidden"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-[#6B7280]">توقيت الصرف والاستحقاق:</label>
                            <select
                              value={empCommissionTiming}
                              onChange={(e) => setEmpCommissionTiming(e.target.value as any)}
                              className="w-full p-2 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold focus:border-[#C8A75A] outline-hidden cursor-pointer"
                            >
                              <option value="contract_signing">عند توقيع العقد</option>
                              <option value="down_payment">عند سداد الدفعة المقدمة</option>
                              <option value="full_collection">عند اكتمال التحصيل</option>
                              <option value="custom">مخصص حسب الاتفاق</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#6B7280]">ملاحظات وشروط خاصة بالعمولة:</label>
                          <input
                            type="text"
                            value={empCommissionNotes}
                            onChange={(e) => setEmpCommissionNotes(e.target.value)}
                            placeholder="مثال: تستحق العمولة بعد اعتماد مهندس الجودة..."
                            className="w-full p-2 bg-white border border-[#EAEAEA] rounded-xl text-xs focus:border-[#C8A75A] outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Active Status & Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold">
                          <input
                            type="checkbox"
                            checked={empActive}
                            onChange={(e) => setEmpActive(e.target.checked)}
                            className="w-4 h-4 accent-[#C8A75A] rounded-md cursor-pointer"
                          />
                          <span>الموظف نشط حالياً بالشركة (Active)</span>
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={resetEmployeeForm}
                            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#6B7280] font-bold rounded-xl cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] font-bold rounded-xl shadow-xs cursor-pointer"
                          >
                            {editingEmployeeId ? "حفظ التعديلات" : "إضافة الموظف الآن"}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Employees List Table */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-[#111111] flex items-center justify-between">
                      <span>قائمة موظفي الشركة:</span>
                      <span className="text-[11px] text-[#6B7280]">
                        ({employees.filter((e) => e.companyId === editingComp.id).length} موظف مسجل)
                      </span>
                    </h4>

                    {(() => {
                      const compEmps = employees.filter((e) => e.companyId === editingComp.id);
                      if (compEmps.length === 0) {
                        return (
                          <div className="p-8 text-center bg-[#F8F8F5] border border-dashed border-[#EAEAEA] rounded-2xl space-y-2">
                            <Users className="w-8 h-8 text-[#9CA3AF] mx-auto opacity-50" />
                            <p className="font-bold text-[#111111]">لا يوجد موظفون مسجلون في هذه الشركة حتى الآن</p>
                            <p className="text-[11px] text-[#6B7280]">
                              اضغط على زر "إضافة موظف جديد" لتسجيل الموظفين والرواتب وقواعد العمولات.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {compEmps.map((emp) => {
                            const isEmpActive = emp.active !== false;
                            return (
                              <div
                                key={emp.id}
                                className="p-3.5 bg-white border border-[#EAEAEA] rounded-2xl shadow-2xs hover:border-[#C8A75A]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isEmpActive
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-stone-100 text-stone-500 border border-stone-200"
                                    }`}
                                  >
                                    {emp.name.slice(0, 2)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <strong className="font-bold text-sm text-[#111111]">{emp.name}</strong>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                          isEmpActive
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-stone-100 text-stone-600 border border-stone-200"
                                        }`}
                                      >
                                        {isEmpActive ? "نشط" : "معطل"}
                                      </span>
                                      <span className="text-[11px] text-[#6B7280] font-medium">({emp.role})</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B7280] mt-1">
                                      {emp.phone && (
                                        <span className="flex items-center gap-1 font-mono">
                                          <Phone className="w-3 h-3 text-[#9CA3AF]" />
                                          <span>{emp.phone}</span>
                                        </span>
                                      )}
                                      {emp.startDate && (
                                        <span className="flex items-center gap-1 font-mono">
                                          <Calendar className="w-3 h-3 text-[#9CA3AF]" />
                                          <span>بداية: {emp.startDate}</span>
                                        </span>
                                      )}
                                      {emp.commissionRule && (
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold">
                                          عمولة: {emp.commissionPercentage}
                                          {emp.commissionRule === "fixed_per_contract" ? " ج.م ثابت" : "%"}
                                          {emp.commissionRule === "percentage_of_contract"
                                            ? " (عقد)"
                                            : emp.commissionRule === "percentage_of_collection"
                                            ? " (تحصيل)"
                                            : ""}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F0F0EE]">
                                  <div className="text-right">
                                    <span className="text-[10px] text-[#6B7280] block">الراتب الأساسي</span>
                                    <strong className="text-xs font-mono font-bold text-[#111111]">
                                      {(emp.monthlySalary || 0).toLocaleString()} ج.م
                                    </strong>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => toggleEmployeeStatus(emp.id)}
                                      className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                                        isEmpActive
                                          ? "text-stone-500 hover:text-amber-600 hover:bg-amber-50"
                                          : "text-stone-400 hover:text-emerald-600 hover:bg-emerald-50"
                                      }`}
                                      title={isEmpActive ? "تعطيل الموظف" : "تنشيط الموظف"}
                                    >
                                      {isEmpActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => startEditEmployee(emp)}
                                      className="p-1.5 text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5] rounded-xl transition-colors cursor-pointer"
                                      title="تعديل بيانات الموظف والراتب والعمولة"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Tab 2: Targets (الأهداف البيعية) */}
              {activeTabInModal === "targets" && (
                <div className="space-y-5 text-xs">
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1 text-amber-900">
                    <div className="flex items-center gap-2 font-bold">
                      <Target className="w-4 h-4 text-[#C8A75A]" />
                      <span>الأهداف البيعية الخاصة بالشركة</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      يتم احتساب نسبة الإنجاز والمؤشرات بناءً على المبيعات التابعة لهذه
                      الشركة فقط في الشهر الحالي.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-[#111111]">
                        الهدف البيعي الشهري (ج.م) *:
                      </label>
                      <input
                        type="number"
                        step={10000}
                        value={editingComp.monthlyTarget}
                        onChange={(e) =>
                          setEditingComp({
                            ...editingComp,
                            monthlyTarget: Number(e.target.value),
                          })
                        }
                        className="w-full p-3 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono font-bold text-sm focus:border-[#C8A75A] outline-hidden"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-[#111111]">
                        الهدف البيعي السنوي (ج.م):
                      </label>
                      <input
                        type="number"
                        step={50000}
                        value={
                          editingComp.annualTarget ||
                          editingComp.monthlyTarget * 12
                        }
                        onChange={(e) =>
                          setEditingComp({
                            ...editingComp,
                            annualTarget: Number(e.target.value),
                          })
                        }
                        className="w-full p-3 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono font-bold text-sm focus:border-[#C8A75A] outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Individual Targets per User */}
                  <div className="space-y-3 pt-3 border-t border-[#F0F0EE]">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-[#111111]">
                        أهداف مندوبي المبيعات (Individual Targets):
                      </h4>
                      <span className="text-[11px] text-[#6B7280]">
                        تحديد تارجت منفصل لكل عضو فريق
                      </span>
                    </div>

                    <div className="space-y-2">
                      {getCompanyUsers(editingComp).map(({ user, target }) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-[#F8F8F5] rounded-xl border border-[#EAEAEA]"
                        >
                          <div>
                            <strong className="font-bold text-[#111111] block">
                              {user.name}
                            </strong>
                            <span className="text-[10px] text-[#6B7280] font-mono">
                              {user.email}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#6B7280]">الهدف:</span>
                            <input
                              type="number"
                              step={10000}
                              defaultValue={target || 100000}
                              onBlur={(e) =>
                                updateUserTarget(
                                  editingComp.id,
                                  user.id,
                                  Number(e.target.value)
                                )
                              }
                              className="w-32 p-1.5 bg-white border border-[#EAEAEA] rounded-lg font-mono font-bold text-xs text-center focus:border-[#C8A75A] outline-hidden"
                            />
                            <span className="text-[11px] font-bold text-[#6B7280]">
                              ج.م
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-[#F0F0EE]">
                    <button
                      type="button"
                      onClick={() => {
                        updateCompanyTarget(
                          editingComp.id,
                          editingComp.monthlyTarget,
                          editingComp.annualTarget
                        );
                        setEditingComp(null);
                      }}
                      className="px-6 py-2.5 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      حفظ الأهداف
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Users & Company-Scoped Roles (المستخدمون والصلاحيات) */}
              {activeTabInModal === "users" && (
                <div className="space-y-5 text-xs">
                  {/* Info notice */}
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1 text-emerald-900">
                    <div className="flex items-center gap-2 font-bold">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span>صلاحيات Company-Scoped (خاصة بالشركة)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-emerald-800">
                      يمكن للمستخدم أن يكون (Sales) في شركة و(Manager) أو (Viewer) في شركة
                      أخرى بشكل مستقل تماماً.
                    </p>
                  </div>

                  {/* Add User to Company Form */}
                  <div className="p-4 bg-[#F8F8F5] rounded-2xl border border-[#EAEAEA] space-y-3">
                    <h4 className="font-bold text-xs text-[#111111] flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-[#C8A75A]" />
                      <span>إضافة / تعيين مستخدم في هذه الشركة:</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={selectedUserIdToAdd}
                        onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                        className="p-2 bg-white border border-[#EAEAEA] rounded-xl font-bold focus:border-[#C8A75A] outline-hidden cursor-pointer"
                      >
                        <option value="">-- اختر المستخدم --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedRoleToAdd}
                        onChange={(e) =>
                          setSelectedRoleToAdd(e.target.value as CompanyRole)
                        }
                        className="p-2 bg-white border border-[#EAEAEA] rounded-xl font-bold focus:border-[#C8A75A] outline-hidden cursor-pointer"
                      >
                        <option value="owner">مالك (Owner)</option>
                        <option value="admin">مدير نظام (Admin)</option>
                        <option value="manager">مدير فرع / شركة (Manager)</option>
                        <option value="sales">مسؤول مبيعات (Sales)</option>
                        <option value="viewer">مشاهد فقط (Viewer)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedUserIdToAdd) {
                            showToast("يرجى اختيار المستخدم أولاً", "warning");
                            return;
                          }
                          assignUserCompanyRole(
                            selectedUserIdToAdd,
                            editingComp.id,
                            selectedRoleToAdd
                          );
                          setSelectedUserIdToAdd("");
                        }}
                        className="p-2 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        تعيين الصلاحية
                      </button>
                    </div>
                  </div>

                  {/* Company Users List */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-[#111111]">
                      المستخدمون الحاليون في الشركة ({getCompanyUsers(editingComp).length}):
                    </h4>

                    <div className="space-y-2">
                      {getCompanyUsers(editingComp).map(({ user, role, target }) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#EAEAEA] shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#111111] text-[#C8A75A] font-bold flex items-center justify-center text-xs">
                              {user.name.substring(0, 2)}
                            </div>
                            <div>
                              <strong className="font-bold text-[#111111] block">
                                {user.name}
                              </strong>
                              <span className="text-[10px] text-[#6B7280] font-mono">
                                {user.email}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Role Select */}
                            <select
                              value={role}
                              onChange={(e) =>
                                assignUserCompanyRole(
                                  user.id,
                                  editingComp.id,
                                  e.target.value as CompanyRole
                                )
                              }
                              className="p-1.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-lg font-bold text-xs focus:border-[#C8A75A] outline-hidden cursor-pointer"
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="sales">Sales</option>
                              <option value="viewer">Viewer</option>
                            </select>

                            {/* Remove button */}
                            <button
                              onClick={() => removeUserFromCompany(user.id, editingComp.id)}
                              className="p-1.5 text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="إزالة المستخدم من هذه الشركة"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Live Identity Preview (معاينة الهوية) */}
              {activeTabInModal === "preview" && (
                <div className="space-y-5 text-xs">
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-stone-700">
                    <h4 className="font-bold text-xs mb-1">
                      معاينة حية لشكل هوية الشركة داخل النظام:
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      هكذا ستظهر الشركة في شريط التنقل العلوي، عروض الأسعار المطبوعة،
                      وبطاقات العملاء.
                    </p>
                  </div>

                  {/* Preview Banner Mockup */}
                  <div className="rounded-3xl border border-[#EAEAEA] overflow-hidden shadow-md bg-white">
                    {/* Header Bar */}
                    <div
                      className="p-5 text-white flex items-center justify-between"
                      style={{
                        background: `linear-gradient(135deg, ${
                          editingComp.secondaryColor || "#111111"
                        } 0%, ${editingComp.color} 100%)`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <CompanyLogo company={editingComp} size="lg" />
                        <div>
                          <h2 className="text-lg font-black">{editingComp.name}</h2>
                          {editingComp.nameEn && (
                            <p className="text-xs opacity-80 font-mono">
                              {editingComp.nameEn}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-left font-mono">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-xs">
                          {editingComp.phone || "01000000000"}
                        </span>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="p-5 space-y-3 bg-[#F8F8F5]">
                      <div className="flex items-center justify-between">
                        <span
                          className="px-3 py-1 rounded-xl text-xs font-black"
                          style={{
                            backgroundColor: `${editingComp.color}20`,
                            color: editingComp.color,
                            border: `1px solid ${editingComp.color}40`,
                          }}
                        >
                          عرض سعر رسمي — Quotation #1002
                        </span>
                        <span className="font-bold text-xs text-[#111111]">
                          قطاعات UPVC ألمانية المنشأ
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] space-y-2">
                        <div className="flex justify-between font-bold text-xs text-[#111111]">
                          <span>إجمالي عرض السعر للعميل:</span>
                          <span
                            className="font-mono text-sm"
                            style={{ color: editingComp.color }}
                          >
                            125,000 ج.م
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B7280]">
                          يشمل التصنيع، الزجاج المزدوج الدبل، والإكسسوارات والتركيب وضمان 10 سنوات.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#EAEAEA] overflow-hidden animate-in fade-in">
            <div className="p-4 bg-[#111111] text-white flex items-center justify-between border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#C8A75A]" />
                <h3 className="font-bold text-sm">إضافة شركة جديدة للنظام</h3>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="text-xs">
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-[#111111]">اسم الشركة بالعربية *:</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: شركة النور للألوميتال وUPVC"
                      className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold focus:border-[#C8A75A] outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#111111]">اسم الشركة بالإنجليزية:</label>
                    <input
                      type="text"
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      placeholder="e.g. Al-Noor Aluminium & UPVC"
                      className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono focus:border-[#C8A75A] outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-[#111111]">رقم هاتف الشركة:</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl focus:border-[#C8A75A] outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#111111]">البريد الإلكتروني:</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@company.com"
                      className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl focus:border-[#C8A75A] outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#111111]">عنوان وموقع الشركة:</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="العنوان أو المنطقة"
                      className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl focus:border-[#C8A75A] outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[#111111]">الهدف الشهري (ج.م) *:</label>
                    <input
                      type="number"
                      step={10000}
                      required
                      value={monthlyTarget}
                      onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                      className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono font-bold focus:border-[#C8A75A] outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#111111]">الهدف السنوي (ج.م):</label>
                    <input
                      type="number"
                      step={50000}
                      value={annualTarget}
                      onChange={(e) => setAnnualTarget(Number(e.target.value))}
                      className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono font-bold focus:border-[#C8A75A] outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[#111111]">اللون الأساسي:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-9 h-9 p-1 rounded-xl border border-[#EAEAEA] cursor-pointer"
                      />
                      <span className="font-mono text-[11px] text-[#6B7280]">{color}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#111111]">اللون الثانوي:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-9 h-9 p-1 rounded-xl border border-[#EAEAEA] cursor-pointer"
                      />
                      <span className="font-mono text-[11px] text-[#6B7280]">
                        {secondaryColor}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-1">
                  <label className="font-bold text-[#111111]">شعار الشركة:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addFileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-[#F8F8F5] border border-[#EAEAEA] hover:border-[#C8A75A] rounded-xl cursor-pointer text-xs font-bold"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#C8A75A]" />
                      <span>رفع صورة الشعار</span>
                    </button>
                    <input
                      ref={addFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, setLogoUrl)}
                    />
                  </div>
                  {logoUrl && (
                    <p className="text-[10px] text-emerald-600 font-bold">
                      ✓ تم اختيار صورة الشعار بنجاح
                    </p>
                  )}
                </div>

                {/* NESTA Service Plan Fields (Add) */}
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-3">
                  <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5 border-b border-amber-200/40 pb-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>بيانات باقة وعقد خدمة NESTA للشركة الجديدة</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-amber-900">باقة الخدمة (Service Plan):</label>
                      <input
                        type="text"
                        value={servicePlan}
                        onChange={(e) => setServicePlan(e.target.value)}
                        placeholder="لوحة تحكم احترافية للشركات"
                        className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-500 outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-amber-900">سعر الخدمة الشهري (ج.م):</label>
                      <input
                        type="number"
                        value={monthlyServicePrice}
                        onChange={(e) => setMonthlyServicePrice(Number(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-amber-200 rounded-xl font-mono focus:border-amber-500 outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-amber-900">تاريخ بدء العقد:</label>
                      <input
                        type="date"
                        value={serviceStartDate}
                        onChange={(e) => setServiceStartDate(e.target.value)}
                        className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-500 outline-hidden text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-amber-900">دورة الفوترة:</label>
                      <select
                        value={billingCycle}
                        onChange={(e) => setBillingCycle(e.target.value as any)}
                        className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-500 outline-hidden"
                      >
                        <option value="Monthly">شهري (Monthly)</option>
                        <option value="Quarterly">ربع سنوي (Quarterly)</option>
                        <option value="Yearly">سنوي (Yearly)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-amber-900">ملاحظات باقة الخدمة:</label>
                    <textarea
                      rows={2}
                      value={serviceNotes}
                      onChange={(e) => setServiceNotes(e.target.value)}
                      placeholder="تفاصيل إضافية حول عقد تقديم الخدمة والدعم الفني والمبيعات..."
                      className="w-full p-2 bg-white border border-amber-200 rounded-xl focus:border-amber-500 outline-hidden resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#F8F8F5] flex justify-end gap-2 border-t border-[#F0F0EE]">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-[#6B7280] hover:text-[#111111] rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ الشركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 text-center space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#111111]">تأكيد حذف الشركة</h3>
              <p className="text-xs text-[#6B7280]">
                هل أنت متأكد من رغبتك في حذف هذه الشركة من النظام؟
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-2 text-xs font-bold text-[#6B7280] hover:text-[#111111] rounded-xl bg-[#F8F8F5] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 text-xs font-bold text-white rounded-xl bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
