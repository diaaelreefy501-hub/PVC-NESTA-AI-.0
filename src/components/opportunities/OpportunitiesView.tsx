import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import {
  Opportunity,
  Customer,
  CustomerScope,
  CustomerSource,
  OpportunityStage,
  OpportunityStatus,
  CompanyId,
} from "../../types";
import { OPPORTUNITY_STAGES_CONFIG } from "../../utils/salesOperations";
import { CloseDealModal } from "./CloseDealModal";
import { EditOpportunityModal } from "./EditOpportunityModal";
import { CompanyIdentity } from "../common/CompanyIdentity";
import {
  User,
  Users,
  X,
  AlertCircle,
  Building2,
  Phone,
  MapPin,
  CheckCircle2,
  UserPlus,
  FileText,
  Target,
  Plus,
  Search,
  Filter,
  CheckSquare,
  Square,
  Trophy,
  XCircle,
  DollarSign,
  Calendar,
  ChevronDown,
  Trash2,
  Edit2,
  ArrowUpDown,
  Tag,
  Share2,
  Clock,
  LayoutGrid,
  Table as TableIcon,
  MessageSquare,
  CalendarDays,
  ExternalLink,
  Link2,
} from "lucide-react";

const CreateCustomerFromOppModal: React.FC<{
  isOpen: boolean;
  opportunity: Opportunity;
  onClose: () => void;
  onSuccess: (newCust: Customer) => void;
}> = ({ isOpen, opportunity, onClose, onSuccess }) => {
  const {
    customers,
    companies,
    addCustomer,
    updateOpportunity,
    updateInquiry,
    updateQuotation,
    showToast,
    activeCompanyId,
  } = useApp();

  const [name, setName] = useState(
    opportunity.customerName || opportunity.title || "عميل جديد"
  );
  const [phone, setPhone] = useState(opportunity.customerPhone || "");
  const [area, setArea] = useState(opportunity.area || "");

  // Determine initial valid company ID
  const initialCompId = useMemo(() => {
    if (
      opportunity.companyId &&
      opportunity.companyId !== ("c1" as any) &&
      opportunity.companyId !== ("all" as any) &&
      companies.some((c) => c.id === opportunity.companyId)
    ) {
      return opportunity.companyId;
    }
    if (
      activeCompanyId &&
      activeCompanyId !== ("all" as any) &&
      companies.some((c) => c.id === activeCompanyId)
    ) {
      return activeCompanyId;
    }
    return companies[0]?.id || ("comp-import-1789231993585-501" as CompanyId);
  }, [opportunity.companyId, activeCompanyId, companies]);

  const [selectedCompanyId, setSelectedCompanyId] = useState<CompanyId>(initialCompId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanPhone = (p: string) => p.replace(/[^0-9]/g, "");
  const cleanedInputPhone = cleanPhone(phone);
  const existingDuplicateCust = cleanedInputPhone
    ? customers.find((c) => c.phone && cleanPhone(c.phone) === cleanedInputPhone)
    : undefined;

  const handleLinkToExisting = async (existing: Customer) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await updateOpportunity(opportunity.id, {
        customerId: existing.id,
        customerName: existing.name,
        customerPhone: existing.phone,
        area: existing.area,
        customerScope: "specific",
      });

      if (opportunity.inquiryId) {
        try {
          await updateInquiry(opportunity.inquiryId, {
            customerId: existing.id,
            customerName: existing.name,
            customerPhone: existing.phone,
            area: existing.area,
          });
        } catch {}
      }

      if (opportunity.quotationId) {
        try {
          await updateQuotation(opportunity.quotationId, {
            customerId: existing.id,
            customerName: existing.name,
            customerPhone: existing.phone,
          });
        } catch {}
      }

      showToast(`تم ربط الفرصة بالعميل المسجل (${existing.name}) بنجاح!`, "success");
      onSuccess(existing);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ أثناء ربط الفرصة بالعميل.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setErrorMsg("يرجى إدخال اسم العميل");
      return;
    }

    if (existingDuplicateCust) {
      setErrorMsg(
        `يوجد بالفعل عميل مسجل بنفس رقم الهاتف: "${existingDuplicateCust.name}". يمكنك الضغط على زر الربط أدناه لربط هذه الفرصة به مباشرة.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Map opportunity stage to valid customer stage
      const mappedStage: Customer["stage"] =
        opportunity.stage === "won"
          ? "contracted"
          : opportunity.stage === "lost"
          ? "lost"
          : opportunity.stage === "quote_sent" || opportunity.stage === "quotation"
          ? "quotation"
          : opportunity.stage === "needs_inspection" ||
            opportunity.stage === "inspection_completed"
          ? "inspection"
          : opportunity.stage === "negotiation"
          ? "negotiation"
          : "inquiry";

      const newCust = await addCustomer({
        name: trimmedName,
        phone: trimmedPhone || "غير مسجل",
        area: area.trim() || "غير محدد",
        companyId: selectedCompanyId,
        stage: mappedStage,
        source: opportunity.source || "Manual",
        otherSource: opportunity.otherSource,
        notes: `تم إنشاء العميل من الفرصة البيعية: ${opportunity.title}`,
      });

      if (newCust && newCust.id && (newCust as any)._saveResult?.success !== false) {
        // Link Opportunity
        await updateOpportunity(opportunity.id, {
          companyId: selectedCompanyId,
          customerId: newCust.id,
          customerName: newCust.name,
          customerPhone: newCust.phone,
          area: newCust.area,
          customerScope: "specific",
        });

        // Link Inquiry if exists
        if (opportunity.inquiryId) {
          try {
            await updateInquiry(opportunity.inquiryId, {
              customerId: newCust.id,
              customerName: newCust.name,
              customerPhone: newCust.phone,
              area: newCust.area,
            });
          } catch {}
        }

        // Link Quotation if exists
        if (opportunity.quotationId) {
          try {
            await updateQuotation(opportunity.quotationId, {
              customerId: newCust.id,
              customerName: newCust.name,
              customerPhone: newCust.phone,
            });
          } catch {}
        }

        showToast(
          `تم إنشاء حساب العميل (${newCust.name}) بنجاح وربطه بالفرصة وإضافته لقائمة العملاء والقاعدة السحابية!`,
          "success"
        );
        onSuccess(newCust);
        onClose();
      } else {
        const failureReason =
          (newCust as any)?._saveResult?.change?.error ||
          "فشل حفظ العميل في قاعدة البيانات السحابية Supabase.";
        setErrorMsg(failureReason);
        showToast("فشلت عملية حفظ العميل في قاعدة البيانات", "error");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ غير متوقع أثناء الحفظ.");
      showToast("حدث خطأ أثناء حفظ العميل", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-[#18191B] border border-[#292B2E] w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-right"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-[#292B2E] pb-3">
          <h3 className="text-lg font-black text-[#EDEDED] flex items-center gap-2">
            <User className="w-5 h-5 text-[#C8A75A]" />
            إنشاء عميل جديد من بيانات الفرصة
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-[#A1A1AA] hover:text-[#EDEDED] rounded-xl hover:bg-[#202225] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#A1A1AA] leading-relaxed">
          قم بمراجعة وتأكيد بيانات العميل الأساسية. عند الحفظ، سيتم إنشاء حساب العميل رسمياً
          في جدول العملاء السحابي (Supabase) وربط الفرصة والاستفسار وعروض الأسعار به تلقائياً.
        </p>

        {errorMsg && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            {existingDuplicateCust && (
              <button
                type="button"
                onClick={() => handleLinkToExisting(existingDuplicateCust)}
                disabled={isSubmitting}
                className="w-full py-2 px-3 bg-[#C8A75A] hover:bg-[#DFC17B] text-[#111111] font-black rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                <span>ربط هذه الفرصة فوراً بالعميل المسجل: ({existingDuplicateCust.name})</span>
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#EDEDED] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#C8A75A]" />
              <span>اسم العميل:</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full p-3 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] text-xs font-bold outline-hidden focus:border-[#C8A75A]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#EDEDED] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#C8A75A]" />
              <span>رقم الهاتف الأساسي:</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="مثال: 01012345678"
              disabled={isSubmitting}
              className="w-full p-3 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] text-xs font-mono outline-hidden focus:border-[#C8A75A]"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#EDEDED] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C8A75A]" />
              <span>المنطقة / المدينة:</span>
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="مثال: التجمع الخامس / القاهرة"
              disabled={isSubmitting}
              className="w-full p-3 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] text-xs outline-hidden focus:border-[#C8A75A]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#EDEDED] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#C8A75A]" />
              <span>الشركة التابع لها العميل:</span>
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value as CompanyId)}
              disabled={isSubmitting}
              className="w-full p-3 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] text-xs font-bold outline-hidden focus:border-[#C8A75A] cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-[#292B2E] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-[#202225] hover:bg-[#282B30] text-[#A1A1AA] hover:text-[#EDEDED] font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#C8A75A] hover:bg-[#DFC17B] text-[#111111] font-black text-xs rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                  <span>جاري الحفظ والربط في Supabase...</span>
                </>
              ) : (
                <span>تأكيد وإنشاء العميل</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteOpportunityConfirmModal: React.FC<{
  isOpen: boolean;
  opportunity: Opportunity;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, opportunity, onClose, onSuccess }) => {
  const { deleteOpportunity, showToast } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const res = await deleteOpportunity(opportunity.id);
      if (res.success) {
        showToast("تم حذف الفرصة بنجاح من قاعدة البيانات", "info");
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message || "فشلت عملية الحذف من قاعدة البيانات.");
        showToast("فشلت عملية الحذف من قاعدة البيانات", "error");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ أثناء حذف الفرصة.");
      showToast("حدث خطأ أثناء الحذف", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#18191B] border border-rose-900/50 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-right" dir="rtl">
        <div className="flex items-center justify-between border-b border-[#292B2E] pb-3">
          <h3 className="text-lg font-black text-rose-400 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            تأكيد حذف الفرصة البيعية
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-[#A1A1AA] hover:text-[#EDEDED] rounded-xl hover:bg-[#202225] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-[#202225] border border-[#292B2E] rounded-2xl space-y-1.5 text-xs text-[#EDEDED]">
          <p><span className="text-[#A1A1AA]">عنوان الفرصة:</span> <strong>{opportunity.title}</strong></p>
          <p><span className="text-[#A1A1AA]">القيمة المتوقعة:</span> <strong className="text-emerald-400">{(opportunity.expectedValue || 0).toLocaleString()} ج.م</strong></p>
          <p><span className="text-[#A1A1AA]">العميل:</span> <strong>{opportunity.customerName || "غير محدد"}</strong></p>
        </div>

        <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-300 leading-relaxed">
          ⚠️ هل أنت متأكد من رغبتك في حذف هذه الفرصة نهائياً من قاعدة البيانات (Supabase)؟
          <br />
          <span className="text-[11px] text-rose-400 font-bold block mt-1">
            * ضمان الأمان: لن يتم حذف أو التأثير على أي عميل أو عقد أو تحصيل مرتبط في النظام.
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-700/80 rounded-xl text-rose-200 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-2 border-t border-[#292B2E]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 bg-[#202225] hover:bg-[#282B30] text-[#A1A1AA] hover:text-[#EDEDED] font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري الحذف النهائي من Supabase...</span>
              </>
            ) : (
              <span>تأكيد الحذف النهائي</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const OpportunitiesView: React.FC = () => {
  const {
    setSelectedCustomerIdFor360,
    opportunities,
    filteredOpportunities,
    customers,
    companies,
    activeCompanyId,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    batchDeleteOpportunities,
    batchCloseOpportunitiesWon,
    batchCloseOpportunitiesLost,
    canDeleteRecords,
    hasPermission,
    showToast,
    navigationFilter,
    contracts,
    calculateContractedSalesTotal,
    addCustomer,
    interactions,
    followUps,
    quotations,
    navigateToTabWithFilter,
  } = useApp();

  // Dual View Mode Pattern (Cards | Table)
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Quote Sent Prompt Modal state
  const [quoteSentPromptOpp, setQuoteSentPromptOpp] = useState<Opportunity | null>(null);
  const [showQuoteSentPrompt, setShowQuoteSentPrompt] = useState(false);

  // Selection state for "تحديد الكل"
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [lossReasonFilter, setLossReasonFilter] = useState<string>("all");
  const [customerLinkFilter, setCustomerLinkFilter] = useState<string>("all");

  // Sync navigationFilter from Analytics/other drill-downs
  React.useEffect(() => {
    if (navigationFilter) {
      if (navigationFilter.status) setStatusFilter(navigationFilter.status);
      if (navigationFilter.stage) setStageFilter(navigationFilter.stage);
      if (navigationFilter.source) setSourceFilter(navigationFilter.source);
      if (navigationFilter.lossReason) setLossReasonFilter(navigationFilter.lossReason);
      if (navigationFilter.searchQuery) setSearchQuery(navigationFilter.searchQuery);
    }
  }, [navigationFilter]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [closingOpp, setClosingOpp] = useState<Opportunity | null>(null);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [creatingCustomerOpp, setCreatingCustomerOpp] = useState<Opportunity | null>(null);
  const [deletingOpp, setDeletingOpp] = useState<Opportunity | null>(null);
  const [showBatchLostModal, setShowBatchLostModal] = useState(false);
  const [batchLossReason, setBatchLossReason] = useState("");
  const [batchLossNotes, setBatchLossNotes] = useState("");
  const [selectedOppForActions, setSelectedOppForActions] = useState<Opportunity | null>(null);
  const [selectedOppForDetails, setSelectedOppForDetails] = useState<Opportunity | null>(null);
  const [showLinkSelector, setShowLinkSelector] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [linkingCustomerId, setLinkingCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // New Opportunity Form state
  const [newTitle, setNewTitle] = useState("");
  const [newCompanyId, setNewCompanyId] = useState<string>(
    activeCompanyId !== "all" ? activeCompanyId : companies[0]?.id || ""
  );
  const [newCustomerScope, setNewCustomerScope] = useState<CustomerScope>("specific");
  const [newCustomerId, setNewCustomerId] = useState<string>("");
  const [newProductType, setNewProductType] = useState("شبابيك وأبواب UPVC");
  const [newExpectedValue, setNewExpectedValue] = useState<number>(50000);
  const [newSource, setNewSource] = useState<CustomerSource>("WhatsApp");
  const [newOtherSource, setNewOtherSource] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newStage, setNewStage] = useState<OpportunityStage>("qualified");
  const [newNotes, setNewNotes] = useState("");

  // Dynamically enrich opportunities with the customer's latest name, phone, and area from the central customers state
  const enrichedOpportunities = useMemo(() => {
    return filteredOpportunities.map((o) => {
      const cust = customers.find((cust) => cust.id === o.customerId);
      if (cust) {
        return {
          ...o,
          customerName: cust.name,
          customerPhone: cust.phone || o.customerPhone,
          area: cust.area || o.area,
        };
      }
      return o;
    });
  }, [filteredOpportunities, customers]);

  // Filtered by activeCompanyId and search / status
  const displayedOpportunities = useMemo(() => {
    return enrichedOpportunities.filter((opp) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        opp.title.toLowerCase().includes(q) ||
        (opp.customerName && opp.customerName.toLowerCase().includes(q)) ||
        (opp.customerPhone && opp.customerPhone.includes(q)) ||
        (opp.area && opp.area.toLowerCase().includes(q)) ||
        (opp.productType && opp.productType.toLowerCase().includes(q));

      // Status
      const matchStatus = statusFilter === "all" || opp.status === statusFilter;

      // Stage
      const matchStage = stageFilter === "all" || opp.stage === stageFilter;

      // Source
      const matchSource = sourceFilter === "all" || opp.source === sourceFilter;

      // Loss Reason
      const matchLossReason = lossReasonFilter === "all" || opp.lossReason === lossReasonFilter;

      // Customer Link Status
      const hasCustomer = customers.some((c) => c.id === opp.customerId);
      const matchCustomerLink =
        customerLinkFilter === "all" ||
        (customerLinkFilter === "linked" && hasCustomer) ||
        (customerLinkFilter === "unlinked" && !hasCustomer);

      return matchSearch && matchStatus && matchStage && matchSource && matchLossReason && matchCustomerLink;
    });
  }, [enrichedOpportunities, searchQuery, statusFilter, stageFilter, sourceFilter, lossReasonFilter, customerLinkFilter, customers]);

  // Handle "تحديد الكل" (Select All)
  const isAllSelected =
    displayedOpportunities.length > 0 &&
    displayedOpportunities.every((opp) => selectedIds.includes(opp.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedOpportunities.map((opp) => opp.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Customers filtered for the selected company in creation form
  const availableCompanyCustomers = useMemo(() => {
    return customers.filter((c) => c.companyId === newCompanyId);
  }, [customers, newCompanyId]);

  // Handle Create Submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTitle.trim()) {
      showToast("يرجى إدخال عنوان الفرصة", "warning");
      return;
    }

    let custName = "";
    let custPhone = "";
    let custArea = newArea;
    let finalCustId: string | null = null;

    if (newCustomerScope === "specific") {
      if (!newCustomerId) {
        showToast("يرجى اختيار العميل المحدد أو تغيير النطاق لجميع العملاء", "warning");
        return;
      }
      const foundCust = customers.find((c) => c.id === newCustomerId);
      if (foundCust) {
        finalCustId = foundCust.id;
        custName = foundCust.name;
        custPhone = foundCust.phone;
        custArea = custArea || foundCust.area;
      }
    } else {
      // Scope: all -> no fake customer ID
      finalCustId = null;
      custName = "جميع العملاء (نطاق عام)";
    }

    addOpportunity({
      companyId: newCompanyId,
      title: newTitle.trim(),
      customerScope: newCustomerScope,
      customerId: finalCustId,
      customerName: custName,
      customerPhone: custPhone,
      area: custArea || "غير محدد",
      productType: newProductType,
      expectedValue: Number(newExpectedValue) || 0,
      stage: newStage,
      status: "open",
      source: newSource,
      otherSource: newSource === "Other" ? newOtherSource.trim() : undefined,
      notes: newNotes.trim() || undefined,
    });

    // Reset Form
    setNewTitle("");
    setNewCustomerId("");
    setNewOtherSource("");
    setNewNotes("");
    setShowCreateModal(false);
  };

  // KPI Calculations
  const wonOpps = displayedOpportunities.filter((o) => o.status === "won");
  const wonCount = wonOpps.length;
  const wonValue = wonOpps.reduce((acc, o) => acc + (o.expectedValue || 0), 0);

  const lostOpps = displayedOpportunities.filter((o) => o.status === "lost");
  const lostCount = lostOpps.length;
  const lostValue = lostOpps.reduce((acc, o) => acc + (o.expectedValue || 0), 0);

  const openOpps = displayedOpportunities.filter((o) => o.status === "open");
  const openCount = openOpps.length;
  const openValue = openOpps.reduce((acc, o) => acc + (o.expectedValue || 0), 0);

  const totalValue = openValue + lostValue + wonValue;

  // معدل التحويل (الرابحة ÷ المغلقة)
  const closedCount = wonCount + lostCount;
  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#EDEDED]" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292B2E] pb-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-[#18191B] border border-[#292B2E] text-[#C8A75A]">
            <Target className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#EDEDED]">
                مركز الفرص البيعية (Qualified Opportunities)
              </h1>
              <CompanyIdentity size="xs" />
            </div>
            <p className="text-xs sm:text-sm text-[#A1A1AA]">
              تتبع وإدارة الفرص البيعية وإغلاق الصفقات بالتعاقد (Won) أو الخسارة (Lost) مع حفظ أسباب الخسارة
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (activeCompanyId !== "all") setNewCompanyId(activeCompanyId);
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#C8A75A] hover:bg-[#DFC17B] text-[#111111] font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#111111]" />
          <span>فرصة بيعية جديدة</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
        <div className="bg-[#18191B] rounded-2xl p-4 border border-[#292B2E] shadow-sm flex flex-col justify-between h-full cursor-pointer hover:border-[#C8A75A] transition-all" onClick={() => setStatusFilter("all")}>
          <span className="text-xs font-bold text-[#A1A1AA]">إجمالي الفرص</span>
          <div className="mt-2">
            <div className="text-xl font-black text-[#EDEDED] font-mono">
              {totalValue.toLocaleString()} <span className="text-[10px] text-[#A1A1AA] font-normal">ج.م</span>
            </div>
            <div className="text-[10px] text-[#A1A1AA] font-bold mt-1">العدد الإجمالي: {displayedOpportunities.length} فرصة</div>
          </div>
        </div>

        <div className="bg-emerald-950/40 rounded-2xl p-4 border border-emerald-800/40 shadow-sm flex flex-col justify-between h-full cursor-pointer hover:border-emerald-500/50 transition-all" onClick={() => setStatusFilter("won")}>
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>تم التعاقد</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-emerald-400 font-mono">
              {wonValue.toLocaleString()} <span className="text-[10px] text-emerald-500 font-normal">ج.م</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold mt-1">العدد: {wonCount} صفقة</div>
          </div>
        </div>

        <div className="bg-amber-950/40 rounded-2xl p-4 border border-amber-800/40 shadow-sm flex flex-col justify-between h-full cursor-pointer hover:border-amber-500/50 transition-all" onClick={() => setStatusFilter("open")}>
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span>الفرص المفتوحة</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-[#C8A75A] font-mono">
              {openValue.toLocaleString()} <span className="text-[10px] text-amber-500 font-normal">ج.م</span>
            </div>
            <div className="text-[10px] text-amber-400 font-bold mt-1">العدد: {openCount} فرصة</div>
          </div>
        </div>

        <div className="bg-rose-950/40 rounded-2xl p-4 border border-rose-800/40 shadow-sm flex flex-col justify-between h-full cursor-pointer hover:border-rose-500/50 transition-all" onClick={() => setStatusFilter("lost")}>
          <div className="flex items-center justify-between text-rose-400 text-xs font-bold">
            <span>صفقات خاسرة</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-rose-400 font-mono">
              {lostValue.toLocaleString()} <span className="text-[10px] text-rose-500 font-normal">ج.م</span>
            </div>
            <div className="text-[10px] text-rose-400 font-bold mt-1">العدد: {lostCount} صفقة</div>
          </div>
        </div>

        <div className="bg-[#18191B] rounded-2xl p-4 border border-[#292B2E] shadow-sm flex flex-col justify-between h-full cursor-pointer hover:border-[#C8A75A] transition-all" onClick={() => setStatusFilter("all")}>
          <span className="text-xs font-bold text-[#A1A1AA]" title="الفرص الرابحة ÷ إجمالي الفرص المغلقة">معدل التحويل (الرابحة ÷ المغلقة)</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#C8A75A] font-mono">
              {winRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#18191B] rounded-2xl border border-[#292B2E] p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-3 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الفرص، العميل، الهاتف، المنطقة..."
              className="w-full p-2.5 pr-9 pl-4 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl text-xs focus:border-[#C8A75A] outline-hidden font-medium placeholder-[#6B7280]"
            />
            <Search className="w-4 h-4 text-[#A1A1AA] absolute right-3 top-3" />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl text-xs font-bold focus:border-[#C8A75A] outline-hidden cursor-pointer"
            >
              <option value="all">كل الحالات (الكل)</option>
              <option value="open">Open (مفتوحة)</option>
              <option value="won">Won (تم التعاقد)</option>
              <option value="lost">Lost (خسارة)</option>
            </select>
          </div>

          {/* Stage Filter */}
          <div className="sm:col-span-3">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl text-xs font-bold focus:border-[#C8A75A] outline-hidden cursor-pointer"
            >
              <option value="all">كل المراحل البيعية</option>
              <option value="inquiry">استفسار جديد (Inquiry)</option>
              <option value="followup">متابعة أولية (Follow-up)</option>
              <option value="qualified">مؤهلة (Qualified)</option>
              <option value="needs_inspection">مطلوب معاينة (Needs Inspection)</option>
              <option value="inspection_completed">تمت المعاينة (Inspection Done)</option>
              <option value="needs_quote">مطلوب عرض سعر (Needs Quote)</option>
              <option value="quote_sent">تم إرسال العرض (Quote Sent)</option>
              <option value="quotation">عروض الأسعار (Quotation)</option>
              <option value="negotiation">تفاوض (Negotiation)</option>
              <option value="won">تم التعاقد (Won)</option>
              <option value="lost">مغلقة بالخسارة (Lost)</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="sm:col-span-2">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl text-xs font-bold focus:border-[#C8A75A] outline-hidden cursor-pointer"
            >
              <option value="all">كل المصادر</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
              <option value="Website">Website</option>
              <option value="Phone">Phone</option>
              <option value="Referral">Referral</option>
              <option value="Manual">Manual</option>
              <option value="Excel Import">Excel Import</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* View Switcher Toggle (Cards | Table) */}
          <div className="sm:col-span-12 flex items-center justify-between pt-2 border-t border-[#292B2E]">
            <div className="text-xs text-[#A1A1AA] font-bold">
              عرض البيانات ({displayedOpportunities.length} فرصة)
            </div>
            <div className="flex items-center bg-[#202225] border border-[#292B2E] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "cards" ? "bg-[#C8A75A] text-[#111111]" : "text-[#A1A1AA] hover:bg-[#202225]"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>بطاقات (Cards)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-[#C8A75A] text-[#111111]" : "text-[#A1A1AA] hover:bg-[#202225]"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>جدول (Table)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drill-down Active Filter Banner */}
        {lossReasonFilter !== "all" && (
          <div className="flex items-center justify-between p-2.5 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-300">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>
                تصفية الفرص حسب سبب الخسارة: <strong className="underline">{lossReasonFilter}</strong>
              </span>
            </div>
            <button
              onClick={() => {
                setLossReasonFilter("all");
                setStatusFilter("all");
              }}
              className="px-2.5 py-1 bg-[#202225] hover:bg-[#25282C] text-rose-400 font-bold rounded-lg border border-rose-800/40 text-[11px] cursor-pointer transition-colors"
            >
              إلغاء التصفية
            </button>
          </div>
        )}

        {/* Selection & Batch Actions Bar */}
        <div className="pt-3 border-t border-[#292B2E] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-[#EDEDED] hover:text-[#C8A75A] font-bold cursor-pointer transition-colors"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#C8A75A]" />
              ) : (
                <Square className="w-4 h-4 text-[#A1A1AA]" />
              )}
              <span>تحديد الكل ({displayedOpportunities.length})</span>
            </button>

            {selectedIds.length > 0 && (
              <span className="bg-amber-950/50 border border-amber-800/40 text-[#C8A75A] px-2.5 py-1 rounded-lg font-bold">
                تم تحديد {selectedIds.length} عنصر
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  batchCloseOpportunitiesWon(selectedIds);
                  setSelectedIds([]);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>إغلاق جماعي كـ Won</span>
              </button>

              <button
                onClick={() => {
                  setBatchLossReason("");
                  setBatchLossNotes("");
                  setShowBatchLostModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>إغلاق جماعي كـ Lost</span>
              </button>

              {canDeleteRecords && (
                <button
                  onClick={() => {
                    if (confirm(`هل أنت متأكد من حذف ${selectedIds.length} فرص بيعية؟`)) {
                      batchDeleteOpportunities(selectedIds);
                      setSelectedIds([]);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#202225] border border-rose-800/40 text-rose-400 hover:bg-rose-950/40 rounded-xl font-bold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف المحدد</span>
                </button>
              )}

              <button
                onClick={() => setSelectedIds([])}
                className="text-[#A1A1AA] hover:text-[#EDEDED] px-2 py-1"
              >
                إلغاء التحديد
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Opportunities List / Cards */}
      {displayedOpportunities.length === 0 ? (
        <div className="bg-[#18191B] rounded-3xl border border-[#292B2E] p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#202225] text-[#A1A1AA] mx-auto flex items-center justify-center border border-[#292B2E]">
            <Target className="w-7 h-7 text-[#C8A75A]" />
          </div>
          <h3 className="font-bold text-base text-[#EDEDED]">لا توجد فرص بيعية مطابقة</h3>
          <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
            يمكنك إنشاء فرصة بيعية جديدة بالنقر على زر &quot;فرصة بيعية جديدة&quot; أعلاه، وتحديد العميل أو النطاق العام.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedOpportunities.map((opp) => {
            const comp = companies.find((c) => c.id === opp.companyId);
            const isSelected = selectedIds.includes(opp.id);

            return (
              <div
                key={opp.id}
                onClick={() => setSelectedOppForActions(opp)}
                className={`bg-[#18191B] rounded-2xl border transition-all p-5 space-y-4 shadow-sm hover:border-[#C8A75A] relative cursor-pointer group/card ${
                  isSelected
                    ? "border-[#C8A75A] ring-1 ring-[#C8A75A] bg-[#202225]"
                    : "border-[#292B2E]"
                }`}
                title="اضغط لاستعراض تفاصيل الفرصة البيعية وإجراءاتها"
              >
                {/* Header with Checkbox & Title */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelectOne(opp.id); }}
                      className="mt-0.5 text-[#A1A1AA] hover:text-[#C8A75A] cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#C8A75A]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#6B7280]" />
                      )}
                    </button>
                    <div>
                      <h4 className="font-black text-sm text-[#EDEDED] leading-tight">
                        {opp.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {comp && (
                          <span
                            className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border"
                            style={{
                              backgroundColor: `${comp.color}25`,
                              color: comp.color,
                              borderColor: `${comp.color}50`,
                            }}
                          >
                            {comp.name}
                          </span>
                        )}
                        <span className="text-[11px] text-[#A1A1AA] font-mono">
                          {opp.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {opp.status === "won" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/60 text-emerald-400 font-black text-[11px] border border-emerald-800/40">
                        <Trophy className="w-3 h-3" />
                        <span>Won</span>
                      </span>
                    )}
                    {opp.status === "lost" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-950/60 text-rose-400 font-black text-[11px] border border-rose-800/40">
                        <XCircle className="w-3 h-3" />
                        <span>Lost</span>
                      </span>
                    )}
                    {opp.status === "open" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-950/50 text-[#C8A75A] font-bold text-[11px] border border-amber-800/40">
                        <Clock className="w-3 h-3 text-[#C8A75A]" />
                        <span>مفتوحة</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Customer Scope & Details */}
                <div className="bg-[#202225] rounded-xl p-3 space-y-2 text-xs border border-[#292B2E]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#A1A1AA]">نطاق العميل:</span>
                    <span className="font-bold text-[#EDEDED] flex items-center gap-1">
                      {opp.customerScope === "all" ? (
                        <>
                          <Users className="w-3.5 h-3.5 text-[#C8A75A]" />
                          <span>جميع العملاء (نطاق عام)</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-[#C8A75A]" />
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (opp.customerId) setSelectedCustomerIdFor360(opp.customerId);
                            }}
                            className="cursor-pointer hover:text-[#C8A75A] transition-colors underline underline-offset-2"
                          >
                            {opp.customerName || "عميل محدد"}
                          </span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#A1A1AA]">الارتباط بالنظام:</span>
                    {customers.some((c) => c.id === opp.customerId) ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 font-bold border border-emerald-800/40 text-[10px]">
                        ✓ مرتبط بعميل
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-400 font-bold border border-rose-800/40 text-[10px]">
                          ⚠️ بدون عميل مرتبط
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreatingCustomerOpp(opp);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-[#C8A75A] border border-amber-500/40 text-[10px] font-bold hover:bg-[#C8A75A] hover:text-[#111111] transition-all flex items-center gap-1 cursor-pointer"
                          title="إنشاء عميل جديد من بيانات هذه الفرصة وإضافته لقائمة العملاء"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>إنشاء عميل</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {opp.customerPhone && (
                    <div className="flex items-center justify-between text-[#A1A1AA]">
                      <span>الهاتف:</span>
                      <span className="font-mono font-bold text-[#EDEDED]" dir="ltr">
                        {opp.customerPhone}
                      </span>
                    </div>
                  )}

                  {opp.area && (
                    <div className="flex items-center justify-between text-[#A1A1AA]">
                      <span>المنطقة:</span>
                      <span className="font-bold text-[#EDEDED] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#A1A1AA]" />
                        <span>{opp.area}</span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[#A1A1AA]">
                    <span>المصدر:</span>
                    <span className="font-bold text-[#EDEDED] bg-[#18191B] border border-[#292B2E] px-2 py-0.5 rounded-md text-[10px]">
                      {opp.source === "Other" && opp.otherSource
                        ? `Other (${opp.otherSource})`
                        : opp.source || "غير محدد"}
                    </span>
                  </div>
                </div>

                {/* Linked Documents (Inquiry, Quote, Contract, Next Followup) */}
                {(opp.inquiryId || opp.quotationId || opp.hasQuote || opp.hasContract || opp.contractId || opp.nextFollowUpDate) && (
                  <div className="bg-[#18191B] rounded-xl p-2.5 space-y-2 border border-[#292B2E] text-xs">
                    {opp.inquiryId && (
                      <div className="flex items-center justify-between text-[#A1A1AA] text-[11px]">
                        <span>الاستفسار المرتبط:</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {opp.productType || "استفسار مسجل"}
                        </span>
                      </div>
                    )}
                    {(opp.quotationId || opp.hasQuote) && (
                      <div className="flex items-center justify-between p-2 bg-[#202225] rounded-lg border border-[#292B2E]">
                        <span className="flex items-center gap-1.5 text-[#EDEDED] font-bold text-[11px]">
                          <FileText className="w-3.5 h-3.5 text-[#C8A75A]" />
                          <span>عرض السعر:</span>
                        </span>
                        <div className="text-left">
                          <span className="font-mono text-xs font-bold text-[#EDEDED] block">
                            {opp.quoteNumber || "عرض سعر"}
                          </span>
                          {opp.quotationValue ? (
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              {opp.quotationValue.toLocaleString()} ج.م
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )}
                    {(opp.hasContract || opp.contractId || opp.stage === "won") && (
                      <div className="flex items-center justify-between p-2 bg-emerald-950/30 rounded-lg border border-emerald-800/40">
                        <span className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>العقد المبرم:</span>
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-200">
                          {opp.contractNumber || "عقد معتمد"}
                        </span>
                      </div>
                    )}
                    {opp.nextFollowUpDate && opp.status === "open" && (
                      <div className="flex items-center justify-between text-[#A1A1AA] text-[11px]">
                        <span>المتابعة القادمة:</span>
                        <span className="font-bold text-[#C8A75A] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#C8A75A]" />
                          {opp.nextFollowUpDate}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Value & Stage */}
                <div className="flex items-center justify-between pt-1 border-t border-[#292B2E] text-xs">
                  <div>
                    <span className="text-[#A1A1AA] block text-[10px]">القيمة المتوقعة</span>
                    <strong className="text-emerald-400 font-mono text-sm font-black">
                      {(opp.expectedValue || 0).toLocaleString()} ج.م
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#A1A1AA] block text-[10px] text-left">المرحلة البيعية</span>
                    {opp.status === "open" ? (
                      <select
                        value={opp.stage}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const newStage = e.target.value as OpportunityStage;
                          if (newStage === "quote_sent" && !opp.quotationId && !opp.hasQuote) {
                            setQuoteSentPromptOpp(opp);
                            setShowQuoteSentPrompt(true);
                            return;
                          }
                          const cfg = OPPORTUNITY_STAGES_CONFIG.find((s) => s.id === newStage);
                          updateOpportunity(opp.id, {
                            stage: newStage,
                            nextAction: cfg?.defaultAction || opp.nextAction,
                          });
                          showToast(`تم تحديث المرحلة إلى ${cfg?.label || newStage}`, "success");
                        }}
                        className="font-bold text-[#C8A75A] text-[11px] bg-[#202225] border border-[#292B2E] rounded-lg px-2 py-1 outline-hidden cursor-pointer hover:border-[#C8A75A] transition-colors"
                        title="تعديل سريع لمرحلة الفرصة الجارية"
                      >
                        {OPPORTUNITY_STAGES_CONFIG.map((cfg) => (
                          <option key={cfg.id} value={cfg.id}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-bold text-[#C8A75A] text-[11px]">
                        {OPPORTUNITY_STAGES_CONFIG.find((s) => s.id === opp.stage)?.label || opp.stage}
                      </span>
                    )}
                  </div>
                </div>

                {/* Next Operational Action */}
                {opp.nextAction ? (
                  <div className="flex items-center gap-2 p-2 bg-[#202225] rounded-xl text-[11px] text-[#EDEDED] border border-[#292B2E]">
                    <Clock className="w-3.5 h-3.5 text-[#C8A75A] shrink-0" />
                    <span className="truncate">الإجراء التالي: <strong className="text-[#EDEDED]">{opp.nextAction}</strong></span>
                  </div>
                ) : opp.status === "open" ? (
                  <div className="flex items-center gap-1.5 p-2 bg-amber-500/10 rounded-xl text-[11px] text-amber-300 border border-amber-500/30">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>⚠️ تنبيه: لم يتم تحديد الإجراء القادم لإتمام الصفقة</span>
                  </div>
                ) : null}

                {/* Lost Reason Notice if Lost */}
                {opp.status === "lost" && opp.lossReason && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800/40 rounded-xl text-[11px] text-rose-300 space-y-0.5">
                    <div className="flex items-center gap-1 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>سبب الخسارة: {opp.lossReason}</span>
                    </div>
                    {opp.lossNotes && (
                      <p className="text-[10px] text-rose-400 pl-4">{opp.lossNotes}</p>
                    )}
                  </div>
                )}

                 {/* Actions Bar */}
                <div className="pt-3 border-t border-[#292B2E] flex items-center justify-between gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedOppForActions(opp); }}
                    className="flex-1 px-3 py-2 bg-[#C8A75A] hover:bg-[#DFC17B] text-[#111111] rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1"
                  >
                    <Target className="w-3.5 h-3.5 text-[#111111]" />
                    <span>إجراءات الفرصة</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); setClosingOpp(opp); }}
                    className={`px-3 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      opp.status === "won"
                        ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/50"
                        : opp.status === "lost"
                        ? "bg-rose-950/50 text-rose-400 border border-rose-800/40 hover:bg-rose-900/50"
                        : "bg-[#202225] hover:bg-[#25282C] border border-[#292B2E] text-[#C8A75A]"
                    }`}
                  >
                    {opp.status === "won" ? "Won ✓" : opp.status === "lost" ? "Lost ✗" : "إغلاق"}
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingOpp(opp); }}
                    title="تعديل الفرصة"
                    className="p-2 text-[#A1A1AA] hover:text-[#C8A75A] rounded-xl hover:bg-[#202225] border border-[#292B2E] transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {canDeleteRecords && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingOpp(opp);
                      }}
                      title="حذف الفرصة"
                      className="p-2 text-[#A1A1AA] hover:text-rose-400 rounded-xl hover:bg-rose-950/40 border border-[#292B2E] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#18191B] rounded-2xl border border-[#292B2E] overflow-x-auto shadow-sm">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#111111] text-[#A1A1AA] border-b border-[#292B2E]">
                <th className="p-3 text-center">تحديد</th>
                <th className="p-3">اسم الفرصة والعميل</th>
                <th className="p-3">الشركة</th>
                <th className="p-3">المرحلة البيعية</th>
                <th className="p-3">القيمة المتوقعة</th>
                <th className="p-3">الإجراء التالي</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292B2E] text-[#EDEDED]">
              {displayedOpportunities.map((opp) => {
                const comp = companies.find((c) => c.id === opp.companyId);
                const isSelected = selectedIds.includes(opp.id);
                const cfg = OPPORTUNITY_STAGES_CONFIG.find((s) => s.id === opp.stage);
                return (
                  <tr key={opp.id} className="hover:bg-[#202225]/60 transition-colors">
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(opp.id)}
                        className="text-[#A1A1AA] hover:text-[#C8A75A] cursor-pointer"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-[#C8A75A]" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="p-3">
                      <div
                        onClick={() => setSelectedOppForActions(opp)}
                        className="font-bold text-[#EDEDED] hover:text-[#C8A75A] cursor-pointer underline underline-offset-2"
                      >
                        {opp.title}
                      </div>
                      <div className="text-[11px] text-[#A1A1AA] flex items-center gap-2 mt-0.5">
                        <span>{opp.customerName || "بدون عميل"}</span>
                        {opp.customerPhone && <span dir="ltr" className="font-mono">({opp.customerPhone})</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      {comp ? (
                        <CompanyIdentity companyId={comp.id} companyName={comp.name} logoUrl={comp.logoUrl} size="sm" />
                      ) : (
                        <span className="text-[#A1A1AA]">غير محدد</span>
                      )}
                    </td>
                    <td className="p-3">
                      {opp.status === "open" ? (
                        <select
                          value={opp.stage}
                          onChange={(e) => {
                            const newStage = e.target.value as OpportunityStage;
                            if (newStage === "quote_sent" && !opp.quotationId && !opp.hasQuote) {
                              setQuoteSentPromptOpp(opp);
                              setShowQuoteSentPrompt(true);
                              return;
                            }
                            const c = OPPORTUNITY_STAGES_CONFIG.find((s) => s.id === newStage);
                            updateOpportunity(opp.id, {
                              stage: newStage,
                              nextAction: c?.defaultAction || opp.nextAction,
                            });
                            showToast(`تم تحديث المرحلة إلى ${c?.label || newStage}`, "success");
                          }}
                          className="bg-[#202225] border border-[#292B2E] text-[#C8A75A] font-bold text-[11px] rounded-lg px-2 py-1 outline-hidden cursor-pointer"
                        >
                          {OPPORTUNITY_STAGES_CONFIG.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-bold text-[#C8A75A]">{cfg?.label || opp.stage}</span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      {(opp.expectedValue || 0).toLocaleString()} ج.م
                    </td>
                    <td className="p-3 text-[11px]">
                      <div>{opp.nextAction || "لا يوجد"}</div>
                      {opp.nextFollowUpDate && (
                        <div className="text-[#A1A1AA] font-mono mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#C8A75A]" />
                          <span>{opp.nextFollowUpDate}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        opp.status === "won" ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" :
                        opp.status === "lost" ? "bg-rose-950/60 text-rose-400 border border-rose-800/40" :
                        "bg-amber-950/50 text-[#C8A75A] border border-amber-800/40"
                      }`}>
                        {opp.status === "won" ? "Won ✓" : opp.status === "lost" ? "Lost ✗" : "مفتوحة ⏳"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedOppForActions(opp)}
                          className="p-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#C8A75A] rounded-lg transition-colors cursor-pointer"
                          title="تفاصيل وإجراءات"
                        >
                          <Target className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingOpp(opp)}
                          className="p-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] rounded-lg transition-colors cursor-pointer"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {canDeleteRecords && (
                          <button
                            onClick={() => setDeletingOpp(opp)}
                            className="p-1.5 bg-[#202225] hover:bg-rose-950/50 text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Opportunity Modal */}
      {editingOpp && (
        <EditOpportunityModal
          isOpen={!!editingOpp}
          opportunity={editingOpp}
          onClose={() => setEditingOpp(null)}
          onSuccess={() => setEditingOpp(null)}
        />
      )}

      {/* Single Deal Closing Modal */}
      {closingOpp && (
        <CloseDealModal
          isOpen={!!closingOpp}
          opportunity={closingOpp}
          onClose={() => setClosingOpp(null)}
          onSuccess={() => {
            setClosingOpp(null);
          }}
        />
      )}

      {/* Batch Lost Modal */}
      {showBatchLostModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-[#18191B] text-[#EDEDED] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-800/40 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#292B2E] pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <XCircle className="w-5 h-5" />
                <h3 className="font-black text-sm">
                  إغلاق جماعي كـ Lost لـ ({selectedIds.length}) فرصة
                </h3>
              </div>
              <button
                onClick={() => setShowBatchLostModal(false)}
                className="text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-950/40 border border-rose-800/40 text-rose-300 rounded-xl text-xs space-y-1">
              <strong>سبب الخسارة إلزامي:</strong>
              <p className="text-[11px] text-rose-400">
                سيتم حفظ هذا السبب في جميع الفرص المحددة واستخدامه في تحليلات أسباب الخسارة.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-[#EDEDED]">سبب الخسارة *:</label>
              <select
                value={batchLossReason}
                onChange={(e) => setBatchLossReason(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-bold focus:border-rose-500 outline-hidden"
              >
                <option value="">-- اختر سبب الخسارة (إلزامي) --</option>
                <option value="السعر">السعر</option>
                <option value="اختار شركة أخرى">اختار شركة أخرى</option>
                <option value="لم يعد مهتمًا">لم يعد مهتمًا</option>
                <option value="تأجيل">تأجيل</option>
                <option value="عدم الرد">عدم الرد</option>
                <option value="مشكلة في المنتج">مشكلة في المنتج</option>
                <option value="مشكلة في التنفيذ/المدة">مشكلة في التنفيذ/المدة</option>
                <option value="سبب آخر">سبب آخر</option>
              </select>
            </div>

            {batchLossReason === "سبب آخر" && (
              <div className="space-y-1 text-xs">
                <label className="font-bold text-[#EDEDED]">اكتب السبب بالتفصيل *:</label>
                <input
                  type="text"
                  value={batchLossNotes}
                  onChange={(e) => setBatchLossNotes(e.target.value)}
                  placeholder="اكتب سبب الخسارة..."
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl outline-hidden focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#292B2E]">
              <button
                type="button"
                onClick={() => setShowBatchLostModal(false)}
                className="px-4 py-2 text-[#A1A1AA] hover:text-[#EDEDED] rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalReason =
                    batchLossReason === "سبب آخر"
                      ? batchLossNotes.trim()
                      : batchLossReason.trim();

                  if (!finalReason) {
                    showToast("سبب الخسارة إلزامي!", "warning");
                    return;
                  }

                  batchCloseOpportunitiesLost(selectedIds, finalReason, batchLossNotes);
                  setSelectedIds([]);
                  setShowBatchLostModal(false);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                تأكيد الإغلاق كـ Lost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Opportunity Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          dir="rtl"
        >
          <div className="bg-[#18191B] text-[#EDEDED] rounded-3xl max-w-xl w-full shadow-2xl border border-[#292B2E] overflow-hidden my-8 animate-in fade-in">
            <div className="p-5 bg-[#111111] text-[#EDEDED] flex items-center justify-between border-b border-[#292B2E]">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-[#202225] text-[#C8A75A] border border-[#292B2E] rounded-xl">
                  <Target className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm">إضافة فرصة بيعية مؤهلة جديدة</h3>
                  <p className="text-[11px] text-[#A1A1AA]">
                    ربط بالشركة الصحيحة ونطاق العميل مع تحديد المصدر والقيمة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#A1A1AA] hover:text-[#EDEDED] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold text-[#EDEDED]">عنوان الفرصة البيعية *:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: توريد وتركيب شبابيك فيلا بالتجمع الخامس"
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-bold focus:border-[#C8A75A] outline-hidden placeholder-[#6B7280]"
                />
              </div>

              {/* Company Selection */}
              <div className="space-y-1">
                <label className="font-bold text-[#EDEDED]">الشركة التابعة *:</label>
                <select
                  value={newCompanyId}
                  onChange={(e) => {
                    setNewCompanyId(e.target.value);
                    setNewCustomerId(""); // Reset customer when company changes
                  }}
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-bold focus:border-[#C8A75A] outline-hidden cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.nameEn || c.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Scope: Specific vs All */}
              <div className="space-y-2 p-3 bg-[#202225] rounded-2xl border border-[#292B2E]">
                <label className="font-bold text-[#EDEDED] block">
                  نطاق العميل (Customer Scope) *:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCustomerScope("specific")}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      newCustomerScope === "specific"
                        ? "bg-[#C8A75A] text-[#111111] border-[#C8A75A] shadow-xs"
                        : "bg-[#18191B] text-[#A1A1AA] border-[#292B2E] hover:border-[#C8A75A]"
                    }`}
                  >
                    عميل محدد (Specific Customer)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustomerScope("all");
                      setNewCustomerId("");
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      newCustomerScope === "all"
                        ? "bg-[#C8A75A] text-[#111111] border-[#C8A75A] shadow-xs"
                        : "bg-[#18191B] text-[#A1A1AA] border-[#292B2E] hover:border-[#C8A75A]"
                    }`}
                  >
                    جميع العملاء (نطاق عام)
                  </button>
                </div>

                {/* If Specific Customer: Select Customer */}
                {newCustomerScope === "specific" && (
                  <div className="space-y-1 pt-2 animate-in fade-in">
                    <label className="font-bold text-[#EDEDED]">
                      اختر العميل من شركة {companies.find((c) => c.id === newCompanyId)?.name} *:
                    </label>
                    <select
                      value={newCustomerId}
                      onChange={(e) => setNewCustomerId(e.target.value)}
                      required={newCustomerScope === "specific"}
                      className="w-full p-2.5 bg-[#18191B] border border-[#292B2E] text-[#EDEDED] rounded-xl font-bold focus:border-[#C8A75A] outline-hidden cursor-pointer"
                    >
                      <option value="">-- اختر العميل --</option>
                      {availableCompanyCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.phone} {c.area ? `(${c.area})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Value & Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#EDEDED]">القيمة المتوقعة (ج.م) *:</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    required
                    value={newExpectedValue}
                    onChange={(e) => setNewExpectedValue(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-mono font-bold focus:border-[#C8A75A] outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#EDEDED]">المرحلة البيعية:</label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value as OpportunityStage)}
                    className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-bold focus:border-[#C8A75A] outline-hidden cursor-pointer"
                  >
                    <option value="inquiry">استفسار جديد (Inquiry)</option>
                    <option value="followup">متابعة أولية (Follow-up)</option>
                    <option value="qualified">مؤهلة (Qualified)</option>
                    <option value="needs_inspection">مطلوب معاينة (Needs Inspection)</option>
                    <option value="inspection_completed">تمت المعاينة (Inspection Done)</option>
                    <option value="needs_quote">مطلوب عرض سعر (Needs Quote)</option>
                    <option value="quote_sent">تم إرسال العرض (Quote Sent)</option>
                    <option value="quotation">عروض الأسعار (Quotation)</option>
                    <option value="negotiation">تفاوض (Negotiation)</option>
                  </select>
                </div>
              </div>

              {/* Source & Other Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#EDEDED]">مصدر العميل / الاستفسار *:</label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value as CustomerSource)}
                    className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-bold focus:border-[#C8A75A] outline-hidden cursor-pointer"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Website">Website</option>
                    <option value="Phone">Phone</option>
                    <option value="Referral">Referral</option>
                    <option value="Manual">Manual</option>
                    <option value="Excel Import">Excel Import</option>
                    <option value="Other">Other (مصدر آخر)</option>
                  </select>
                </div>

                {newSource === "Other" && (
                  <div className="space-y-1 animate-in fade-in">
                    <label className="font-bold text-[#EDEDED]">أدخل المصدر (Other Source) *:</label>
                    <input
                      type="text"
                      required
                      value={newOtherSource}
                      onChange={(e) => setNewOtherSource(e.target.value)}
                      placeholder="مثال: معرض القاهرة الدولي"
                      className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-bold focus:border-[#C8A75A] outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Area & Product */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#EDEDED]">المنطقة / الموقع:</label>
                  <input
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="مثال: الشيخ زايد، التجمع..."
                    className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden placeholder-[#6B7280]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#EDEDED]">نوع المنتج:</label>
                  <input
                    type="text"
                    value={newProductType}
                    onChange={(e) => setNewProductType(e.target.value)}
                    placeholder="شبابيك UPVC، قطاعات سحاب..."
                    className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden placeholder-[#6B7280]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-[#EDEDED]">ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="أي مواصفات فنية أو شروط دفع متفق عليها..."
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden resize-none placeholder-[#6B7280]"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#292B2E]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-[#A1A1AA] hover:text-[#EDEDED] rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#C8A75A] hover:bg-[#DFC17B] text-[#111111] font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ الفرصة البيعية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Opportunity Actions & Management Modal */}
      {selectedOppForActions && (() => {
        const hasCustomer = customers.some((c) => c.id === selectedOppForActions.customerId);
        const linkedCust = customers.find((c) => c.id === selectedOppForActions.customerId);
        
        return (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            dir="rtl"
          >
            <div className="bg-[#18191B] text-[#EDEDED] rounded-3xl max-w-2xl w-full shadow-2xl border border-[#292B2E] overflow-hidden my-8 animate-in fade-in">
              {/* Header */}
              <div className="p-5 bg-[#111111] text-[#EDEDED] flex items-center justify-between border-b border-[#292B2E]">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-[#202225] text-[#C8A75A] border border-[#292B2E] rounded-xl">
                    <Target className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm">تفاصيل وإجراءات الفرصة البيعية</h3>
                    <p className="text-[11px] text-[#A1A1AA]">
                      إدارة الارتباط بالعملاء، تعديل البيانات، أو إنشاء حساب عميل تشغيلي
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedOppForActions(null);
                    setCustomerSearch("");
                  }}
                  className="text-[#A1A1AA] hover:text-[#EDEDED] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 text-xs">
                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#111111] p-4 rounded-2xl border border-[#292B2E]">
                  <div className="space-y-1">
                    <span className="text-[#A1A1AA]">عنوان الفرصة:</span>
                    <p className="text-sm font-black text-[#EDEDED]">{selectedOppForActions.title}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#A1A1AA]">تاريخ الإنشاء:</span>
                    <p className="text-sm font-bold text-[#EDEDED] font-mono">{selectedOppForActions.createdAt}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#A1A1AA]">القيمة المتوقعة:</span>
                    <p className="text-sm font-black text-emerald-400 font-mono">{(selectedOppForActions.expectedValue || 0).toLocaleString()} ج.م</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#A1A1AA]">المرحلة الحالية:</span>
                    <p className="text-sm font-bold text-[#C8A75A]">
                      {OPPORTUNITY_STAGES_CONFIG.find((s) => s.id === selectedOppForActions.stage)?.label || selectedOppForActions.stage}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#A1A1AA]">الحالة التشغيلية:</span>
                    <p className={`text-sm font-bold ${selectedOppForActions.status === 'won' ? 'text-emerald-400' : selectedOppForActions.status === 'lost' ? 'text-rose-400' : 'text-amber-400'}`}>
                      {selectedOppForActions.status === 'won' ? 'تم التعاقد (Won) ✓' : selectedOppForActions.status === 'lost' ? 'مغلقة بالخسارة (Lost) ✗' : 'مفتوحة (Open) ⏳'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#A1A1AA]">نوع المنتج:</span>
                    <p className="text-sm font-bold text-[#EDEDED]">{selectedOppForActions.productType || "غير محدد"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#A1A1AA]">مصدر الفرصة:</span>
                    <p className="text-sm font-bold text-[#EDEDED]">
                      {selectedOppForActions.source === "Other" && selectedOppForActions.otherSource
                        ? `Other (${selectedOppForActions.otherSource})`
                        : selectedOppForActions.source || "غير محدد"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#A1A1AA]">اسم العميل (في الفرصة):</span>
                    <p className="text-sm font-bold text-[#EDEDED]">{selectedOppForActions.customerName || "غير متوفر"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#A1A1AA]">رقم الهاتف:</span>
                    <p className="text-sm font-bold text-[#EDEDED] font-mono" dir="ltr">{selectedOppForActions.customerPhone || "غير متوفر"}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-[#A1A1AA]">المنطقة / العنوان:</span>
                    <p className="text-sm font-bold text-[#EDEDED]">{selectedOppForActions.area || "غير محدد"}</p>
                  </div>
                  {selectedOppForActions.notes && (
                    <div className="space-y-1 sm:col-span-2 pt-2 border-t border-[#202225]">
                      <span className="text-[#A1A1AA]">ملاحظات الفرصة:</span>
                      <p className="text-xs text-[#EDEDED] whitespace-pre-wrap bg-[#18191B] p-2.5 rounded-xl border border-[#292B2E]">{selectedOppForActions.notes}</p>
                    </div>
                  )}
                </div>

                {/* Connection Status & Operations */}
                <div className="space-y-3">
                  <h4 className="font-bold text-[#C8A75A] border-b border-[#292B2E] pb-1">ارتباط العميل بالنظام (Customer Operational State)</h4>
                  
                  {hasCustomer && linkedCust ? (
                    <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>الفرصة مرتبطة بعميل تشغيلي معتمد في النظام:</span>
                      </div>
                      <div className="text-xs text-[#EDEDED] pl-7 space-y-1">
                        <p>• اسم العميل: <strong className="underline text-[#C8A75A]">{linkedCust.name}</strong></p>
                        <p>• الهاتف: <strong>{linkedCust.phone}</strong></p>
                        <p>• المنطقة: <strong>{linkedCust.area || "غير محدد"}</strong></p>
                      </div>
                      
                      <div className="pt-2 pl-7">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerIdFor360(linkedCust.id);
                            setSelectedOppForActions(null);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          فتح ملف العميل الكامل (Customer 360)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-rose-950/40 border border-rose-800/40 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center gap-2 text-rose-400 font-bold">
                        <AlertCircle className="w-5 h-5" />
                        <span>⚠️ فرصة معزولة (Orphan) - لا يوجد عميل مرتبط في النظام</span>
                      </div>
                      <p className="text-[#A1A1AA] text-[11px] leading-relaxed">
                        هذه الفرصة لا ترتبط بأي من الـ 86 عميلاً المعتمدين في النظام. يرجى اختيار إجراء لربطها أو تحويلها إلى عميل تشغيلي:
                      </p>

                      <div className="flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCreatingCustomerOpp(selectedOppForActions);
                            setSelectedOppForActions(null);
                          }}
                          className="px-4 py-2 bg-[#C8A75A] hover:bg-[#DFC17B] text-[#111111] font-black rounded-xl transition-colors cursor-pointer"
                        >
                          إنشاء عميل جديد من بيانات الفرصة
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual Linking Panel */}
                <div className="space-y-2 p-4 bg-[#202225] rounded-2xl border border-[#292B2E]">
                  <label className="font-bold text-[#EDEDED] block text-xs">ربط الفرصة يدوياً بعميل موجود بالنظام:</label>
                  <p className="text-[11px] text-[#A1A1AA] pb-1">
                    ابحث عن أي عميل من العملاء المعتمدين واضغط عليه لربط هذه الفرصة به مباشرة (لا يتم الربط تلقائياً).
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو الهاتف للربط..."
                      className="w-full p-2.5 pr-9 bg-[#18191B] border border-[#292B2E] text-[#EDEDED] rounded-xl outline-hidden text-xs"
                    />
                    <Search className="w-4 h-4 text-[#A1A1AA] absolute right-3 top-3" />
                  </div>

                  {customerSearch.trim() !== "" && (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 mt-2 p-1 bg-[#18191B] rounded-xl border border-[#292B2E] scrollbar-thin">
                      {customers
                        .filter(
                          (c) =>
                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            (c.phone && c.phone.includes(customerSearch))
                        )
                        .slice(0, 10)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              updateOpportunity(selectedOppForActions.id, {
                                customerId: c.id,
                                customerName: c.name,
                                customerPhone: c.phone,
                                area: c.area || selectedOppForActions.area
                              });
                              showToast(`تم ربط الفرصة بالعميل "${c.name}" بنجاح`, "success");
                              setSelectedOppForActions(null);
                              setCustomerSearch("");
                            }}
                            className="w-full p-2 bg-[#202225] hover:bg-[#C8A75A] hover:text-[#111111] rounded-lg text-right font-bold transition-colors flex items-center justify-between gap-2 cursor-pointer border border-[#292B2E]"
                          >
                            <span>{c.name}</span>
                            <span className="font-mono text-[10px] text-[#A1A1AA] hover:text-[#111111]">{c.phone}</span>
                          </button>
                        ))}
                      {customers.filter(
                        (c) =>
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          (c.phone && c.phone.includes(customerSearch))
                      ).length === 0 && (
                        <p className="p-3 text-center text-[#A1A1AA]">لا يوجد عملاء مطابقين للبحث.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Opportunity Timeline & Document History */}
                <div className="space-y-3 pt-2 border-t border-[#292B2E]">
                  <h4 className="font-bold text-[#C8A75A] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#C8A75A]" />
                    <span>سجل الأحداث والوثائق المرتبطة بالفرصة (Opportunity Timeline)</span>
                  </h4>
                  <div className="space-y-2 bg-[#111111] p-3 rounded-2xl border border-[#292B2E] max-h-48 overflow-y-auto">
                    {(() => {
                      const oppInteractions = interactions.filter(
                        (i) => i.relatedEntityId === selectedOppForActions.id || (selectedOppForActions.customerId && i.customerId === selectedOppForActions.customerId)
                      );
                      const oppFollowUps = followUps.filter(
                        (f) => f.opportunityId === selectedOppForActions.id || (selectedOppForActions.customerId && f.customerId === selectedOppForActions.customerId)
                      );
                      const oppQuotations = quotations.filter(
                        (q) => q.opportunityId === selectedOppForActions.id || (selectedOppForActions.quotationId && q.id === selectedOppForActions.quotationId)
                      );

                      const items = [
                        ...oppInteractions.map((i) => ({
                          id: i.id,
                          date: i.date || i.createdAt || "غير محدد",
                          type: "interaction",
                          title: i.type === "status_change" ? "تغيير مرحلة بيعية" : i.type,
                          notes: i.notes,
                        })),
                        ...oppFollowUps.map((f) => ({
                          id: f.id,
                          date: f.dueDate,
                          type: "followup",
                          title: `متابعة (${f.status})`,
                          notes: f.title + " - " + (f.notes || ""),
                        })),
                        ...oppQuotations.map((q) => ({
                          id: q.id,
                          date: q.createdAt || "غير محدد",
                          type: "quotation",
                          title: `عرض سعر #${q.quoteNumber} (${q.status})`,
                          notes: `القيمة: ${q.totalAmount.toLocaleString()} ج.م`,
                        })),
                      ];

                      if (items.length === 0) {
                        return <div className="text-center text-[#A1A1AA] py-3 text-xs">لا توجد أحداث مسجلة بعد على هذه الفرصة.</div>;
                      }

                      return items.map((it) => (
                        <div key={it.id} className="p-2 bg-[#18191B] rounded-xl border border-[#292B2E] flex items-start justify-between text-xs">
                          <div>
                            <div className="font-bold text-[#EDEDED] flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#C8A75A]"></span>
                              <span>{it.title}</span>
                            </div>
                            {it.notes && <div className="text-[11px] text-[#A1A1AA] mt-0.5">{it.notes}</div>}
                          </div>
                          <span className="text-[10px] text-[#6B7280] font-mono shrink-0">{it.date}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Extra Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-[#292B2E]">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOpp(selectedOppForActions);
                        setSelectedOppForActions(null);
                      }}
                      className="px-4 py-2 bg-[#202225] border border-[#292B2E] hover:border-[#C8A75A] hover:text-[#C8A75A] text-[#EDEDED] font-bold rounded-xl transition-all cursor-pointer"
                    >
                      تعديل بيانات الفرصة
                    </button>
                    {canDeleteRecords && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingOpp(selectedOppForActions);
                          setSelectedOppForActions(null);
                        }}
                        className="px-4 py-2 bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/40 text-rose-400 font-bold rounded-xl transition-all cursor-pointer"
                      >
                        حذف الفرصة
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOppForActions(null);
                      setCustomerSearch("");
                    }}
                    className="px-4 py-2 text-[#A1A1AA] hover:text-[#EDEDED] font-bold rounded-xl cursor-pointer"
                  >
                    إغلاق التفاصيل
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Interactive Create Customer from Opportunity Modal */}
      {creatingCustomerOpp && (
        <CreateCustomerFromOppModal
          isOpen={!!creatingCustomerOpp}
          opportunity={creatingCustomerOpp}
          onClose={() => setCreatingCustomerOpp(null)}
          onSuccess={() => setCreatingCustomerOpp(null)}
        />
      )}

      {/* Interactive Delete Opportunity Confirmation Modal */}
      {deletingOpp && (
        <DeleteOpportunityConfirmModal
          isOpen={!!deletingOpp}
          opportunity={deletingOpp}
          onClose={() => setDeletingOpp(null)}
          onSuccess={() => setDeletingOpp(null)}
        />
      )}

      {/* Quote Sent Prompt Modal */}
      {showQuoteSentPrompt && quoteSentPromptOpp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-3xl max-w-md w-full p-6 space-y-5 text-right text-[#EDEDED] shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#292B2E] pb-3">
              <h3 className="font-bold text-sm text-[#C8A75A]">تحديث المرحلة إلى "تم إرسال العرض"</h3>
              <button
                type="button"
                onClick={() => {
                  setShowQuoteSentPrompt(false);
                  setQuoteSentPromptOpp(null);
                }}
                className="text-[#A1A1AA] hover:text-[#EDEDED] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              الفرصة البيعية (<strong className="text-[#EDEDED]">{quoteSentPromptOpp.title}</strong>) غير مرتبطة بعرض سعر قائم. يرجى اختيار إجراء:
            </p>
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowQuoteSentPrompt(false);
                  setSelectedOppForActions(quoteSentPromptOpp);
                  setShowLinkSelector(true);
                }}
                className="w-full p-3 bg-[#202225] hover:bg-[#292B2E] border border-[#292B2E] rounded-2xl text-xs font-bold text-emerald-400 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>1. ربط بعرض سعر قائم بالنظام</span>
                <Link2 className="w-4 h-4 text-emerald-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetOpp = quoteSentPromptOpp;
                  setShowQuoteSentPrompt(false);
                  setQuoteSentPromptOpp(null);
                  navigateToTabWithFilter("quotations", { searchQuery: targetOpp.customerName || "" });
                }}
                className="w-full p-3 bg-[#202225] hover:bg-[#292B2E] border border-[#292B2E] rounded-2xl text-xs font-bold text-[#C8A75A] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>2. الانتقال لإنشاء عرض سعر جديد</span>
                <Plus className="w-4 h-4 text-[#C8A75A]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const cfg = OPPORTUNITY_STAGES_CONFIG.find((s) => s.id === "quote_sent");
                  updateOpportunity(quoteSentPromptOpp.id, {
                    stage: "quote_sent",
                    nextAction: cfg?.defaultAction || quoteSentPromptOpp.nextAction,
                  });
                  showToast("تم تحديث المرحلة إلى تم إرسال العرض بدون إنشاء عرض سعر", "success");
                  setShowQuoteSentPrompt(false);
                  setQuoteSentPromptOpp(null);
                }}
                className="w-full p-3 bg-[#202225] hover:bg-[#292B2E] border border-[#292B2E] rounded-2xl text-xs font-bold text-[#EDEDED] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>3. التحديث فقط إلى "تم إرسال العرض"</span>
                <CheckCircle2 className="w-4 h-4 text-[#A1A1AA]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
