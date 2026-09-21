import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import {
  Customer,
  Interaction,
  InterestLevel,
  CustomerStage,
  QuoteStatus,
  CollectionStatus,
  PaymentMethod,
  CompanyId,
  Quotation,
  Contract,
  InquiryStage,
} from "../../types";
import {
  getCustomer360Relations,
  KPIEngineDataSnapshot,
} from "../../utils/kpiEngine";
import {
  X,
  Edit3,
  User,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Flame,
  FileSpreadsheet,
  FileCheck2,
  Receipt,
  Ruler,
  Clock,
  MessageCircle,
  Plus,
  CheckCircle2,
  Send,
  AlertCircle,
  History,
  Edit2,
  Target,
  Trophy,
  ArrowLeft,
  Trash2,
  DollarSign,
  Check,
  CreditCard,
  Printer,
  ChevronRight,
  HelpCircle,
  Filter,
  Search,
  FileText,
  TrendingUp,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { CustomerEditModal } from "./CustomerEditModal";
import { analyzeCustomerJourney } from "../../utils/nestaIntelligence";
import { OPPORTUNITY_STAGES_CONFIG } from "../../utils/salesOperations";

const STAGES_FLOW: { stage: CustomerStage; label: string; icon: string }[] = [
  { stage: "inquiry", label: "استفسار", icon: "💬" },
  { stage: "contacted", label: "تواصل", icon: "📞" },
  { stage: "inspection", label: "معاينة", icon: "🏠" },
  { stage: "quotation", label: "عرض سعر", icon: "📄" },
  { stage: "negotiation", label: "تفاوض", icon: "🤝" },
  { stage: "contracted", label: "تعاقد", icon: "🏆" },
];

export const Customer360Modal: React.FC = () => {
  const {
    selectedCustomerIdFor360,
    setSelectedCustomerIdFor360,
    customers,
    companies,
    users,
    interactions,
    quotations,
    contracts,
    payments,
    inquiries,
    inspections,
    followUps,
    opportunities,
    sales,
    updateCustomer,
    addInteraction,
    addFollowUp,
    addQuotation,
    updateQuotation,
    updateQuotationStatus,
    deleteQuotation,
    addContract,
    updateContract,
    updateContractCollectionStatus,
    deleteContract,
    addPayment,
    updatePayment,
    deletePayment,
    addInspection,
    updateInspection,
    updateInquiry,
    batchUpdateFollowUps,
    updateSale,
    updateInteraction,
    deleteInquiry,
    deleteFollowUp,
    deleteInspection,
    deleteSale,
    deleteInteraction,
    setSelectedQuotationForPrint,
    setCurrentTab,
    showToast,
    currentUser,
    canDeleteRecords,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    "timeline" | "quotations" | "contracts" | "inquiries" | "inspections" | "intelligence"
  >("timeline");
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  // Modals & form popups inside 360
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);

  // Inline editing states for quotation & contract amounts
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editingQuoteAmount, setEditingQuoteAmount] = useState<number>(0);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [editingContractValue, setEditingContractValue] = useState<number>(0);

  // Interaction Form
  const [interactionType, setInteractionType] = useState<Interaction["type"]>("call");
  const [interactionNotes, setInteractionNotes] = useState("");
  const [interactionResult, setInteractionResult] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [interactionDate, setInteractionDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Quotation Form
  const [newQuoteAmount, setNewQuoteAmount] = useState<number>(35000);
  const [newQuoteNotes, setNewQuoteNotes] = useState("");
  const [newQuoteValidityDays, setNewQuoteValidityDays] = useState<number>(15);

  // Contract Form
  const [newContractDate, setNewContractDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [newContractValue, setNewContractValue] = useState<number>(45000);
  const [newContractDownPayment, setNewContractDownPayment] = useState<number>(20000);
  const [newContractDeliveryDate, setNewContractDeliveryDate] = useState(
    new Date(Date.now() + 25 * 86400000).toISOString().split("T")[0]
  );
  const [newContractNotes, setNewContractNotes] = useState("");
  const [selectedQuotationForContract, setSelectedQuotationForContract] = useState<string>("");

  // Payment Form
  const [paymentTargetContractId, setPaymentTargetContractId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number>(10000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [paymentReceiptNumber, setPaymentReceiptNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Inspection Form
  const [inspectionDate, setInspectionDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0]
  );
  const [inspectionSurveyor, setInspectionSurveyor] = useState("فني المعاينات");
  const [inspectionNotes, setInspectionNotes] = useState("");

  const [timelineFilter, setTimelineFilter] = useState<
    "all" | "interactions" | "inquiries_followups" | "quotations" | "inspections" | "contracts_payments"
  >("all");
  const [timelineSearch, setTimelineSearch] = useState("");

  const rawCustomer = selectedCustomerIdFor360
    ? customers.find((c) => c.id === selectedCustomerIdFor360)
    : undefined;

  const isAllowedCompany = !rawCustomer ? false : (
    !currentUser || 
    currentUser.role === "owner" || 
    currentUser.allowedCompanyIds.includes("all") || 
    currentUser.allowedCompanyIds.includes(rawCustomer.companyId)
  );

  const customer = rawCustomer && isAllowedCompany ? rawCustomer : undefined;

  const snapshot: KPIEngineDataSnapshot = useMemo(() => {
    return {
      companies,
      customers,
      inquiries,
      followUps,
      opportunities,
      quotations,
      inspections,
      contracts,
      sales,
      payments,
    };
  }, [
    companies,
    customers,
    inquiries,
    followUps,
    opportunities,
    quotations,
    inspections,
    contracts,
    sales,
    payments,
  ]);

  const customerRelations = useMemo(() => {
    if (!customer) return null;
    return getCustomer360Relations(customer, snapshot);
  }, [customer, snapshot]);

  const customerInteractions = customer ? interactions.filter((i) => i.customerId === customer.id) : [];
  const customerQuotations = customerRelations?.quotations || [];
  const customerContracts = customerRelations?.contracts || [];
  const customerPayments = customerRelations?.payments || [];
  const customerInquiries = customerRelations?.inquiries || [];
  const customerInspections = customerRelations?.inspections || [];
  const customerFollowUps = customerRelations?.followUps || [];
  const customerSales = customerRelations?.sales || [];
  const customerOpp = customer ? opportunities.find((o) => o.customerId === customer.id) : undefined;

  // Dynamically calculate these to ensure absolute accuracy and single source of truth
  const dynamicTotalSales = customerRelations?.totalSalesValue || 0;
  const dynamicTotalQuotations = customerRelations?.totalQuotationsValue || 0;

  React.useEffect(() => {
    if (customer) {
      const custFollowups = followUps.filter((f) => f.customerId === customer.id);
      if (custFollowups.length > 0 && custFollowups[0].dueDate) {
        setNewContractDate(custFollowups[0].dueDate);
      } else {
        setNewContractDate(new Date().toISOString().split("T")[0]);
      }
    }
  }, [customer?.id, followUps]);

  const parseEventDate = (d: string): number => {
    if (!d) return 0;
    const t = new Date(d).getTime();
    if (!isNaN(t) && t > 0) return t;
    const match = d.match(/(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
    if (match) {
      const p1 = parseInt(match[1], 10);
      const p2 = parseInt(match[2], 10);
      const p3 = parseInt(match[3], 10);
      if (p1 > 1000) return new Date(p1, p2 - 1, p3).getTime();
      if (p3 > 1000) return new Date(p3, p2 - 1, p1).getTime();
    }
    return 0;
  };

  // Helper to reliably resolve canonical record ID regardless of UI timeline prefix
  const resolveTargetId = (target: string, collection: Array<{ id: string }>) => {
    if (!target) return "";
    const exact = collection.find((item) => item.id === target);
    if (exact) return exact.id;
    const clean = target.replace(/^(sale|contract|ctr|inquiry|inq|quotation|quote|inspection|insp|payment|pay|inter|opp|followup|fu)-/i, "");
    const foundClean = collection.find((item) => item.id === clean);
    if (foundClean) return foundClean.id;
    const fuzzy = collection.find((item) => item.id.endsWith(clean) || clean.endsWith(item.id));
    if (fuzzy) return fuzzy.id;
    return target;
  };

  // Comprehensive unified timeline combining all historical customer touchpoints
  const handleDeleteEvent = () => {
    if (!editingEvent) return;
    const { id, rawId, category } = editingEvent;
    const target = rawId || id;
    try {
      switch (category) {
        case "inquiry": {
          const actualId = resolveTargetId(target, inquiries);
          deleteInquiry(actualId);
          break;
        }
        case "followup": {
          const actualId = resolveTargetId(target, followUps);
          deleteFollowUp(actualId);
          break;
        }
        case "quotation": {
          const actualId = resolveTargetId(target, quotations);
          deleteQuotation(actualId);
          break;
        }
        case "inspection": {
          const actualId = resolveTargetId(target, inspections);
          if (deleteInspection) deleteInspection(actualId);
          break;
        }
        case "contract": {
          const actualId = resolveTargetId(target, contracts);
          deleteContract(actualId);
          break;
        }
        case "payment": {
          const actualId = resolveTargetId(target, payments);
          deletePayment(actualId);
          break;
        }
        case "sale": {
          const actualId = resolveTargetId(target, sales);
          deleteSale(actualId);
          break;
        }
        case "call":
        case "message":
        case "note":
        case "status": {
          const actualId = resolveTargetId(target, interactions);
          deleteInteraction(actualId);
          break;
        }
      }
      showToast("تم حذف الحدث من السجل بنجاح", "info");
      setEditingEvent(null);
    } catch (e) {
      console.error(e);
      showToast("حدث خطأ أثناء حذف الحدث", "error");
    }
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    const { id, rawId, category, date, notes, amount } = editingEvent;
    const target = rawId || id;
    
    try {
      switch (category) {
        case "inquiry": {
          const actualId = resolveTargetId(target, inquiries);
          updateInquiry(actualId, { date, details: notes });
          break;
        }
        case "followup": {
          const actualId = resolveTargetId(target, followUps);
          batchUpdateFollowUps([actualId], { dueDate: date, notes });
          break;
        }
        case "quotation": {
          const actualId = resolveTargetId(target, quotations);
          updateQuotation(actualId, { date, notes, totalAmount: amount });
          break;
        }
        case "inspection": {
          const actualId = resolveTargetId(target, inspections);
          updateInspection(actualId, { date, notes });
          break;
        }
        case "contract": {
          const actualId = resolveTargetId(target, contracts);
          updateContract(actualId, { date, notes, totalValue: amount });
          break;
        }
        case "payment": {
          const actualId = resolveTargetId(target, payments);
          updatePayment(actualId, { date, notes, amount });
          break;
        }
        case "sale": {
          const actualId = resolveTargetId(target, sales);
          updateSale(actualId, { date, notes, amount });
          break;
        }
        case "call":
        case "message":
        case "note":
        case "status": {
          const actualId = resolveTargetId(target, interactions);
          updateInteraction(actualId, { date, notes });
          break;
        }
      }
      showToast("تم تحديث تاريخ وتفاصيل الحدث بنجاح ✅", "success");
      setEditingEvent(null);
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء حفظ التعديل", "error");
    }
  };

  const unifiedTimeline = React.useMemo(() => {
    const list: Array<{
      id: string;
      rawId?: string;
      group: "interactions" | "inquiries_followups" | "quotations" | "inspections" | "contracts_payments";
      category: string;
      categoryLabel: string;
      title: string;
      date: string;
      rawDate: number;
      notes?: string;
      amount?: number;
      result?: string;
      nextStep?: string;
      meta?: string;
      statusBadge?: { text: string; bg: string; color: string };
      iconBg: string;
      iconColor: string;
      iconType: "call" | "message" | "note" | "status" | "quote" | "contract" | "payment" | "inspection" | "inquiry" | "followup" | "opportunity";
      actionLabel?: string;
      actionHandler?: () => void;
    }> = [];

    // 1. Direct Interactions & Notes
    customerInteractions.forEach((item) => {
      let catLabel = "سجل تفاعل";
      let iconType: any = "note";
      let iconBg = "bg-slate-100";
      let iconColor = "text-slate-700";

      if (item.type === "call") {
        catLabel = "مكالمة هاتفية";
        iconType = "call";
        iconBg = "bg-emerald-100";
        iconColor = "text-emerald-700";
      } else if (item.type === "message") {
        catLabel = "رسالة واتساب";
        iconType = "message";
        iconBg = "bg-green-100";
        iconColor = "text-green-700";
      } else if (item.type === "status_change") {
        catLabel = "تحديث مسار العميل";
        iconType = "status";
        iconBg = "bg-blue-100";
        iconColor = "text-blue-700";
      } else if (item.type === "quotation") {
        catLabel = "عرض سعر مسجل";
        iconType = "quote";
        iconBg = "bg-indigo-100";
        iconColor = "text-indigo-700";
      } else if (item.type === "inspection") {
        catLabel = "معاينة مسجلة";
        iconType = "inspection";
        iconBg = "bg-cyan-100";
        iconColor = "text-cyan-700";
      } else if (item.type === "contract") {
        catLabel = "توقيع عقد مسجل";
        iconType = "contract";
        iconBg = "bg-emerald-100";
        iconColor = "text-emerald-700";
      } else if (item.type === "payment") {
        catLabel = "سداد دفعة مسجل";
        iconType = "payment";
        iconBg = "bg-teal-100";
        iconColor = "text-teal-700";
      }

      list.push({
        id: `inter-${item.id}`,
        rawId: item.id,
        group: "interactions",
        category: item.type,
        categoryLabel: catLabel,
        title: item.notes ? (item.notes.length > 55 ? item.notes.substring(0, 55) + "..." : item.notes) : catLabel,
        date: item.date,
        rawDate: parseEventDate(item.date),
        notes: item.notes,
        result: item.result,
        nextStep: item.nextStep,
        iconBg,
        iconColor,
        iconType,
      });
    });

    // 2. Customer Inquiries
    customerInquiries.forEach((inq) => {
      list.push({
        id: `inq-${inq.id}`,
        rawId: inq.id,
        group: "inquiries_followups",
        category: "inquiry",
        categoryLabel: "استفسار وارد",
        title: `استفسار: ${inq.productType || "استفسار منتجات"}`,
        date: inq.date,
        rawDate: parseEventDate(inq.date),
        notes: inq.details || "طلب تفاصيل واستفسار جديد من العميل",
        meta: `المسؤول: ${inq.responsible || "مسؤول المبيعات"} • المنطقة: ${inq.area || "غير محددة"}`,
        nextStep: inq.nextFollowUpDate ? `متابعة مجدولة بتاريخ: ${inq.nextFollowUpDate}` : undefined,
        statusBadge: {
          text: inq.stage === "inquiry" ? "استفسار جديد" : inq.stage === "contacted" ? "تم التواصل" : inq.stage,
          bg: "bg-slate-100",
          color: "text-slate-800",
        },
        iconBg: "bg-sky-100",
        iconColor: "text-sky-700",
        iconType: "inquiry",
      });
    });

    // 3. Follow-ups
    customerFollowUps.forEach((f) => {
      list.push({
        id: `fu-${f.id}`,
        rawId: f.id,
        group: "inquiries_followups",
        category: "followup",
        categoryLabel: "متابعة بيعية",
        title: f.title || "متابعة مع العميل",
        date: f.dueDate + (f.time ? ` (${f.time})` : ""),
        rawDate: parseEventDate(f.dueDate),
        notes: f.notes,
        statusBadge:
          f.status === "completed"
            ? { text: "مكتملة بنجاح ✅", bg: "bg-emerald-100", color: "text-emerald-800" }
            : f.status === "cancelled"
            ? { text: "ملغاة", bg: "bg-stone-100", color: "text-stone-700" }
            : { text: "قيد المتابعة ⏳", bg: "bg-amber-100", color: "text-amber-800" },
        result: f.status === "completed" ? "تمت المتابعة وتحديث العميل" : undefined,
        iconBg: "bg-purple-100",
        iconColor: "text-purple-700",
        iconType: "followup",
      });
    });

    // 4. Quotations
    customerQuotations.forEach((q) => {
      list.push({
        id: `quote-${q.id}`,
        rawId: q.id,
        group: "quotations",
        category: "quotation",
        categoryLabel: "عرض أسعار",
        title: `عرض سعر رقم: ${q.quoteNumber}`,
        date: q.date,
        rawDate: parseEventDate(q.date),
        amount: q.totalAmount,
        notes: q.summaryDescription || q.notes || `${q.items?.length || 1} بنود مقايسة وأسعار مفصلة`,
        meta: q.expiryDate ? `صلاحية العرض حتى: ${q.expiryDate}` : undefined,
        statusBadge:
          q.status === "accepted"
            ? { text: "معتمد ومقبول ✅", bg: "bg-emerald-100", color: "text-emerald-800" }
            : q.status === "rejected"
            ? { text: "مرفوض ❌", bg: "bg-rose-100", color: "text-rose-800" }
            : q.status === "negotiation"
            ? { text: "في مرحلة التفاوض 🤝", bg: "bg-purple-100", color: "text-purple-800" }
            : { text: "مُرسل للعميل 📄", bg: "bg-blue-100", color: "text-blue-800" },
        actionLabel: "عرض وطباعة",
        actionHandler: () => setSelectedQuotationForPrint(q),
        iconBg: "bg-indigo-100",
        iconColor: "text-indigo-700",
        iconType: "quote",
      });
    });

    // 5. Inspections
    customerInspections.forEach((insp) => {
      list.push({
        id: `insp-${insp.id}`,
        rawId: insp.id,
        group: "inspections",
        category: "inspection",
        categoryLabel: "معاينة موقع",
        title: `معاينة هندسية: ${insp.area || "موقع العميل"}`,
        date: insp.date,
        rawDate: parseEventDate(insp.date),
        notes: insp.notes || "رفع المقاسات وفحص الموقع على الطبيعة",
        meta: `الفني المعاين: ${insp.surveyor || "الفني المختص"}`,
        statusBadge:
          insp.result === "completed"
            ? { text: "تمت المعاينة بنجاح ✅", bg: "bg-cyan-100", color: "text-cyan-800" }
            : insp.result === "cancelled"
            ? { text: "ملغاة", bg: "bg-stone-100", color: "text-stone-700" }
            : { text: "معاينة مجدولة 📅", bg: "bg-amber-100", color: "text-amber-800" },
        iconBg: "bg-cyan-100",
        iconColor: "text-cyan-700",
        iconType: "inspection",
      });
    });

    // 6. Contracts
    customerContracts.forEach((ctr) => {
      list.push({
        id: `contract-${ctr.id}`,
        rawId: ctr.id,
        group: "contracts_payments",
        category: "contract",
        categoryLabel: "عقد تعاقد",
        title: `توقيع عقد رقم: ${ctr.contractNumber}`,
        date: ctr.signDate || ctr.date,
        rawDate: parseEventDate(ctr.signDate || ctr.date),
        amount: ctr.totalValue,
        notes: ctr.notes || `دفعة مقدمة: ${(ctr.downPayment || 0).toLocaleString()} ج.م • متبقي: ${(ctr.remainingAmount || 0).toLocaleString()} ج.م`,
        meta: ctr.expectedDeliveryDate ? `موعد التسليم المتوقع: ${ctr.expectedDeliveryDate}` : undefined,
        statusBadge:
          ctr.collectionStatus === "completed"
            ? { text: "عقد محصل بالكامل ✅", bg: "bg-emerald-100", color: "text-emerald-800" }
            : ctr.collectionStatus === "partial"
            ? { text: "تحصيل جزئي ⚠️", bg: "bg-amber-100", color: "text-amber-800" }
            : { text: "بانتظار بدء التحصيل", bg: "bg-blue-100", color: "text-blue-800" },
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-700",
        iconType: "contract",
      });
    });

    // 7. Payments
    customerPayments.forEach((pay) => {
      list.push({
        id: `pay-${pay.id}`,
        rawId: pay.id,
        group: "contracts_payments",
        category: "payment",
        categoryLabel: "تحصيل مالي",
        title: `تحصيل دفعة مالية بقيمة ${(pay.amount || 0).toLocaleString()} ج.م`,
        date: pay.date,
        rawDate: parseEventDate(pay.date),
        amount: pay.amount,
        notes: pay.notes || "سداد دفعة حسابية ومستحقات",
        meta: `طريقة الدفع: ${pay.method === "cash" ? "نقداً" : pay.method === "instapay" ? "إنستاباي" : pay.method === "bank_transfer" ? "تحويل بنكي" : pay.method} ${pay.receiptNumber ? `• رقم الإيصال: ${pay.receiptNumber}` : ""}`,
        statusBadge: { text: "دفعة مسددة ومسجلة 💰", bg: "bg-teal-100", color: "text-teal-800" },
        iconBg: "bg-teal-100",
        iconColor: "text-teal-700",
        iconType: "payment",
      });
    });

    // 8. Opportunity
    if (customerOpp) {
      list.push({
        id: `opp-${customerOpp.id}`,
        rawId: customerOpp.id,
        group: "interactions",
        category: "opportunity",
        categoryLabel: "فرصة بيعية",
        title: `فرصة بيعية: ${customerOpp.title}`,
        date: customerOpp.createdAt,
        rawDate: parseEventDate(customerOpp.createdAt),
        amount: customerOpp.expectedValue,
        notes: customerOpp.notes || (customerOpp.status === "lost" ? `سبب الخسارة: ${customerOpp.lossReason || "غير محدد"}` : `الإجراء التالي: ${customerOpp.nextAction || "متابعة العميل"}`),
        meta: `المرحلة: ${customerOpp.stage}`,
        statusBadge:
          customerOpp.status === "won"
            ? { text: "فرصة رابحة (Won) 🎉", bg: "bg-emerald-100", color: "text-emerald-800" }
            : customerOpp.status === "lost"
            ? { text: "فرصة خاسرة (Lost) ❌", bg: "bg-rose-100", color: "text-rose-800" }
            : { text: `فرصة جارية (${customerOpp.stage})`, bg: "bg-amber-100", color: "text-amber-800" },
        iconBg: "bg-amber-100",
        iconColor: "text-amber-700",
        iconType: "opportunity",
      });
    }

    // 9. Sales
    customerSales.forEach((sale) => {
      list.push({
        id: `sale-${sale.id}`,
        rawId: sale.id,
        group: "contracts_payments",
        category: "sale",
        categoryLabel: "عملية بيع",
        title: `بيع مؤكد بقيمة ${(sale.amount || 0).toLocaleString()} ج.م`,
        date: sale.date,
        rawDate: parseEventDate(sale.date),
        amount: sale.amount,
        notes: sale.notes || "تم تسجيل المبيعات",
        statusBadge: { text: "بيع مؤكد 💰", bg: "bg-emerald-100", color: "text-emerald-800" },
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-700",
        iconType: "status",
      });
    });

    // Deduplicate status changes chronologically and filter out system duplicates of real entities
    const getStageFromNotes = (notes: string): string => {
      if (!notes) return "";
      const normalized = notes.toLowerCase();
      const stages = [
        "inquiry",
        "inspection",
        "quotation",
        "contracted",
        "satisfied",
        "qualified",
        "needs_inspection",
        "inspection_completed",
        "quote_sent",
      ];
      for (const s of stages) {
        if (normalized.includes(s)) return s;
      }
      return notes;
    };

    const statusChanges = list
      .filter((item) => item.category === "status_change")
      .sort((a, b) => a.rawDate - b.rawDate);

    const allowedStatusChangeIds = new Set<string>();
    let lastStage = "";
    statusChanges.forEach((sc) => {
      const stage = getStageFromNotes(sc.notes || "");
      if (stage && stage !== lastStage) {
        allowedStatusChangeIds.add(sc.id);
        lastStage = stage;
      }
    });

    const filteredList = list.filter((item) => {
      // 1. If it's a status change, only allow if it represents a real transition
      if (item.category === "status_change") {
        return allowedStatusChangeIds.has(item.id);
      }

      // 2. Hide direct interactions that duplicate real entities
      if (item.group === "interactions") {
        const toHide = [
          "inquiry",
          "followup",
          "quotation",
          "inspection",
          "contract",
          "payment",
          "sale",
          "opportunity",
        ];
        if (toHide.includes(item.category)) {
          return false;
        }

        // Hide system-generated notes
        if (item.category === "note") {
          const notesText = item.notes || "";
          if (
            notesText.includes("تم إنشاء العميل") ||
            notesText.includes("استفسار جديد") ||
            notesText.includes("جدولة معاينة") ||
            notesText.includes("تم توقيع العقد") ||
            notesText.includes("تحصيل دفعة مالية") ||
            notesText.includes("تسجيل صفقة بيع")
          ) {
            return false;
          }
        }
      }

      return true;
    });

    // Sort descending by rawDate, fallback to date string
    return filteredList.sort((a, b) => b.rawDate - a.rawDate);
  }, [
    customerInteractions,
    customerInquiries,
    customerFollowUps,
    customerQuotations,
    customerInspections,
    customerContracts,
    customerPayments,
    customerSales,
    customerOpp,
  ]);

  // Filtered timeline view
  const filteredTimeline = React.useMemo(() => {
    return unifiedTimeline.filter((item) => {
      if (timelineFilter !== "all" && item.group !== timelineFilter) {
        return false;
      }
      if (timelineSearch.trim()) {
        const q = timelineSearch.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesNotes = item.notes?.toLowerCase().includes(q);
        const matchesMeta = item.meta?.toLowerCase().includes(q);
        const matchesResult = item.result?.toLowerCase().includes(q);
        const matchesDate = item.date?.toLowerCase().includes(q);
        return matchesTitle || matchesNotes || matchesMeta || matchesResult || matchesDate;
      }
      return true;
    });
  }, [unifiedTimeline, timelineFilter, timelineSearch]);

  if (!selectedCustomerIdFor360 || !customer) return null;

  const isNoName = !customer.name?.trim() || customer.name.startsWith("عميل بدون اسم");
  const company = companies.find((c) => c.id === customer.companyId);

  const todayStr = new Date().toISOString().split("T")[0];

  const handleInterestChange = (newLevel: InterestLevel) => {
    updateCustomer(customer.id, { interestLevel: newLevel });
  };

  const handleStageChange = (newStage: CustomerStage) => {
    if (newStage === customer.stage) return;
    updateCustomer(customer.id, { stage: newStage });
    addInteraction({
      customerId: customer.id,
      companyId: customer.companyId,
      type: "status_change",
      date: new Date().toLocaleString("ar-EG"),
      notes: `تم تغيير مرحلة العميل إلى: ${newStage}`,
      result: "تحديث المسار البيعي",
    });
  };

  const handleSaveInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactionNotes.trim()) return;

    addInteraction({
      customerId: customer.id,
      companyId: customer.companyId,
      type: interactionType,
      date: interactionDate,
      notes: interactionNotes,
      result: interactionResult || "تم التدوين بنجاح",
      nextStep: nextFollowUpDate ? `متابعة بتاريخ ${nextFollowUpDate}` : undefined,
    });

    if (nextFollowUpDate) {
      addFollowUp({
        companyId: customer.companyId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        dueDate: nextFollowUpDate,
        time: "12:00",
        title: `متابعة مع ${customer.name}`,
        notes: interactionNotes,
        status: "pending",
        priority: customer.interestLevel === "hot" ? "high" : "medium",
      });
    }

    setInteractionNotes("");
    setInteractionResult("");
    setNextFollowUpDate("");
    setShowAddInteraction(false);
  };

  // Handle Quick Create Quotation
  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newQuoteAmount) || 0;
    if (amount <= 0) {
      showToast("برجاء إدخال قيمة صحيحة لعرض السعر", "warning");
      return;
    }

    const expDate = new Date(Date.now() + newQuoteValidityDays * 86400000).toISOString().split("T")[0];
    addQuotation({
      companyId: customer.companyId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      area: customer.area,
      date: todayStr,
      expiryDate: expDate,
      status: "draft",
      subtotal: amount,
      discountTotal: 0,
      totalAmount: amount,
      isSummaryQuote: true,
      summaryDescription: newQuoteNotes || `عرض سعر تقريبي مسجل للعميل ${customer.name}`,
      notes: newQuoteNotes || "عرض سعر صادر عبر الملف الشامل للعميل",
      items: [
        {
          id: crypto.randomUUID(),
          description: "أعمال وتوريدات UPVC",
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount,
        },
      ],
    });

    setShowAddQuoteModal(false);
    setNewQuoteNotes("");
    setActiveTab("quotations");
  };

  // Handle Quick Create Contract
  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newContractValue) || 0;
    const down = Number(newContractDownPayment) || 0;

    addContract({
      companyId: customer.companyId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      quotationId: selectedQuotationForContract || undefined,
      area: customer.area,
      date: newContractDate || todayStr,
      signDate: newContractDate || todayStr,
      deliveryDate: newContractDeliveryDate,
      totalValue: val,
      paidAmount: down,
      remainingAmount: Math.max(0, val - down),
      status: "signed",
      collectionStatus: "contracted",
      notes: newContractNotes || "عقد مسجل عبر الملف الشامل للعميل",
    });

    if (down > 0) {
      // Find created contract
      setTimeout(() => {
        const latestCtr = contracts.find((c) => c.customerId === customer.id);
        if (latestCtr) {
          addPayment({
            companyId: customer.companyId,
            customerId: customer.id,
            customerName: customer.name,
            contractId: latestCtr.id,
            amount: down,
            date: todayStr,
            method: "cash",
            notes: "دفعة مقدمة عند إبرام العقد",
          });
        }
      }, 100);
    }

    setShowAddContractModal(false);
    setNewContractNotes("");
    setActiveTab("contracts");
  };

  // Handle Quick Record Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetContractId) {
      showToast("برجاء اختيار العقد المراد تحصيل الدفعة لصالحه", "warning");
      return;
    }
    const amt = Number(paymentAmount) || 0;
    if (amt <= 0) {
      showToast("برجاء إدخال مبلغ صحيح للدفعة", "warning");
      return;
    }

    addPayment({
      companyId: customer.companyId,
      customerId: customer.id,
      customerName: customer.name,
      contractId: paymentTargetContractId,
      amount: amt,
      date: paymentDate,
      method: paymentMethod,
      receiptNumber: paymentReceiptNumber || undefined,
      notes: paymentNotes || "تحصيل مسجل عبر بطاقة العميل 360",
    });

    setShowAddPaymentModal(false);
    setPaymentAmount(0);
    setPaymentNotes("");
    setPaymentReceiptNumber("");
    setActiveTab("contracts");
  };

  // Handle Quick Add Inspection
  const handleAddInspection = (e: React.FormEvent) => {
    e.preventDefault();
    addInspection({
      companyId: customer.companyId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      area: customer.area,
      address: customer.area || "موقع العميل",
      date: inspectionDate,
      surveyor: inspectionSurveyor || "فني المعاينات",
      result: "pending",
      notes: inspectionNotes || "معاينة ورفع مقاسات مسجلة من بطاقة العميل",
      measurementsCount: 0,
    });

    setShowAddInspectionModal(false);
    setInspectionNotes("");
    setActiveTab("inspections");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-[#18191B] rounded-3xl max-w-4xl w-full shadow-2xl border border-[#292B2E] overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Top Header Card */}
        <div className="p-5 sm:p-6 bg-[#111111] text-[#EDEDED] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-[#292B2E]">
          <div className="flex items-start gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-md ${
                isNoName
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-[#C8A75A]/20 text-[#C8A75A] border border-[#C8A75A]/30"
              }`}
            >
              {isNoName ? "?" : customer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {isNoName ? (
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg text-amber-400">
                      عميل بدون اسم (استيراد)
                    </span>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-black transition-colors cursor-pointer"
                    >
                      إدخال الاسم الآن
                    </button>
                  </div>
                ) : (
                  <h2 className="font-black text-lg sm:text-xl text-[#EDEDED]">{customer.name}</h2>
                )}

                {company && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${company.badgeBg} ${company.badgeText}`}
                  >
                    🏢 {company.name}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-lg bg-[#202225] text-[#A1A1AA] border border-[#292B2E]">
                  المصدر: {customer.source}
                </span>

                {/* Assigned Responsible Badge & Quick Select */}
                <div className="flex items-center gap-1.5 bg-[#1a1c1e] border border-[#292B2E] px-2.5 py-0.5 rounded-lg text-xs">
                  <span className="text-[#A1A1AA] text-[11px]">المسؤول:</span>
                  <select
                    value={customer.assignedTo || customer.responsible || ""}
                    onChange={(e) => {
                      const newResp = e.target.value;
                      updateCustomer(customer.id, {
                        assignedTo: newResp || undefined,
                      });
                      showToast(`تم تعيين المسؤول: ${newResp || "غير محدد"}`, "success");
                    }}
                    className="bg-transparent text-xs font-bold text-[#EDEDED] focus:outline-hidden cursor-pointer hover:text-[#C8A75A] transition-colors"
                  >
                    <option value="" className="bg-[#202225] text-[#EDEDED]">
                      -- غير محدد --
                    </option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name} className="bg-[#202225] text-[#EDEDED]">
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#A1A1AA] mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span dir="ltr">{customer.phone || "بدون رقم هاتف"}</span>
                </span>
                {customer.secondaryPhone && (
                  <span className="flex items-center gap-1 text-[#6B7280]">
                    <span dir="ltr">{customer.secondaryPhone}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#C8A75A]" />
                  <span>{customer.area || "غير مدخلة"}</span>
                  {customer.address && <span>({customer.address})</span>}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            {/* Edit / Complete Profile Button */}
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 bg-[#C8A75A] hover:bg-[#d8b76a] text-[#111111] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="تعديل واستكمال بيانات العميل"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#111111]" />
              <span>تعديل البيانات</span>
            </button>

            {/* Direct WhatsApp */}
            {customer.phone && (
              <a
                href={`https://wa.me/2${customer.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>واتساب</span>
              </a>
            )}

            {/* Direct Call */}
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="px-3 py-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#292B2E] transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>اتصال</span>
              </a>
            )}

            <button
              onClick={() => setSelectedCustomerIdFor360(null)}
              className="p-1.5 text-[#A1A1AA] hover:text-[#EDEDED] bg-[#202225] hover:bg-[#292B2E] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Missing Name Alert Banner if imported without name */}
        {isNoName && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-amber-300">
                  تم استيراد هذا العميل من ملف Excel بدون اسم
                </p>
                <p className="text-[#A1A1AA] text-[11px] mt-0.5">
                  تم حفظ كافة بيانات الصف في بطاقة العميل والملاحظات وترك الاسم فارغاً. يمكنك إدخال الاسم وتحديث أي بيانات أخرى عبر الضغط على الزر المقابل.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold shrink-0 shadow-2xs transition-colors cursor-pointer"
            >
              إدخال اسم العميل وتحديث الملف
            </button>
          </div>
        )}

        {/* INTERACTIVE LIFECYCLE STEPPER BAR */}
        <div className="bg-[#111111] text-[#EDEDED] p-3 px-5 border-b border-[#292B2E] shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-[#C8A75A]/20 text-[#C8A75A]">
                <Target className="w-4 h-4" />
              </span>
              <span className="font-bold text-[#A1A1AA]">مسار رحلة العميل:</span>
              <span className="font-black px-2.5 py-0.5 rounded-full text-[11px] bg-[#202225] text-[#C8A75A] border border-[#C8A75A]/30">
                {customerOpp
                  ? OPPORTUNITY_STAGES_CONFIG[customerOpp.stage]?.label || customerOpp.stage
                  : customer.stage === "contracted"
                  ? "تم التعاقد (Won)"
                  : customer.stage}
              </span>
              {customer.stage === "contracted" && (
                <span className="flex items-center gap-1 font-bold text-emerald-400 text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <Trophy className="w-3 h-3" /> تم التعاقد
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#A1A1AA] text-[11px]">تغيير سريع للحالة:</span>
              <select
                value={customer.stage}
                onChange={(e) => handleStageChange(e.target.value as CustomerStage)}
                className="bg-[#202225] border border-[#292B2E] text-[#EDEDED] text-xs px-2.5 py-1 rounded-lg font-bold"
              >
                <option value="inquiry">1. استفسار جديد</option>
                <option value="contacted">2. تم التواصل</option>
                <option value="inspection">3. معاينة ومقاسات</option>
                <option value="quotation">4. عرض سعر</option>
                <option value="negotiation">5. تفاوض</option>
                <option value="contracted">6. تم التعاقد 🤝</option>
                <option value="lost">مفقود (خسارة)</option>
              </select>
            </div>
          </div>

          {/* Stepper Buttons Track */}
          <div className="grid grid-cols-6 gap-1 bg-[#0C0D0E] p-1.5 rounded-xl border border-[#292B2E] text-[11px]">
            {STAGES_FLOW.map((s, idx) => {
              const currentIdx = STAGES_FLOW.findIndex((item) => item.stage === customer.stage);
              const isCurrent = customer.stage === s.stage;
              const isPast = currentIdx >= 0 && idx < currentIdx;

              return (
                <button
                  key={s.stage}
                  onClick={() => handleStageChange(s.stage)}
                  className={`py-1 px-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                    isCurrent
                      ? "bg-[#C8A75A] text-[#111111] shadow-xs font-black ring-1 ring-[#C8A75A]/60"
                      : isPast
                      ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      : "text-[#6B7280] hover:bg-white/5 hover:text-[#A1A1AA]"
                  }`}
                  title={`نقل العميل لمرحلة: ${s.label}`}
                >
                  <span>{s.icon}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                  {isPast && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* FINANCIAL SUMMARY & QUICK METRICS BAR */}
        <div className="p-3 bg-[#18191B] border-b border-[#292B2E] flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#A1A1AA]">درجة الاهتمام:</span>
              <select
                value={customer.interestLevel}
                onChange={(e) => handleInterestChange(e.target.value as InterestLevel)}
                className="bg-[#202225] border border-[#292B2E] px-2 py-1 rounded-lg font-bold text-[#EDEDED] text-xs"
              >
                <option value="hot">🔥 Hot (شراء فوري)</option>
                <option value="warm">🟠 Warm (مهتم ومتابع)</option>
                <option value="cold">🔵 Cold (مبدئي)</option>
                <option value="lost">❌ Lost (خسارة)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[#A1A1AA] font-medium text-xs">
            <span className="bg-[#202225] border border-[#292B2E] px-2.5 py-1 rounded-lg">
              إجمالي العروض:{" "}
              <strong className="text-[#EDEDED] font-bold font-mono">
                {dynamicTotalQuotations.toLocaleString()} ج.م
              </strong>
            </span>
            <span className="bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
              إجمالي المبيعات والتعاقد:{" "}
              <strong className="text-emerald-400 font-bold font-mono">
                {dynamicTotalSales.toLocaleString()} ج.م
              </strong>
            </span>
          </div>
        </div>

        {/* PRIMARY ACTION BAR (Add Call, Add Inspection, Add Quote, Add Contract, Add Payment) */}
        <div className="p-3 bg-[#1D1F21] border-b border-[#292B2E] flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setInteractionType("call");
                setShowAddInteraction(true);
              }}
              className="px-3 py-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] border border-[#292B2E] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>تسجيل مكالمة</span>
            </button>

            <button
              onClick={() => setShowAddInspectionModal(true)}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Ruler className="w-3.5 h-3.5 text-amber-400" />
              <span>جدولة معاينة</span>
            </button>

            <button
              onClick={() => setShowAddQuoteModal(true)}
              className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
              <span>إنشاء عرض سعر</span>
            </button>

            <button
              onClick={() => {
                // If customer has a quote, set it
                if (customerQuotations.length > 0) {
                  const q = customerQuotations[0];
                  setSelectedQuotationForContract(q.id);
                  setNewContractValue(q.totalAmount);
                  setNewContractDownPayment(Math.round(q.totalAmount * 0.5));
                } else {
                  setNewContractValue(35000);
                  setNewContractDownPayment(15000);
                }
                setShowAddContractModal(true);
              }}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>إبرام تعاقد</span>
            </button>

            {customerContracts.length > 0 && (
              <button
                onClick={() => {
                  setPaymentTargetContractId(customerContracts[0]?.id || "");
                  setPaymentAmount(customerContracts[0]?.remainingAmount || 10000);
                  setShowAddPaymentModal(true);
                }}
                className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-teal-400" />
                <span>تحصيل دفعة</span>
              </button>
            )}

            <button
              onClick={() => {
                setInteractionType("note");
                setShowAddInteraction(true);
              }}
              className="px-3 py-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] border border-[#292B2E] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#A1A1AA]" />
              <span>تدوين ملاحظة</span>
            </button>
          </div>

          <div className="text-xs text-[#6B7280] hidden sm:block">
            تاريخ التسجيل: {customer.createdAt}
          </div>
        </div>

        {/* INLINE FORMS */}
        {/* 1. Add Interaction Form */}
        {showAddInteraction && (
          <form
            onSubmit={handleSaveInteraction}
            className="p-4 bg-[#1D1F21] border-b border-[#292B2E] space-y-3 animate-in fade-in shrink-0 text-xs"
          >
            <div className="flex items-center justify-between font-bold text-[#EDEDED]">
              <span>تسجيل تفاعل جديد مع العميل</span>
              <button
                type="button"
                onClick={() => setShowAddInteraction(false)}
                className="text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[#A1A1AA]">نوع التفاعل:</label>
                <select
                  value={interactionType}
                  onChange={(e) => setInteractionType(e.target.value as Interaction["type"])}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg"
                >
                  <option value="call">📞 مكالمة هاتفية</option>
                  <option value="message">💬 رسالة واتساب</option>
                  <option value="inspection">🏠 معاينة ومقاسات</option>
                  <option value="note">📝 ملاحظة سريعة</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#A1A1AA]">تاريخ التفاعل *:</label>
                <input
                  type="date"
                  required
                  value={interactionDate}
                  onChange={(e) => setInteractionDate(e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#A1A1AA]">نتيجة التواصل:</label>
                <input
                  type="text"
                  value={interactionResult}
                  onChange={(e) => setInteractionResult(e.target.value)}
                  placeholder="مثال: وافق على السعر، طلب تعديل، مشغول..."
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] placeholder:text-[#6B7280] rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#A1A1AA]">تاريخ المتابعة القادمة:</label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-1">
                <label className="font-semibold text-[#A1A1AA]">تفاصيل ما دار:</label>
                <textarea
                  rows={2}
                  required
                  value={interactionNotes}
                  onChange={(e) => setInteractionNotes(e.target.value)}
                  placeholder="اكتب خلاصة المكالمة بدقة للرجوع إليها..."
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] placeholder:text-[#6B7280] rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddInteraction(false)}
                className="px-3 py-1.5 text-[#A1A1AA] hover:text-[#EDEDED] rounded-lg hover:bg-[#202225]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#C8A75A] text-[#111111] font-bold rounded-lg hover:bg-[#d8b76a]"
              >
                حفظ في سجل العميل
              </button>
            </div>
          </form>
        )}

        {/* 2. Add Quotation Inline Form */}
        {showAddQuoteModal && (
          <form
            onSubmit={handleCreateQuotation}
            className="p-4 bg-[#1D1F21] border-b border-[#292B2E] space-y-3 animate-in fade-in shrink-0 text-xs"
          >
            <div className="flex items-center justify-between font-bold text-blue-400">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                <span>إنشاء عرض سعر جديد للعميل: {customer.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddQuoteModal(false)}
                className="text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">قيمة عرض السعر (ج.م) *:</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newQuoteAmount}
                  onChange={(e) => setNewQuoteAmount(Number(e.target.value))}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-lg font-bold text-[#EDEDED] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">مدة صلاحية العرض (بالأيام):</label>
                <input
                  type="number"
                  value={newQuoteValidityDays}
                  onChange={(e) => setNewQuoteValidityDays(Number(e.target.value))}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">الشركة المسند إليها:</label>
                <div className="p-2 bg-[#202225] border border-[#292B2E] rounded-lg text-[#EDEDED] font-bold">
                  {company?.name || "الشركة الافتراضية"}
                </div>
              </div>

              <div className="col-span-1 sm:col-span-3 space-y-1">
                <label className="font-bold text-[#A1A1AA]">وصف وبنود المقايسة / ملاحظات:</label>
                <textarea
                  rows={2}
                  value={newQuoteNotes}
                  onChange={(e) => setNewQuoteNotes(e.target.value)}
                  placeholder="مثال: توريد وتركيب شبابيك وأبواب UPVC قطاع ألماني قطاع مفصلي وجرار مع الزجاج المزدوج..."
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] placeholder:text-[#6B7280] rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddQuoteModal(false)}
                className="px-3 py-1.5 text-[#A1A1AA] hover:text-[#EDEDED] rounded-lg hover:bg-[#202225]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-xs"
              >
                حفظ وإصدار عرض السعر
              </button>
            </div>
          </form>
        )}

        {/* 3. Add Contract Inline Form */}
        {showAddContractModal && (
          <form
            onSubmit={handleCreateContract}
            className="p-4 bg-[#1D1F21] border-b border-[#292B2E] space-y-3 animate-in fade-in shrink-0 text-xs"
          >
            <div className="flex items-center justify-between font-bold text-emerald-400">
              <div className="flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>إبرام تعاقد رسمي للعميل: {customer.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddContractModal(false)}
                className="text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">ربط بعرض سعر موجود:</label>
                <select
                  value={selectedQuotationForContract}
                  onChange={(e) => {
                    const qId = e.target.value;
                    setSelectedQuotationForContract(qId);
                    const q = customerQuotations.find((item) => item.id === qId);
                    if (q) {
                      setNewContractValue(q.totalAmount);
                      setNewContractDownPayment(Math.round(q.totalAmount * 0.5));
                    }
                  }}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg font-bold"
                >
                  <option value="">
                    {customerQuotations.length === 0
                      ? "لا توجد عروض أسعار (سيتم إنشاء عرض تاريخي تلقائياً)"
                      : "-- اختر عرض سعر معتمد --"}
                  </option>
                  {customerQuotations.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quoteNumber} — {(q.totalAmount || 0).toLocaleString()} ج.م ({q.date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">إجمالي قيمة العقد (ج.م) *:</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newContractValue}
                  onChange={(e) => setNewContractValue(Number(e.target.value))}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-lg font-bold font-mono text-[#EDEDED]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">المقدم / الدفعة الأولى (ج.م):</label>
                <input
                  type="number"
                  min={0}
                  value={newContractDownPayment}
                  onChange={(e) => setNewContractDownPayment(Number(e.target.value))}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-lg font-bold font-mono text-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">تاريخ التعاقد والحدث:</label>
                <input
                  type="date"
                  value={newContractDate}
                  onChange={(e) => setNewContractDate(e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">تاريخ التسليم المجدول:</label>
                <input
                  type="date"
                  value={newContractDeliveryDate}
                  onChange={(e) => setNewContractDeliveryDate(e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg font-bold"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-1">
                <label className="font-bold text-[#A1A1AA]">ملاحظات وشروط التعاقد:</label>
                <input
                  type="text"
                  value={newContractNotes}
                  onChange={(e) => setNewContractNotes(e.target.value)}
                  placeholder="مثال: تركيب قطاعات UPVC دفعة ثانية بعد التوريد..."
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] placeholder:text-[#6B7280] rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddContractModal(false)}
                className="px-3 py-1.5 text-[#A1A1AA] hover:text-[#EDEDED] rounded-lg hover:bg-[#202225]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-xs"
              >
                تأكيد إبرام العقد وتحديث السجلات
              </button>
            </div>
          </form>
        )}

        {/* 4. Add Payment Inline Form */}
        {showAddPaymentModal && (
          <form
            onSubmit={handleRecordPayment}
            className="p-4 bg-[#1D1F21] border-b border-[#292B2E] space-y-3 animate-in fade-in shrink-0 text-xs"
          >
            <div className="flex items-center justify-between font-bold text-teal-400">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-teal-400" />
                <span>تحصيل دفعة مالية للعميل: {customer.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPaymentModal(false)}
                className="text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">العقد المرتبط بالتحصيل *:</label>
                <select
                  required
                  value={paymentTargetContractId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setPaymentTargetContractId(cid);
                    const ctr = customerContracts.find((c) => c.id === cid);
                    if (ctr && ctr.remainingAmount > 0) {
                      setPaymentAmount(ctr.remainingAmount);
                    }
                  }}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg font-bold"
                >
                  <option value="">-- اختر العقد --</option>
                  {customerContracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      عقد {c.contractNumber} — المتبقي: {(c.remainingAmount || 0).toLocaleString()} ج.م
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">تاريخ الدفعة *:</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">المبلغ المحصل (ج.م) *:</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-lg font-bold font-mono text-teal-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">طريقة الدفع:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg font-bold"
                >
                  <option value="cash">نقداً (كاش)</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="instapay">إنستاباي (InstaPay)</option>
                  <option value="vodafone_cash">فودافون كاش / محفظة</option>
                  <option value="cheque">شيك مصرفي</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">رقم الإيصال / السند (اختياري):</label>
                <input
                  type="text"
                  value={paymentReceiptNumber}
                  onChange={(e) => setPaymentReceiptNumber(e.target.value)}
                  placeholder="مثال: REC-2026-001"
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] placeholder:text-[#6B7280] rounded-lg font-mono"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-1">
                <label className="font-bold text-[#A1A1AA]">ملاحظات وتفاصيل الدفعة:</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="دفعة استلام القطاعات / توريد الزجاج..."
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] placeholder:text-[#6B7280] rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddPaymentModal(false)}
                className="px-3 py-1.5 text-[#A1A1AA] hover:text-[#EDEDED] rounded-lg hover:bg-[#202225]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-xs"
              >
                حفظ الدفعة وتحديث رصيد العقد
              </button>
            </div>
          </form>
        )}

        {/* 5. Add Inspection Inline Form */}
        {showAddInspectionModal && (
          <form
            onSubmit={handleAddInspection}
            className="p-4 bg-[#1D1F21] border-b border-[#292B2E] space-y-3 animate-in fade-in shrink-0 text-xs"
          >
            <div className="flex items-center justify-between font-bold text-amber-400">
              <div className="flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-amber-400" />
                <span>جدولة معاينة ومقاسات للعميل: {customer.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInspectionModal(false)}
                className="text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">تاريخ المعاينة المحدد *:</label>
                <input
                  type="date"
                  required
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-lg font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">اسم الفني / القائم بالمعاينة:</label>
                <input
                  type="text"
                  value={inspectionSurveyor}
                  onChange={(e) => setInspectionSurveyor(e.target.value)}
                  placeholder="اسم الفني أو المهندس"
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] placeholder:text-[#6B7280] rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#A1A1AA]">المنطقة:</label>
                <div className="p-2 bg-[#202225] border border-[#292B2E] rounded-lg text-[#EDEDED] font-bold">
                  {customer.area || "غير محدد"}
                </div>
              </div>

              <div className="col-span-1 sm:col-span-3 space-y-1">
                <label className="font-bold text-[#A1A1AA]">تفاصيل وملاحظات المعاينة:</label>
                <textarea
                  rows={2}
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="رفع مقاسات شبابيك الدور الأول، فحص الفتحات وعزل الصوت..."
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] placeholder:text-[#6B7280] rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddInspectionModal(false)}
                className="px-3 py-1.5 text-[#A1A1AA] hover:text-[#EDEDED] rounded-lg hover:bg-[#202225]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 shadow-xs"
              >
                جدولة المعاينة
              </button>
            </div>
          </form>
        )}

        {/* Tab Navigation inside 360 */}
        <div className="flex border-b border-[#292B2E] px-4 pt-2 bg-[#18191B] gap-4 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("intelligence")}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "intelligence"
                ? "border-purple-400 text-purple-400"
                : "border-transparent text-purple-400/70 hover:text-purple-300"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>NESTA Intelligence</span>
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "timeline"
                ? "border-[#C8A75A] text-[#C8A75A]"
                : "border-transparent text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <History className="w-4 h-4" />
            <span>السجل الزمني الشامل ({unifiedTimeline.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("quotations")}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "quotations"
                ? "border-[#C8A75A] text-[#C8A75A]"
                : "border-transparent text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>عروض الأسعار ({customerQuotations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("contracts")}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "contracts"
                ? "border-[#C8A75A] text-[#C8A75A]"
                : "border-transparent text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>العقود والتحصيلات ({customerContracts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("inspections")}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "inspections"
                ? "border-[#C8A75A] text-[#C8A75A]"
                : "border-transparent text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <Ruler className="w-4 h-4" />
            <span>المعاينات ({customerInspections.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("inquiries")}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "inquiries"
                ? "border-[#C8A75A] text-[#C8A75A]"
                : "border-transparent text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>الاستفسارات ({customerInquiries.length})</span>
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#111111]">
          {/* TAB 0: INTELLIGENCE */}
          {activeTab === "intelligence" && (
            <div className="space-y-4 animate-in fade-in">
              {(() => {
                const insight = analyzeCustomerJourney(customer, followUps, quotations, contracts, opportunities, new Date().toISOString().split('T')[0]);
                
                const statusColors = {
                  healthy: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                  needs_followup: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                  intervention_required: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
                  conflict: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
                };
                
                const statusLabels = {
                  healthy: 'مسار العميل سليم',
                  needs_followup: 'العميل يحتاج متابعة',
                  intervention_required: 'مطلوب تدخل سريع',
                  conflict: 'يوجد تعارض بيانات',
                };

                return (
                  <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-5">
                    <div className="flex items-center gap-3 border-b border-[#292B2E] pb-4">
                      <div className={`p-3 rounded-xl border ${statusColors[insight.status]}`}>
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-[#EDEDED] flex items-center gap-2">
                          تقرير الذكاء الاصطناعي التشغيلي
                        </h3>
                        <p className={`text-sm font-bold mt-1 ${statusColors[insight.status].split(' ')[0]}`}>
                          الحالة: {statusLabels[insight.status]}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-[#A1A1AA]">أسباب التصنيف:</h4>
                      <ul className="space-y-2">
                        {insight.reasons.map((reason, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-[#EDEDED] bg-[#202225] p-3 rounded-xl border border-[#292B2E]">
                            <Target className="w-4 h-4 text-[#C8A75A] shrink-0" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-indigo-300 mb-2">الإجراء التالي المقترح (Next Best Action):</h4>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-sm text-indigo-100 font-medium">
                          {insight.nextAction}
                          {insight.suggestedActionType === 'review_opportunity' && (
                          <button onClick={() => setActiveTab('inquiries')} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors">
                            مراجعة الفرصة (Opportunities)
                          </button>
                        )}
                        {insight.suggestedActionType === 'review_contract' && (
                          <button onClick={() => setActiveTab('contracts')} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors">
                            مراجعة العقود
                          </button>
                        )}
                        {insight.suggestedActionType === 'sync' && (
                          <button onClick={() => {}} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors cursor-not-allowed opacity-70">
                            راجع مركز المزامنة (أعلى الشاشة)
                          </button>
                        )}
                        {insight.suggestedActionType === 'assign' && (
                            <span className="block mt-2 text-xs text-indigo-300">
                              💡 اقتراح التوزيع الذكي: {(() => {
                                const activeUsers = users.filter(u => u.role !== 'admin' && u.role !== 'super_admin');
                                if (activeUsers.length === 0) return 'لا يوجد مسؤولين متاحين';
                                const suggested = activeUsers.reduce((min, u) => {
                                  const uCount = customers.filter(c => c.assignedTo === u.name).length;
                                  const minCount = customers.filter(c => c.assignedTo === min.name).length;
                                  return uCount < minCount ? u : min;
                                });
                                return `تعيين العميل إلى (${suggested.name}) لأنه يمتلك أقل عدد من العملاء المفتوحين.`;
                              })()}
                            </span>
                          )}
                        </p>
                        {insight.suggestedActionType === 'followup' && (
                          <button onClick={() => setShowAddInteraction(true)} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors">
                            تنفيذ المتابعة الآن
                          </button>
                        )}
                        {insight.suggestedActionType === 'assign' && (
                          <button onClick={() => setShowEditModal(true)} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors">
                            تعيين مسؤول
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 1: TIMELINE (Unified Customer Journey & Activity Log) */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              {/* Header: Filters, Search and Quick Action */}
              <div className="bg-[#18191B] p-3 rounded-2xl border border-[#292B2E] space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                    <input
                      type="text"
                      value={timelineSearch}
                      onChange={(e) => setTimelineSearch(e.target.value)}
                      placeholder="بحث في سجل العميل (مكالمة، رقم عرض، عقد، دفعة، ملاحظة)..."
                      className="w-full pl-8 pr-9 py-1.5 text-xs bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:outline-none focus:border-[#C8A75A] placeholder:text-[#6B7280]"
                    />
                    {timelineSearch && (
                      <button
                        onClick={() => setTimelineSearch("")}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#EDEDED] p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Quick Action Button */}
                  <button
                    onClick={() => setShowAddInteraction(true)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#111111] bg-[#C8A75A] hover:bg-[#d8b76a] rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تسجيل نشاط جديد</span>
                  </button>
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold">
                  <span className="text-[#A1A1AA] ml-1 flex items-center gap-1 shrink-0">
                    <Filter className="w-3 h-3" />
                    <span>تصفية:</span>
                  </span>

                  <button
                    onClick={() => setTimelineFilter("all")}
                    className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                      timelineFilter === "all"
                        ? "bg-[#C8A75A] text-[#111111] font-bold shadow-xs"
                        : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
                    }`}
                  >
                    الكل ({unifiedTimeline.length})
                  </button>

                  <button
                    onClick={() => setTimelineFilter("interactions")}
                    className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                      timelineFilter === "interactions"
                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                        : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
                    }`}
                  >
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>اتصالات وملاحظات ({unifiedTimeline.filter((e) => e.group === "interactions").length})</span>
                  </button>

                  <button
                    onClick={() => setTimelineFilter("inquiries_followups")}
                    className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                      timelineFilter === "inquiries_followups"
                        ? "bg-sky-600 text-white font-bold shadow-xs"
                        : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
                    }`}
                  >
                    <HelpCircle className="w-3 h-3 text-sky-400" />
                    <span>استفسارات ومتابعات ({unifiedTimeline.filter((e) => e.group === "inquiries_followups").length})</span>
                  </button>

                  <button
                    onClick={() => setTimelineFilter("quotations")}
                    className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                      timelineFilter === "quotations"
                        ? "bg-indigo-600 text-white font-bold shadow-xs"
                        : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
                    }`}
                  >
                    <FileSpreadsheet className="w-3 h-3 text-indigo-400" />
                    <span>عروض الأسعار ({unifiedTimeline.filter((e) => e.group === "quotations").length})</span>
                  </button>

                  <button
                    onClick={() => setTimelineFilter("inspections")}
                    className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                      timelineFilter === "inspections"
                        ? "bg-cyan-600 text-white font-bold shadow-xs"
                        : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
                    }`}
                  >
                    <Ruler className="w-3 h-3 text-cyan-400" />
                    <span>المعاينات ({unifiedTimeline.filter((e) => e.group === "inspections").length})</span>
                  </button>

                  <button
                    onClick={() => setTimelineFilter("contracts_payments")}
                    className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                      timelineFilter === "contracts_payments"
                        ? "bg-teal-600 text-white font-bold shadow-xs"
                        : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
                    }`}
                  >
                    <FileCheck2 className="w-3 h-3 text-teal-400" />
                    <span>العقود والتحصيلات ({unifiedTimeline.filter((e) => e.group === "contracts_payments").length})</span>
                  </button>
                </div>
              </div>

              {/* Timeline Items Feed */}
              {filteredTimeline.length > 0 ? (
                <div className="relative border-r-2 border-[#292B2E] mr-3.5 space-y-4 pt-1">
                  {filteredTimeline.map((item) => (
                    <div key={item.id} className="relative pr-6 group">
                      {/* Timeline Node Bullet */}
                      <div
                        className={`absolute -right-3.5 top-2 w-7 h-7 rounded-full bg-[#1D1F21] border-2 border-[#292B2E] flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${item.iconBg}`}
                      >
                        {item.iconType === "call" && <Phone className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                        {item.iconType === "message" && <MessageCircle className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                        {item.iconType === "note" && <FileText className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                        {item.iconType === "status" && <TrendingUp className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                        {item.iconType === "inquiry" && <HelpCircle className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                        {item.iconType === "followup" && <Clock className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                        {item.iconType === "quote" && <FileSpreadsheet className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                        {item.iconType === "inspection" && <Ruler className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                        {item.iconType === "contract" && <FileCheck2 className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                        {item.iconType === "payment" && <Receipt className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                        {item.iconType === "opportunity" && <Target className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                      </div>

                      {/* Event Card */}
                      <div className="bg-[#18191B] rounded-2xl p-4 border border-[#292B2E] shadow-xs hover:border-[#3a3d42] transition-all space-y-2.5">
                        {/* Top Line: Category, Date & Status */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 ${item.iconBg} ${item.iconColor}`}
                            >
                              {item.categoryLabel}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEvent({
                                  id: item.rawId || item.id,
                                  rawId: item.rawId || item.id,
                                  category: item.category,
                                  date: item.date ? item.date.split(" ")[0] : "", // grab just the date part if it has time
                                  notes: item.notes || "",
                                  amount: item.amount || 0
                                });
                              }}
                              className="text-[10px] text-[#A1A1AA] hover:text-[#C8A75A] flex items-center gap-1 transition-colors"
                              title="تعديل تفاصيل الحدث"
                            >
                              <Edit3 className="w-3 h-3" />
                              تعديل
                            </button>

                            {item.statusBadge && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${item.statusBadge.bg} ${item.statusBadge.color}`}
                              >
                                {item.statusBadge.text}
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] text-[#A1A1AA] font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#6B7280]" />
                            {item.date}
                          </span>
                        </div>

                        {/* Title & Amount */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#EDEDED] leading-snug">
                            {item.title}
                          </h4>

                          {item.amount !== undefined && item.amount > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-900/60 font-mono">
                              <DollarSign className="w-3 h-3 text-emerald-400" />
                              {item.amount.toLocaleString()} ج.م
                            </span>
                          )}
                        </div>

                        {/* Notes / Details */}
                        {item.notes && (
                          <p className="text-xs text-[#A1A1AA] leading-relaxed font-medium bg-[#202225] p-2.5 rounded-xl border border-[#292B2E]">
                            {item.notes}
                          </p>
                        )}

                        {/* Metadata, Results & Next Steps */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            {item.meta && (
                              <span className="text-[#A1A1AA] font-medium bg-[#202225] px-2 py-0.5 rounded-md border border-[#292B2E]">
                                {item.meta}
                              </span>
                            )}

                            {item.result && (
                              <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md font-semibold border border-emerald-900/50">
                                النتيجة: {item.result}
                              </span>
                            )}

                            {item.nextStep && (
                              <span className="text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded-md font-semibold border border-sky-900/50">
                                الخطوة القادمة: {item.nextStep}
                              </span>
                            )}
                          </div>

                          {/* Optional Action Button */}
                          {item.actionLabel && item.actionHandler && (
                            <button
                              onClick={item.actionHandler}
                              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 px-2.5 py-1 rounded-lg border border-indigo-900/50 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Eye className="w-3 h-3" />
                              <span>{item.actionLabel}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#18191B] rounded-2xl border border-dashed border-[#292B2E] p-8 text-center space-y-2">
                  <History className="w-8 h-8 text-[#6B7280] mx-auto" />
                  <p className="text-xs font-bold text-[#EDEDED]">
                    {timelineSearch
                      ? `لم يتم العثور على نتائج تطابق "${timelineSearch}"`
                      : "لا توجد سجلات تطابق الفلتر المحدد"}
                  </p>
                  <p className="text-[11px] text-[#A1A1AA]">
                    {timelineSearch
                      ? "جرب البحث بكلمات أخرى أو مسح نص البحث."
                      : "يمكنك تسجيل أول مكالمة أو تفاعل باستخدام الزر أعلاه."}
                  </p>
                  {timelineSearch && (
                    <button
                      onClick={() => setTimelineSearch("")}
                      className="text-xs text-[#C8A75A] font-bold hover:underline inline-block mt-2 cursor-pointer"
                    >
                      مسح البحث
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUOTATIONS (With full control: edit amount, edit status, delete, print) */}
          {activeTab === "quotations" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#292B2E]">
                <span className="text-xs font-bold text-[#EDEDED]">
                  عروض الأسعار الصادرة للعميل ({customerQuotations.length})
                </span>
                <button
                  onClick={() => setShowAddQuoteModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء عرض سعر جديد</span>
                </button>
              </div>

              {customerQuotations.map((q) => {
                const isEditing = editingQuoteId === q.id;

                return (
                  <div
                    key={q.id}
                    className="bg-[#18191B] rounded-2xl border border-[#292B2E] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#EDEDED] font-mono">
                          {q.quoteNumber}
                        </span>

                        {/* Editable Status Select */}
                        <select
                          value={q.status}
                          onChange={(e) => {
                            const newSt = e.target.value as QuoteStatus;
                            updateQuotationStatus(q.id, newSt);
                          }}
                          className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border cursor-pointer ${
                            q.status === "accepted"
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                              : q.status === "rejected"
                              ? "bg-rose-950/60 text-rose-300 border-rose-800"
                              : q.status === "negotiation"
                              ? "bg-purple-950/60 text-purple-300 border-purple-800"
                              : "bg-amber-950/60 text-amber-300 border-amber-800"
                          }`}
                        >
                          <option value="draft">مسودة (Draft)</option>
                          <option value="sent">أرسل للعميل (Sent)</option>
                          <option value="negotiation">في التفاوض (Negotiation)</option>
                          <option value="accepted">تمت الموافقة ✅ (Accepted)</option>
                          <option value="rejected">مرفوض ❌ (Rejected)</option>
                        </select>
                      </div>

                      <p className="text-xs text-[#A1A1AA]">
                        تاريخ الإصدار: {q.date} • ينتهي في: {q.expiryDate}
                      </p>

                      {q.summaryDescription && (
                        <p className="text-xs text-[#A1A1AA] bg-[#202225] p-2 rounded-lg border border-[#292B2E]">
                          {q.summaryDescription}
                        </p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                      {/* Editable Amount */}
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            value={editingQuoteAmount}
                            onChange={(e) => setEditingQuoteAmount(Number(e.target.value))}
                            className="w-28 p-1.5 bg-[#202225] border-2 border-emerald-500 rounded-lg text-xs font-bold font-mono text-[#EDEDED]"
                          />
                          <button
                            onClick={() => {
                              if (editingQuoteAmount > 0) {
                                updateQuotation(q.id, { totalAmount: editingQuoteAmount });
                                setEditingQuoteId(null);
                              }
                            }}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                            title="حفظ القيمة"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingQuoteId(null)}
                            className="p-1.5 bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] rounded-lg border border-[#292B2E] cursor-pointer"
                            title="إلغاء"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="text-left font-black text-base text-[#EDEDED] font-mono">
                            {(q.totalAmount || 0).toLocaleString()} ج.م
                          </div>
                          <button
                            onClick={() => {
                              setEditingQuoteId(q.id);
                              setEditingQuoteAmount(q.totalAmount);
                            }}
                            className="p-1 text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225] rounded-lg transition-colors cursor-pointer"
                            title="تعديل قيمة عرض السعر"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedQuotationForPrint(q)}
                          className="px-2.5 py-1.5 bg-[#202225] hover:bg-[#2a2c30] text-[#EDEDED] border border-[#292B2E] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة</span>
                        </button>

                        {canDeleteRecords && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف عرض السعر رقم ${q.quoteNumber}؟`)) {
                                deleteQuotation(q.id);
                              }
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                            title="حذف عرض السعر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {customerQuotations.length === 0 && (
                <div className="text-center py-8 text-[#6B7280] text-xs">
                  لا توجد عروض أسعار مسجلة لهذا العميل بعد. يمكنك إنشاء أول عرض سعر بالضغط على زر "إنشاء عرض سعر جديد" بالأعلى.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTRACTS & PAYMENTS (With full control: edit value, change status, collect, delete) */}
          {activeTab === "contracts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#292B2E]">
                <span className="text-xs font-bold text-[#EDEDED]">
                  العقود والتحصيلات المسجلة ({customerContracts.length})
                </span>
                <button
                  onClick={() => {
                    if (customerQuotations.length > 0) {
                      const q = customerQuotations[0];
                      setSelectedQuotationForContract(q.id);
                      setNewContractValue(q.totalAmount);
                      setNewContractDownPayment(Math.round(q.totalAmount * 0.5));
                    }
                    setShowAddContractModal(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إبرام تعاقد جديد</span>
                </button>
              </div>

              {customerContracts.map((c) => {
                const percentPaid =
                  c.totalValue > 0 ? Math.min(100, Math.round((c.paidAmount / c.totalValue) * 100)) : 0;
                const isEditingVal = editingContractId === c.id;
                const contractPayments = customerPayments.filter((p) => p.contractId === c.id);

                return (
                  <div
                    key={c.id}
                    className="bg-[#18191B] rounded-2xl border border-[#292B2E] p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#EDEDED] font-mono">
                          {c.contractNumber}
                        </span>

                        {/* Editable Collection Status */}
                        <select
                          value={c.collectionStatus || "contracted"}
                          onChange={(e) =>
                            updateContractCollectionStatus(c.id, e.target.value as CollectionStatus)
                          }
                          className="text-xs px-2.5 py-0.5 rounded-lg font-bold border border-[#292B2E] bg-[#202225] text-[#EDEDED] cursor-pointer"
                        >
                          <option value="contracted">تم التعاقد (Contracted)</option>
                          <option value="in_progress">قيد التنفيذ (In Progress)</option>
                          <option value="delivered">تم التسليم (Delivered)</option>
                          <option value="collected">تم التحصيل (Collected)</option>
                          <option value="closed">مغلق (Closed)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setPaymentTargetContractId(c.id);
                            setPaymentAmount(c.remainingAmount > 0 ? c.remainingAmount : 5000);
                            setShowAddPaymentModal(true);
                          }}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>تحصيل دفعة</span>
                        </button>

                        {canDeleteRecords && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف العقد رقم ${c.contractNumber}؟`)) {
                                deleteContract(c.id);
                              }
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="حذف العقد"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Financial Numbers Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-[#202225] p-3 rounded-xl border border-[#292B2E]">
                      <div>
                        <span className="text-[#A1A1AA] block mb-1">إجمالي قيمة العقد:</span>
                        {isEditingVal ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              value={editingContractValue}
                              onChange={(e) => setEditingContractValue(Number(e.target.value))}
                              className="w-24 p-1 bg-[#18191B] border border-emerald-500 rounded font-bold font-mono text-xs text-[#EDEDED]"
                            />
                            <button
                              onClick={() => {
                                if (editingContractValue > 0) {
                                  updateContract(c.id, { totalValue: editingContractValue });
                                  setEditingContractId(null);
                                }
                              }}
                              className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingContractId(null)}
                              className="p-1 bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E] rounded cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <strong className="text-[#EDEDED] font-mono font-black text-sm">
                              {(c.totalValue || 0).toLocaleString()} ج.م
                            </strong>
                            <button
                              onClick={() => {
                                setEditingContractId(c.id);
                                setEditingContractValue(c.totalValue);
                              }}
                              className="p-1 text-[#A1A1AA] hover:text-[#EDEDED] cursor-pointer"
                              title="تعديل قيمة العقد"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[#A1A1AA] block mb-1">المدفوع ({percentPaid}%):</span>
                        <strong className="text-emerald-400 font-mono font-bold text-sm">
                          {(c.paidAmount || 0).toLocaleString()} ج.م
                        </strong>
                      </div>

                      <div>
                        <span className="text-[#A1A1AA] block mb-1">المتبقي للتحصيل:</span>
                        <strong className="text-rose-400 font-mono font-black text-sm">
                          {(c.remainingAmount || 0).toLocaleString()} ج.م
                        </strong>
                      </div>
                    </div>

                    {/* Financial Progress Bar */}
                    <div className="w-full bg-[#202225] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-[#A1A1AA] flex items-center justify-between">
                      <span>تاريخ التوقيع: {c.signDate}</span>
                      <span>تاريخ التسليم: {c.deliveryDate}</span>
                    </div>

                    {/* Nested Payments List for this Contract */}
                    {contractPayments.length > 0 && (
                      <div className="pt-2 border-t border-[#292B2E] space-y-1.5">
                        <span className="text-[11px] font-bold text-[#A1A1AA] block">
                          سجل الدفعات المحصلة لهذا العقد ({contractPayments.length}):
                        </span>
                        <div className="space-y-1">
                          {contractPayments.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between text-xs bg-[#202225] border border-[#292B2E] p-2 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <Receipt className="w-3.5 h-3.5 text-teal-400" />
                                <span className="font-mono font-bold text-teal-400">
                                  {(p.amount || 0).toLocaleString()} ج.م
                                </span>
                                <span className="text-[#A1A1AA] text-[11px]">
                                  ({p.method}) • {p.date}
                                </span>
                                {p.receiptNumber && (
                                  <span className="text-[#6B7280] font-mono text-[10px]">
                                    #{p.receiptNumber}
                                  </span>
                                )}
                              </div>
                              {canDeleteRecords && (
                                <button
                                  onClick={() => {
                                    if (confirm(`هل أنت متأكد من حذف هذا التحصيل بقيمة ${p.amount.toLocaleString()} ج.م؟`)) {
                                      deletePayment(p.id);
                                    }
                                  }}
                                  className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded cursor-pointer"
                                  title="حذف الدفعة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {customerContracts.length === 0 && (
                <div className="text-center py-8 text-[#6B7280] text-xs">
                  لم يتم إبرام عقود بعد مع هذا العميل. يمكنك الضغط على "إبرام تعاقد جديد" بالأعلى لتوثيق العقد ومبيعاته.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INSPECTIONS */}
          {activeTab === "inspections" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#292B2E]">
                <span className="text-xs font-bold text-[#EDEDED]">
                  المعاينات ورفع المقاسات ({customerInspections.length})
                </span>
                <button
                  onClick={() => setShowAddInspectionModal(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>جدولة معاينة جديدة</span>
                </button>
              </div>

              {customerInspections.map((ins) => (
                <div
                  key={ins.id}
                  className="bg-[#18191B] rounded-2xl border border-[#292B2E] p-4 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-xs text-[#EDEDED]">
                        معاينة تاريخ: {ins.scheduledDate}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        ins.status === "completed"
                          ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800"
                          : "bg-amber-950/60 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {ins.status === "completed" ? "مكتملة" : "مجدولة"}
                    </span>
                  </div>

                  <p className="text-xs text-[#A1A1AA]">{ins.notes || "لا توجد ملاحظات إضافية"}</p>
                  <div className="text-[11px] text-[#6B7280]">
                    القائم بالمعاينة: <strong className="text-[#A1A1AA]">{ins.surveyor || "فني المعاينات"}</strong> • المنطقة: {ins.area || customer.area}
                  </div>
                </div>
              ))}

              {customerInspections.length === 0 && (
                <div className="text-center py-8 text-[#6B7280] text-xs">
                  لا توجد معاينات مجدولة لهذا العميل حتى الآن.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: INQUIRIES */}
          {activeTab === "inquiries" && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#EDEDED] block pb-2 border-b border-[#292B2E]">
                سجل طلبات واستفسارات العميل ({customerInquiries.length})
              </span>

              {customerInquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="bg-[#18191B] rounded-2xl border border-[#292B2E] p-4 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-xs text-[#EDEDED]">{inq.productType}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={inq.stage || "new"}
                        onChange={(e) => updateInquiry(inq.id, { stage: e.target.value as InquiryStage })}
                        className="bg-[#202225] border border-[#292B2E] text-[#EDEDED] text-[11px] px-2 py-0.5 rounded-lg font-bold cursor-pointer"
                      >
                        <option value="new">جديد (New)</option>
                        <option value="contacted">تم التواصل (Contacted)</option>
                        <option value="qualified">مؤهل (Qualified)</option>
                        <option value="converted">محول لفرصة/عرض (Converted)</option>
                        <option value="not_qualified">غير مؤهل (Not Qualified)</option>
                        <option value="not_interested">غير مهتم (Not Interested)</option>
                        <option value="no_response">لا يوجد رد (No Response)</option>
                        <option value="closed">مغلق (Closed)</option>
                      </select>
                      <span className="text-[11px] text-[#6B7280]">{inq.date}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#A1A1AA]">{inq.details}</p>
                </div>
              ))}

              {customerInquiries.length === 0 && (
                <div className="text-center py-8 text-[#6B7280] text-xs">
                  لا توجد استفسارات مسجلة لهذا العميل.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit & Complete Profile Modal */}
      <CustomerEditModal
        customer={customer}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-[#18191B] rounded-2xl w-full max-w-md border border-[#292B2E] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#292B2E] bg-[#141517]">
              <h3 className="font-bold text-[#EDEDED] flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#C8A75A]" />
                تعديل حدث (Timeline)
              </h3>
              <button
                onClick={() => setEditingEvent(null)}
                className="text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEvent} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">تاريخ الحدث</label>
                <input
                  type="date"
                  required
                  value={editingEvent.date}
                  onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                  className="w-full bg-[#1D1F21] border border-[#292B2E] rounded-xl px-3 py-2 text-sm text-[#EDEDED] focus:outline-none focus:border-[#C8A75A] transition-colors"
                />
              </div>
              
              {(editingEvent.category === "payment" || editingEvent.category === "sale" || editingEvent.category === "contract" || editingEvent.category === "quotation") && (
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">القيمة / المبلغ</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingEvent.amount}
                    onChange={(e) => setEditingEvent({ ...editingEvent, amount: Number(e.target.value) })}
                    className="w-full bg-[#1D1F21] border border-[#292B2E] rounded-xl px-3 py-2 text-sm text-[#EDEDED] focus:outline-none focus:border-[#C8A75A] transition-colors"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">ملاحظات / تفاصيل</label>
                <textarea
                  value={editingEvent.notes}
                  onChange={(e) => setEditingEvent({ ...editingEvent, notes: e.target.value })}
                  className="w-full bg-[#1D1F21] border border-[#292B2E] rounded-xl px-3 py-2 text-sm text-[#EDEDED] focus:outline-none focus:border-[#C8A75A] transition-colors h-24 resize-none"
                  placeholder="أضف تفاصيل الحدث..."
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-[#292B2E]">
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold rounded-xl text-sm border border-rose-500/20 transition-colors cursor-pointer flex items-center justify-center"
                  title="حذف نهائي"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="flex-1 px-4 py-2 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] font-semibold rounded-xl text-sm border border-[#292B2E] transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#C8A75A] hover:bg-[#b0924e] text-black font-bold rounded-xl text-sm transition-colors shadow-lg cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
