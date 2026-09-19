import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useApp } from "../../context/AppContext";
import { detectColumns, ColumnMapping } from "../../utils/smartImportDetector";
import { normalizeArea } from "../../utils/areaUtils";
import { parseExcelDate, parseFinancialAmount } from "../../utils/excelDateUtils";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  RefreshCw,
  Trash2,
  FileText,
  Users,
  ChevronDown,
  Sparkles,
  Download,
  Info,
  X,
} from "lucide-react";

export const ExcelImportView: React.FC = () => {
  const {
    companies,
    activeCompanyId,
    batchImportData,
    importHistory,
    deleteImportHistoryItem,
    clearImportHistory,
    deleteAllImportedData,
    setCurrentTab,
    findCustomerByPhone,
    customers,
    contracts,
    sales,
    quotations,
  } = useApp();

  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [rawRows, setRawRows] = useState<any[]>([]);

  // Bulk import deletion controls
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  // Accurate counts of imported entities
  const importedCustomersCount = React.useMemo(() => {
    const idsFromHistory = new Set(importHistory.flatMap((h) => h.customerIds || []));
    return customers.filter(
      (c) =>
        c.importBatchId ||
        idsFromHistory.has(c.id) ||
        (c.source as string) === "Excel Import" ||
        (c.source as string) === "استيراد Excel" ||
        (c.notes && c.notes.includes("استيراد من"))
    ).length;
  }, [customers, importHistory]);

  const importedContractsCount = React.useMemo(() => {
    const idsFromHistory = new Set(importHistory.flatMap((h) => h.contractIds || []));
    return contracts.filter(
      (c) =>
        c.importBatchId ||
        idsFromHistory.has(c.id) ||
        (c.notes && c.notes.includes("استيراد من"))
    ).length;
  }, [contracts, importHistory]);

  const importedSalesCount = React.useMemo(() => {
    const idsFromHistory = new Set(importHistory.flatMap((h) => h.saleIds || []));
    return sales.filter(
      (s) =>
        s.importBatchId ||
        idsFromHistory.has(s.id) ||
        s.customerSource === "Excel Import" ||
        s.customerSource === "استيراد Excel" ||
        s.responsible === "استيراد Excel"
    ).length;
  }, [sales, importHistory]);

  const importedQuotationsCount = React.useMemo(() => {
    const idsFromHistory = new Set(importHistory.flatMap((h) => h.quotationIds || []));
    return quotations.filter((q) => q.importBatchId || idsFromHistory.has(q.id)).length;
  }, [quotations, importHistory]);

  const totalImportedEntitiesCount =
    importedCustomersCount + importedContractsCount + importedSalesCount + importedQuotationsCount;
  const hasImportedData = importHistory.length > 0 || totalImportedEntitiesCount > 0;
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    nameCol: "",
    phoneCol: "",
    areaCol: "",
    companyCol: "",
    productCol: "",
    statusCol: "",
    contractDateCol: "",
    contractAmountCol: "",
    sourceCol: "",
    notesCol: "",
  });

  const [fallbackCompanyId, setFallbackCompanyId] = useState<string>(
    activeCompanyId !== "all" ? activeCompanyId : companies[0]?.id || "comp-newhouse"
  );
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "update" | "create">("update");
  const [currentStep, setCurrentStep] = useState<"upload" | "mapping" | "preview" | "history">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [importResult, setImportResult] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File parsing
  const processWorkbook = (wb: XLSX.WorkBook, fileName: string) => {
    setWorkbook(wb);
    setSheetNames(wb.SheetNames);
    const firstSheet = wb.SheetNames[0] || "";
    setSelectedSheet(firstSheet);
    loadSheetData(wb, firstSheet);
  };

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet) return;

    // Read as 2D array or json objects
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "", raw: false });
    if (jsonData.length === 0) {
      setRawRows([]);
      setHeaders([]);
      return;
    }

    const firstRow = jsonData[0];
    const extractedHeaders = Object.keys(firstRow);
    setHeaders(extractedHeaders);
    setRawRows(jsonData);

    // Run smart detection
    const detected = detectColumns(extractedHeaders);
    setMapping(detected);
    setCurrentStep("mapping");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const uploadedFile = files[0];
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        processWorkbook(wb, uploadedFile.name);
      } catch (err) {
        alert("حدث خطأ أثناء قراءة ملف Excel. يرجى التأكد من صحة الملف.");
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const uploadedFile = files[0];
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array", cellDates: true });
          processWorkbook(wb, uploadedFile.name);
        } catch (err) {
          alert("حدث خطأ أثناء قراءة ملف Excel.");
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
    }
  };

  // Load Built-in Demo Template Data for instant testing
  const loadDemoData = () => {
    const demoRows = [
      {
        "اسم العميل": "م. هشام طلعت النجار",
        "الموبايل": "01011223399",
        "المنطقة": "التجمع الخامس - النرجس",
        "الشركة": "PVC NESTA",
        "الحالة": "تم التعاقد",
        "تاريخ التعاقد": "2025-05-18",
        "قيمة التعاقد": 185000,
        "ملاحظات": "فيلا دوبلكس 14 شباك UPVC عازل مزدوج وسداد كامل",
      },
      {
        "اسم العميل": "د. نادية سراج الدين",
        "الموبايل": "01144556677",
        "المنطقة": "الشيخ زايد",
        "الشركة": "شركة New House",
        "الحالة": "تم التعاقد",
        "تاريخ التعاقد": "2025-06-22",
        "قيمة التعاقد": 240000,
        "ملاحظات": "كمبوند الياسمين 10 شبابيك جرار وشيش حصير بموتور",
      },
      {
        "اسم العميل": "أ. عصام فاروق القاضي",
        "الموبايل": "01288990011",
        "المنطقة": "مدينة نصر",
        "الشركة": "شركة Vertex",
        "الحالة": "تم التعاقد",
        "تاريخ التعاقد": "2025-11-14",
        "قيمة التعاقد": 98000,
        "ملاحظات": "شقة عباس العقاد، أبواب وشبابيك عازلة للصوت",
      },
      {
        "اسم العميل": "م. رامي سمير",
        "الموبايل": "01599001122",
        "المنطقة": "أكتوبر",
        "الشركة": "PVC NESTA",
        "الحالة": "عرض سعر",
        "تاريخ التعاقد": "",
        "قيمة التعاقد": 0,
        "ملاحظات": "مهتم بمشروع تاون هاوس بأكتوبر",
      },
      {
        "اسم العميل": "أ. إيمان الجوهري",
        "الموبايل": "01099887766", // Duplicate match with existing demo customer
        "المنطقة": "المعادي",
        "الشركة": "شركة New House",
        "الحالة": "تم التعاقد",
        "تاريخ التعاقد": "2026-01-20",
        "قيمة التعاقد": 130000,
        "ملاحظات": "ملحق إضافي - شبابيك حمامات ومطابخ",
      },
      {
        "اسم العميل": "د. ياسر المنشاوي",
        "الموبايل": "01200112233",
        "المنطقة": "الرحاب",
        "الشركة": "شركة Vertex",
        "الحالة": "تم التعاقد",
        "تاريخ التعاقد": "2026-03-05",
        "قيمة التعاقد": 175000,
        "ملاحظات": "فيلا الرحاب مرحلة ثانية، قطاع ألماني عالي العزل",
      },
    ];

    setFile(new File([], "demo_customers_and_sales_2025_2026.xlsx"));
    const demoHeaders = Object.keys(demoRows[0]);
    setHeaders(demoHeaders);
    setRawRows(demoRows);
    setMapping({
      nameCol: "اسم العميل",
      phoneCol: "الموبايل",
      areaCol: "المنطقة",
      companyCol: "الشركة",
      productCol: "",
      statusCol: "الحالة",
      contractDateCol: "تاريخ التعاقد",
      contractAmountCol: "قيمة التعاقد",
      sourceCol: "",
      notesCol: "ملاحظات",
    });
    setCurrentStep("preview");
  };

  // Download Sample Excel Template file
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "اسم العميل": "مثال: م. أحمد عبد العزيز",
        "الموبايل": "01012345678",
        "المنطقة": "التجمع الخامس",
        "الشركة": "PVC NESTA",
        "الحالة": "تم التعاقد",
        "تاريخ التعاقد": "2025-06-15",
        "قيمة التعاقد": 150000,
        "المصدر": "فيسبوك",
        "ملاحظات": "عقد توريد وتركيب شبابيك عازلة للصوت",
      },
      {
        "اسم العميل": "مثال: د. ماجد السعيد",
        "الموبايل": "01123456789",
        "المنطقة": "الشيخ زايد",
        "الشركة": "شركة New House",
        "الحالة": "عرض سعر",
        "تاريخ التعاقد": "",
        "قيمة التعاقد": 0,
        "المصدر": "ترشيح",
        "ملاحظات": "فيلا تحت الإنشاء، رفع مقاسات مبدئي",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "العملاء والمبيعات");
    XLSX.writeFile(wb, "PVC_NESTA_AI_Import_Template.xlsx");
  };

  const handleStartImport = async () => {
    if (!mapping.nameCol && !mapping.phoneCol) {
      alert("يرجى تحديد عمود الاسم أو عمود الهاتف على الأقل لمطابقة العملاء.");
      return;
    }

    setIsProcessing(true);
    try {
      const fileName = file?.name || "ملف بيانات";
      // Allow UI to show "processing" before blocking operations
      await new Promise(r => setTimeout(r, 100));
      const res = await batchImportData(rawRows, mapping, fallbackCompanyId, duplicateAction, fileName, (p, m) => {
        setProgress(p);
        setProgressMsg(m);
      });
      setImportResult(res);
      // Don't change step, stay in preview to show the success card
    } catch (e) {
      alert("حدث خطأ أثناء الاستيراد");
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Duplicate preview count
  const duplicateCount = rawRows.filter((r) => {
    const p = mapping.phoneCol ? String(r[mapping.phoneCol] || "") : "";
    return Boolean(findCustomerByPhone(p));
  }).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className="p-2.5 rounded-2xl bg-white border border-[#EAEAEA] text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5] transition-colors"
              title="رجوع إلى لوحة القيادة"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <span className="p-2.5 rounded-2xl bg-[#111111] text-[#C8A75A]">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#111111]">
                  استيراد بيانات Excel الذكي
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C8A75A]/20 text-[#111111] border border-[#C8A75A]/40">
                  Smart AI Core
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#6B7280]">
                رفع ملفات Excel/CSV، التعرف التلقائي على الأعمدة والتواريخ التاريخية، والربط بالمنطقة والشركة
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCurrentTab("dashboard")}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>إغلاق</span>
          </button>
          <button
            onClick={() => setCurrentStep("history")}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentStep === "history"
                ? "bg-[#111111] text-white border-[#111111]"
                : "bg-white text-[#111111] border-[#EAEAEA] hover:bg-[#F8F8F5]"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#C8A75A]" />
            <span>سجل الاستيراد ({importHistory.length})</span>
          </button>

          <button
            onClick={downloadSampleTemplate}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-[#EAEAEA] bg-white text-[#111111] hover:bg-[#F8F8F5] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="تحميل ملف إكسيل فارغ مجهز كنموذج"
          >
            <Download className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>تحميل نموذج Excel</span>
          </button>

          <button
            onClick={loadDemoData}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#C8A75A] text-[#111111] hover:bg-[#b5954a] transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>تجربة بيانات 2025/2026 جاهزة</span>
          </button>
        </div>
      </div>

      {/* Workflow Tabs / Progress Breadcrumbs */}
      {currentStep !== "history" && (
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#EAEAEA] text-xs font-bold text-[#6B7280]">
          <button
            onClick={() => setCurrentStep("upload")}
            className={`flex-1 py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${
              currentStep === "upload"
                ? "bg-[#111111] text-white font-black"
                : file
                ? "text-[#111111] hover:bg-[#F8F8F5]"
                : ""
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-[#C8A75A] text-[#111111] flex items-center justify-center text-[11px] font-black">
              1
            </span>
            <span>رفع الملف</span>
          </button>

          <div className="w-4 h-px bg-[#EAEAEA]" />

          <button
            disabled={!file}
            onClick={() => setCurrentStep("mapping")}
            className={`flex-1 py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              currentStep === "mapping"
                ? "bg-[#111111] text-white font-black"
                : headers.length > 0
                ? "text-[#111111] hover:bg-[#F8F8F5]"
                : ""
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-[#C8A75A] text-[#111111] flex items-center justify-center text-[11px] font-black">
              2
            </span>
            <span>مطابقة الأعمدة والذكاء التلقائي</span>
          </button>

          <div className="w-4 h-px bg-[#EAEAEA]" />

          <button
            disabled={rawRows.length === 0}
            onClick={() => setCurrentStep("preview")}
            className={`flex-1 py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              currentStep === "preview"
                ? "bg-[#111111] text-white font-black"
                : "text-[#111111] hover:bg-[#F8F8F5]"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-[#C8A75A] text-[#111111] flex items-center justify-center text-[11px] font-black">
              3
            </span>
            <span>معاينة وتأكيد الاستيراد</span>
          </button>
        </div>
      )}

      {/* STEP 1: UPLOAD AREA */}
      {currentStep === "upload" && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EAEAEA] shadow-2xs space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#D1D5DB] hover:border-[#C8A75A] rounded-3xl p-8 sm:p-12 text-center cursor-pointer bg-[#F8F8F5] hover:bg-amber-50/20 transition-all flex flex-col items-center justify-center gap-4 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-white border border-[#EAEAEA] flex items-center justify-center text-[#111111] group-hover:scale-110 group-hover:text-[#C8A75A] transition-transform shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-[#111111]">
                اسحب وأفلت ملف Excel أو اضغط للاختيار
              </h3>
              <p className="text-xs text-[#6B7280]">
                يدعم صيغ XLSX, XLS, و CSV. يتعرف على أعمدة الأسماء، الهواتف، المناطق، والتواريخ المالية تلقائياً.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#6B7280] bg-white px-3 py-1.5 rounded-xl border border-[#EAEAEA]">
              <span>الحد الأقصى للبيانات: حتى 10,000 سجل في الدفعة الواحدة</span>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="p-4 rounded-2xl bg-[#111111] text-white flex items-start gap-3 text-xs">
            <Sparkles className="w-5 h-5 text-[#C8A75A] shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-bold text-[#C8A75A]">
                نظام PVC NESTA AI يتعرف بذكاء على البيانات التاريخية:
              </p>
              <p className="text-[#9CA3AF]">
                إذا كان ملفك يحتوي على عقود ومبيعات من عام 2024 أو 2025، سيتم تسجيلها بدقة في أشهرها وسنواتها الأصلية لحساب إحصائيات المبيعات والأداء الشهري بدقة تامة دون تضخيم شهر اليوم!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING */}
      {currentStep === "mapping" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAEAEA] pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#111111] flex items-center gap-2">
                  <span>مطابقة أعمدة الملف ({file?.name})</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                    {rawRows.length} سجل مكتشف
                  </span>
                </h2>
                <p className="text-xs text-[#6B7280]">
                  قام النظام بالتعرف الذكي على الأعمدة. يمكنك مراجعة أو تعديل مطابقة كل حقل أدناه:
                </p>
              </div>

              {sheetNames.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#6B7280] font-bold">ورقة العمل:</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => {
                      setSelectedSheet(e.target.value);
                      if (workbook) loadSheetData(workbook, e.target.value);
                    }}
                    className="bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl px-2.5 py-1.5 font-bold text-[#111111]"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Name */}
              <div className="bg-[#F8F8F5] p-3.5 rounded-2xl border border-[#EAEAEA] space-y-1.5">
                <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                  <span>👤 اسم العميل (مطلوب)</span>
                  {mapping.nameCol && <span className="text-[10px] text-emerald-600 font-extrabold">✓ تم الربط</span>}
                </label>
                <select
                  value={mapping.nameCol}
                  onChange={(e) => setMapping({ ...mapping, nameCol: e.target.value })}
                  className="w-full bg-white border border-[#EAEAEA] rounded-xl px-3 py-2 text-xs font-bold text-[#111111]"
                >
                  <option value="">-- اختر العمود --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div className="bg-[#F8F8F5] p-3.5 rounded-2xl border border-[#EAEAEA] space-y-1.5">
                <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                  <span>📞 رقم الهاتف / الموبايل</span>
                  {mapping.phoneCol && <span className="text-[10px] text-emerald-600 font-extrabold">✓ تم الربط</span>}
                </label>
                <select
                  value={mapping.phoneCol}
                  onChange={(e) => setMapping({ ...mapping, phoneCol: e.target.value })}
                  className="w-full bg-white border border-[#EAEAEA] rounded-xl px-3 py-2 text-xs font-bold text-[#111111]"
                >
                  <option value="">-- اختر العمود --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area */}
              <div className="bg-[#F8F8F5] p-3.5 rounded-2xl border border-[#EAEAEA] space-y-1.5">
                <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                  <span>📍 المنطقة الجغرافية (Area)</span>
                  {mapping.areaCol && <span className="text-[10px] text-[#C8A75A] font-extrabold">✓ مطابقة ذكية</span>}
                </label>
                <select
                  value={mapping.areaCol}
                  onChange={(e) => setMapping({ ...mapping, areaCol: e.target.value })}
                  className="w-full bg-white border border-[#EAEAEA] rounded-xl px-3 py-2 text-xs font-bold text-[#111111]"
                >
                  <option value="">-- اختر العمود --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company */}
              <div className="bg-[#F8F8F5] p-3.5 rounded-2xl border border-[#EAEAEA] space-y-1.5">
                <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                  <span>🏢 الشركة / الفرع</span>
                  {mapping.companyCol ? (
                    <span className="text-[10px] text-emerald-600 font-extrabold">✓ تم الربط</span>
                  ) : (
                    <span className="text-[10px] text-[#6B7280]">سيتم تطبيق الافتراضي</span>
                  )}
                </label>
                <select
                  value={mapping.companyCol}
                  onChange={(e) => setMapping({ ...mapping, companyCol: e.target.value })}
                  className="w-full bg-white border border-[#EAEAEA] rounded-xl px-3 py-2 text-xs font-bold text-[#111111]"
                >
                  <option value="">-- لا يوجد بالملف (استخدم الشركة الافتراضية) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contract Date */}
              <div className="bg-[#F8F8F5] p-3.5 rounded-2xl border border-[#EAEAEA] space-y-1.5">
                <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                  <span>📅 تاريخ التعاقد (تاريخ حقيقي)</span>
                  {mapping.contractDateCol && <span className="text-[10px] text-[#C8A75A] font-extrabold">✓ تم الربط</span>}
                </label>
                <select
                  value={mapping.contractDateCol}
                  onChange={(e) => setMapping({ ...mapping, contractDateCol: e.target.value })}
                  className="w-full bg-white border border-[#EAEAEA] rounded-xl px-3 py-2 text-xs font-bold text-[#111111]"
                >
                  <option value="">-- اختياري (بدون تاريخ تعاقد) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contract Amount */}
              <div className="bg-[#F8F8F5] p-3.5 rounded-2xl border border-[#EAEAEA] space-y-1.5">
                <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                  <span>💰 قيمة / مبلغ التعاقد</span>
                  {mapping.contractAmountCol && <span className="text-[10px] text-[#C8A75A] font-extrabold">✓ تم الربط</span>}
                </label>
                <select
                  value={mapping.contractAmountCol}
                  onChange={(e) => setMapping({ ...mapping, contractAmountCol: e.target.value })}
                  className="w-full bg-white border border-[#EAEAEA] rounded-xl px-3 py-2 text-xs font-bold text-[#111111]"
                >
                  <option value="">-- اختياري (بدون مبالغ) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="bg-[#F8F8F5] p-3.5 rounded-2xl border border-[#EAEAEA] space-y-1.5">
                <label className="text-xs font-bold text-[#111111]">
                  مرحلة العميل / الحالة
                </label>
                <select
                  value={mapping.statusCol}
                  onChange={(e) => setMapping({ ...mapping, statusCol: e.target.value })}
                  className="w-full bg-white border border-[#EAEAEA] rounded-xl px-3 py-2 text-xs font-bold text-[#111111]"
                >
                  <option value="">-- تلقائي حسب وجود العقد --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="bg-[#F8F8F5] p-3.5 rounded-2xl border border-[#EAEAEA] space-y-1.5">
                <label className="text-xs font-bold text-[#111111]">
                  الملاحظات والتفاصيل
                </label>
                <select
                  value={mapping.notesCol}
                  onChange={(e) => setMapping({ ...mapping, notesCol: e.target.value })}
                  className="w-full bg-white border border-[#EAEAEA] rounded-xl px-3 py-2 text-xs font-bold text-[#111111]"
                >
                  <option value="">-- اختياري --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Global Settings for this import */}
            <div className="pt-4 border-t border-[#EAEAEA] grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Company */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#C8A75A]" />
                  <span>الشركة الافتراضية (في حال عدم وجود عمود للشركة):</span>
                </label>
                <select
                  value={fallbackCompanyId}
                  onChange={(e) => setFallbackCompanyId(e.target.value)}
                  className="w-full bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl px-3 py-2 text-xs font-bold text-[#111111]"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duplicate Handling Policy */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>سياسة التعامل مع تكرار رقم الهاتف ({duplicateCount} مكرر محتمل):</span>
                </label>
                <select
                  value={duplicateAction}
                  onChange={(e) => setDuplicateAction(e.target.value as any)}
                  className="w-full bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl px-3 py-2 text-xs font-bold text-[#111111]"
                >
                  <option value="update">تحديث العميل القائم وإضافة العقد وسجل المبيعات إليه (موصى به)</option>
                  <option value="skip">تخطي العميل المكرر وعدم استيراده</option>
                  <option value="create">إنشاء كعميل جديد منفصل</option>
                </select>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#EAEAEA]">
              <button
                onClick={() => setCurrentStep("upload")}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5]"
              >
                رجوع لرفع الملف
              </button>
              <button
                onClick={() => setCurrentStep("preview")}
                className="px-5 py-2.5 rounded-xl bg-[#111111] text-white hover:bg-[#222222] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>الانتقال للمعاينة ({rawRows.length} سجل)</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & CONFIRM */}
      {currentStep === "preview" && (
        <div className="space-y-6">
          {/* Post Import Summary Banner if completed */}
          {importResult && (
            <div className={`border rounded-3xl p-6 space-y-4 ${(importResult.skippedRows > 0 || importResult.issues?.length > 0) ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-xl text-white ${(importResult.skippedRows > 0 || importResult.issues?.length > 0) ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black">
                      {(importResult.skippedRows > 0 || importResult.issues?.length > 0) 
                        ? 'اكتمل الاستيراد مع وجود ملاحظات' 
                        : 'اكتمل الاستيراد بنجاح!'}
                    </h3>
                    <p className={`text-xs ${(importResult.skippedRows > 0 || importResult.issues?.length > 0) ? 'text-amber-700' : 'text-emerald-700'}`}>
                      تم معالجة الملف وانتهت العملية. يرجى مراجعة الإحصائيات.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setCurrentTab("customers")}
                    className={`px-3 py-1.5 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer ${(importResult.skippedRows > 0 || importResult.issues?.length > 0) ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    عرض العملاء
                  </button>
                  <button
                    onClick={() => setCurrentTab("sales")}
                    className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    عرض المبيعات
                  </button>
                </div>
              </div>

              {/* Stats pill counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
                <div className="bg-white/80 p-3 rounded-xl border border-black/10">
                  <div className="text-lg font-black text-[#111111] font-mono">
                    {importResult.importedCustomers}
                  </div>
                  <div className="text-[11px] font-bold opacity-70">تمت الإضافة</div>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-black/10">
                  <div className="text-lg font-black text-[#111111] font-mono">
                    {importResult.updatedCustomers}
                  </div>
                  <div className="text-[11px] font-bold opacity-70">تم التحديث</div>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-black/10">
                  <div className="text-lg font-black text-amber-600 font-mono">
                    {importResult.skippedRows}
                  </div>
                  <div className="text-[11px] text-amber-800 font-bold">تم التخطي (مكرر/فارغ)</div>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-black/10">
                  <div className="text-lg font-black text-rose-600 font-mono">
                    {importResult.issues?.length || 0}
                  </div>
                  <div className="text-[11px] text-rose-800 font-bold">رسائل فشل / خطأ</div>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-black/10">
                  <div className="text-lg font-black text-[#111111] font-mono">
                    {importResult.createdContracts}
                  </div>
                  <div className="text-[11px] font-bold opacity-70">عقود منشأة</div>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-black/10">
                  <div className="text-lg font-black text-[#C8A75A] font-mono">
                    {(importResult.totalImportedSalesAmount || 0).toLocaleString()} ج
                  </div>
                  <div className="text-[11px] font-bold opacity-70">قيمة المبيعات</div>
                </div>
              </div>
              
              {importResult.issues && importResult.issues.length > 0 && (
                <div className="mt-4 p-4 bg-white/60 rounded-xl border border-rose-200">
                  <h4 className="text-xs font-bold text-rose-800 mb-2">تفاصيل الملاحظات والأخطاء:</h4>
                  <ul className="text-[11px] text-rose-700 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                    {importResult.issues.map((issue: string, idx: number) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {isProcessing && !importResult ? (
            <div className="bg-white rounded-3xl p-10 border border-emerald-100 shadow-2xs text-center space-y-6">
              <div className="flex flex-col items-center justify-center">
                <RefreshCw className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
                <h3 className="text-xl font-black text-emerald-900 mb-2">{progressMsg || "جاري المعالجة..."}</h3>
                <div className="w-full max-w-md bg-emerald-50 rounded-full h-4 overflow-hidden border border-emerald-100">
                  <div 
                    className="bg-emerald-600 h-full transition-all duration-300 ease-out relative"
                    style={{ width: `${Math.max(5, progress)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
                <p className="text-emerald-700 font-bold mt-2">{Math.round(progress)}%</p>
              </div>
            </div>
          ) : null}

          {/* Preview Table Card */}
          <div className={`bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4 ${isProcessing ? 'hidden' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[#111111]">
                  معاينة البيانات قبل التنفيذ ({rawRows.length} صف)
                </h3>
                <p className="text-xs text-[#6B7280]">
                  تظهر العينة أدناه أول 8 صفوف مع توضيح مطابقة المنطقة الجغرافية وتاريخ ومبلغ العقد التاريخي:
                </p>
              </div>

              {!importResult && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep("mapping")}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:text-[#111111] border border-[#EAEAEA] hover:bg-[#F8F8F5]"
                  >
                    تعديل مطابقة الأعمدة
                  </button>
                  <button
                    onClick={handleStartImport}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-[#111111] text-[#C8A75A] hover:bg-[#222222] text-xs font-black flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#C8A75A]" />
                        <span>جاري معالجة السجلات...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#C8A75A]" />
                        <span>تأكيد واستيراد {rawRows.length} سجل الآن</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-[#EAEAEA] rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#F8F8F5] text-[#6B7280] font-bold border-b border-[#EAEAEA]">
                    <th className="p-3">#</th>
                    <th className="p-3">العميل</th>
                    <th className="p-3">الهاتف</th>
                    <th className="p-3">📍 المنطقة</th>
                    <th className="p-3">🏢 الشركة</th>
                    <th className="p-3">📅 تاريخ العقد</th>
                    <th className="p-3">💰 قيمة العقد</th>
                    <th className="p-3">حالة السجل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {rawRows.slice(0, 8).map((row, idx) => {
                    const name = mapping.nameCol ? row[mapping.nameCol] : "";
                    const phone = mapping.phoneCol ? row[mapping.phoneCol] : "";
                    const rawArea = mapping.areaCol ? row[mapping.areaCol] : "";
                    const normalized = normalizeArea(String(rawArea || ""));
                    const rawCompany = mapping.companyCol ? row[mapping.companyCol] : "";
                    const contractDate = mapping.contractDateCol ? parseExcelDate(row[mapping.contractDateCol]) : null;
                    const contractAmount = mapping.contractAmountCol ? parseFinancialAmount(row[mapping.contractAmountCol]) : 0;
                    const isDup = Boolean(findCustomerByPhone(String(phone || "")));

                    return (
                      <tr key={idx} className="hover:bg-[#F8F8F5]/60 transition-colors">
                        <td className="p-3 text-[#9CA3AF] font-mono">{idx + 1}</td>
                        <td className="p-3 font-bold text-[#111111]">
                          {name || <span className="text-[#9CA3AF]">بدون اسم</span>}
                        </td>
                        <td className="p-3 font-mono text-[#6B7280]">
                          {phone || "-"}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-[#111111] border border-amber-200 text-[11px] font-bold">
                            <MapPin className="w-3 h-3 text-[#C8A75A]" />
                            <span>{normalized}</span>
                          </span>
                        </td>
                        <td className="p-3 font-medium text-[#6B7280]">
                          {rawCompany || "الافتراضية"}
                        </td>
                        <td className="p-3 font-mono">
                          {contractDate ? (
                            <span className="text-[#111111] font-bold bg-[#F8F8F5] px-2 py-0.5 rounded-lg border border-[#EAEAEA]">
                              {contractDate}
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF]">-</span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          {contractAmount > 0 ? (
                            <span className="font-extrabold text-[#111111]">
                              {(contractAmount || 0).toLocaleString()} ج.م
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF]">0</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isDup ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>مكرر ({duplicateAction === "update" ? "تحديث" : duplicateAction === "skip" ? "تخطي" : "جديد"})</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                              عميل جديد
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rawRows.length > 8 && (
              <p className="text-center text-xs text-[#9CA3AF]">
                يوجد {rawRows.length - 8} صفوف إضافية ستتم معالجتها بالكامل أثناء التنفيذ.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: IMPORT HISTORY */}
      {currentStep === "history" && (
        <div className="space-y-4">
          {/* Active Imported Data Alert Banner */}
          {hasImportedData && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-amber-900">
                      بيانات الاستيراد المسجلة في النظام
                    </span>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      {totalImportedEntitiesCount} سجل
                    </span>
                  </div>
                  <div className="text-xs text-amber-800 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>العملاء: <strong className="font-mono font-black">{importedCustomersCount}</strong></span>
                    <span>•</span>
                    <span>العقود: <strong className="font-mono font-black">{importedContractsCount}</strong></span>
                    <span>•</span>
                    <span>سجلات البيع: <strong className="font-mono font-black">{importedSalesCount}</strong></span>
                    <span>•</span>
                    <span>عروض الأسعار: <strong className="font-mono font-black">{importedQuotationsCount}</strong></span>
                    <span>•</span>
                    <span>دفعات الاستيراد: <strong className="font-mono font-black">{importHistory.length}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="px-4 py-2.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف كافة بيانات وسجلات الاستيراد</span>
              </button>
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#111111]">
                  سجل عمليات الاستيراد السابقة
                </h2>
                <p className="text-xs text-[#6B7280]">
                  متابعة الملفات التي تم استيرادها والتحكم في حذف وتراجع الدفعات
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => setCurrentStep("upload")}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#111111] text-white hover:bg-[#222222] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-[#C8A75A]" />
                  <span>استيراد ملف جديد</span>
                </button>

                {hasImportedData && (
                  <button
                    onClick={() => setShowDeleteAllModal(true)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl text-red-600 border border-red-200 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف كافة بيانات الاستيراد</span>
                  </button>
                )}
              </div>
            </div>

            {importHistory.length === 0 ? (
              <div className="py-12 text-center text-[#6B7280] space-y-2">
                <Database className="w-10 h-10 mx-auto text-[#D1D5DB]" />
                <p className="text-sm font-bold text-[#111111]">لا توجد عمليات استيراد سابقة مسجلة</p>
                <p className="text-xs">
                  {totalImportedEntitiesCount > 0
                    ? `توجد ${totalImportedEntitiesCount} سجلات مستوردة سابقة في النظام يمكنك حذفها عبر الزر الأحمر أعلاه.`
                    : "قم برفع أول ملف إكسيل لبدء ملء السجل"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#EAEAEA]">
                {importHistory.map((item) => (
                  <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="p-2.5 rounded-2xl bg-[#F8F8F5] border border-[#EAEAEA] text-[#111111]">
                        <FileSpreadsheet className="w-5 h-5 text-[#C8A75A]" />
                      </span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-[#111111]">{item.fileName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            مكتمل
                          </span>
                        </div>
                        <div className="text-xs text-[#6B7280] flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>{new Date(item.importedAt).toLocaleString("ar-EG")}</span>
                          <span>•</span>
                          <span>إجمالي الصفوف: {item.totalRows}</span>
                          <span>•</span>
                          <span>عملاء: {item.importedCustomers || item.customerIds?.length || 0}</span>
                          <span>•</span>
                          <span>عقود: {item.createdContracts || item.contractIds?.length || 0}</span>
                          <span>•</span>
                          <span>مبيعات: {item.saleIds?.length || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left font-mono">
                        <div className="text-xs text-[#6B7280]">المبيعات المضافة</div>
                        <div className="text-sm font-black text-[#111111]">
                          {(item.totalImportedSalesAmount || 0).toLocaleString()} ج.م
                        </div>
                      </div>

                      <button
                        onClick={() => setBatchToDelete(item.id)}
                        className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        title="حذف هذه الدفعة وجميع بياناتها"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف الدفعة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MODAL: Delete All Imported Data */}
          {showDeleteAllModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#EAEAEA] space-y-6 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="p-3 rounded-2xl bg-red-100 text-red-600">
                      <Trash2 className="w-6 h-6" />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-[#111111]">
                        حذف كافة بيانات وسجلات الاستيراد
                      </h3>
                      <p className="text-xs text-[#6B7280]">
                        إزالة شاملة للعملاء، عقود المبيعات، سجلات البيع وعروض الأسعار المستوردة
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeleteAllModal(false)}
                    className="p-1.5 text-[#9CA3AF] hover:text-[#111111] hover:bg-[#F8F8F5] rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2 text-xs text-red-900 leading-relaxed">
                  <p className="font-black text-red-950">تنبيه هام:</p>
                  <p>
                    أنت على وشك حذف كافة البيانات التي تم استيرادها نهائياً من النظام. سيتم حذف:
                  </p>
                  <ul className="list-disc list-inside space-y-1 font-bold">
                    <li>كافة العملاء المستوردين عبر ملفات الإكسيل ({importedCustomersCount} عميل)</li>
                    <li>كافة عقود المبيعات المستوردة التابعة لهم ({importedContractsCount} عقد)</li>
                    <li>كافة سجلات البيع والمبيعات المستوردة ({importedSalesCount} سجل بيع)</li>
                    <li>كافة عروض الأسعار المستوردة ({importedQuotationsCount} عرض سعر)</li>
                    <li>سجل وتاريخ عمليات الاستيراد ({importHistory.length} عملية)</li>
                  </ul>
                  <p className="text-[11px] text-red-700 pt-1">
                    * سيتم الاحتفاظ بالبيانات الأصلية واليدوية المسجلة داخل النظام دون المساس بها.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isDeletingAll}
                    onClick={() => setShowDeleteAllModal(false)}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl border border-[#EAEAEA] text-[#6B7280] hover:bg-[#F8F8F5] transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingAll}
                    onClick={async () => {
                      setIsDeletingAll(true);
                      try {
                        await deleteAllImportedData();
                        setShowDeleteAllModal(false);
                      } finally {
                        setIsDeletingAll(false);
                      }
                    }}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isDeletingAll ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري الحذف السحابي والمحلي...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>تأكيد الحذف الشامل الآن</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: Delete Single Batch */}
          {batchToDelete && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#EAEAEA] space-y-6 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="p-3 rounded-2xl bg-red-100 text-red-600">
                      <Trash2 className="w-6 h-6" />
                    </span>
                    <div>
                      <h3 className="text-base font-black text-[#111111]">
                        حذف هذه الدفعة من الاستيراد
                      </h3>
                      <p className="text-xs text-[#6B7280]">
                        التراجع عن الدفعة وإزالة كافة السجلات المرتبطة بها
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBatchToDelete(null)}
                    className="p-1.5 text-[#9CA3AF] hover:text-[#111111] hover:bg-[#F8F8F5] rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-[#6B7280] leading-relaxed">
                  هل أنت متأكد من حذف هذه الدفعة؟ سيتم التراجع عن استيرادها وحذف كافة العملاء والعقود والمبيعات وعروض الأسعار الناتجة عنها من النظام.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBatchToDelete(null)}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl border border-[#EAEAEA] text-[#6B7280] hover:bg-[#F8F8F5] transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteImportHistoryItem(batchToDelete);
                      setBatchToDelete(null);
                    }}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد حذف الدفعة</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
