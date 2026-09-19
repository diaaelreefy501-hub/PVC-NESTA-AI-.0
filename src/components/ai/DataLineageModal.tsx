import React from "react";
import { useApp } from "../../context/AppContext";
import { DataLineageEngine } from "../../utils/dataLineageEngine";
import {
  X,
  Database,
  CheckCircle2,
  Calculator,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export const DataLineageModal: React.FC = () => {
  const {
    selectedMetricForLineage,
    setSelectedMetricForLineage,
    companies,
    customers,
    inquiries,
    followUps,
    quotations,
    contracts,
    sales,
    opportunities,
    activeCompanyId,
    setCurrentTab,
    setSelectedCustomerIdFor360,
    salesManualAdjustment,
    setSalesManualAdjustment,
    salesOverrideValue,
    setSalesOverrideValue,
    showToast,
  } = useApp();

  const [adjustVal, setAdjustVal] = React.useState(salesManualAdjustment);
  const [overrideVal, setOverrideVal] = React.useState<number | null>(salesOverrideValue);
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    setAdjustVal(salesManualAdjustment);
    setOverrideVal(salesOverrideValue);
  }, [salesManualAdjustment, salesOverrideValue, selectedMetricForLineage]);

  if (!selectedMetricForLineage) return null;

  const snapshot = {
    companies,
    customers,
    inquiries,
    followUps,
    quotations,
    contracts,
    sales,
    opportunities,
  };

  const lineageReport = DataLineageEngine.explainMetric(
    selectedMetricForLineage,
    snapshot,
    activeCompanyId
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-3xl bg-[#141517] border border-[#292B2E] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#EDEDED]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#18191B] border-b border-[#292B2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A75A]/15 border border-[#C8A75A]/30 text-[#C8A75A] flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-[#EDEDED]">{lineageReport.kpiTitle}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {lineageReport.status === "VERIFIED" ? "بيانات موثقة ومطابقة (Verified)" : "قيد التدقيق"}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">تتبع خط سير البيانات وحساب الأرقام (Data Lineage & Traceability)</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedMetricForLineage(null)}
            className="p-2 text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Big Value Showcase */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#A1A1AA]">القيمة المحسوبة الفعلية</div>
              <div className="text-2xl sm:text-3xl font-black text-[#C8A75A] tracking-tight mt-0.5">
                {lineageReport.formattedValue}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#202225] rounded-lg border border-[#292B2E]">
                <Building2 className="w-3.5 h-3.5 text-[#C8A75A]" />
                <span>{lineageReport.companyName}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#202225] rounded-lg border border-[#292B2E]">
                <Calendar className="w-3.5 h-3.5 text-[#C8A75A]" />
                <span>{lineageReport.period}</span>
              </div>
            </div>
          </div>

          {/* Mathematical Formula & Source Rule */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#A1A1AA]">
              <Layers className="w-4 h-4 text-[#C8A75A]" />
              <span>معادلة الاحتساب ومصدر البيانات (Logic & Origin)</span>
            </div>
            <div className="p-3.5 bg-[#18191B] border border-[#292B2E] rounded-xl text-xs leading-relaxed space-y-2">
              <div className="font-mono text-[11px] text-emerald-400 bg-[#0C0D0E] p-2.5 rounded-lg border border-[#202225]">
                {lineageReport.calculationFormula}
              </div>
              <div className="text-[11px] text-[#A1A1AA] flex items-center justify-between">
                <span>الفلاتر النشطة: {lineageReport.filtersDescription}</span>
                <span className="font-bold text-[#EDEDED]">جدول المصدر: {lineageReport.sourceEntity}</span>
              </div>
            </div>
          </div>

          {/* Constituent Records Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#A1A1AA]">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#C8A75A]" />
                <span>السجلات المكونة للرقم ({lineageReport.constituentRecordIds.length} سجلات)</span>
              </div>
              <span className="text-[10px] text-[#6B7280]">عينة لأحدث 10 عمليات</span>
            </div>

            {lineageReport.sampleRecords.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B7280] bg-[#18191B] rounded-xl border border-[#292B2E]">
                لا توجد سجلات مطابقة للفترة والشركة المحددة حالياً.
              </div>
            ) : (
              <div className="bg-[#18191B] border border-[#292B2E] rounded-xl overflow-hidden divide-y divide-[#292B2E]">
                {lineageReport.sampleRecords.map((rec) => (
                  <div key={rec.id} className="p-3 flex items-center justify-between hover:bg-[#202225] transition-colors text-xs">
                    <div>
                      <div className="font-bold text-[#EDEDED] flex items-center gap-2">
                        <span>{rec.label}</span>
                        <span className="text-[10px] font-mono text-[#6B7280] bg-[#141517] px-1.5 py-0.5 rounded border border-[#292B2E]">
                          {rec.id.substring(0, 8)}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A1A1AA] mt-0.5">
                        التاريخ: {rec.date}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-[#C8A75A]">{rec.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Sales Adjustment Control Panel */}
          {selectedMetricForLineage === "monthlySales" && (
            <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C8A75A] animate-pulse" />
                  <span className="text-xs font-bold text-[#EDEDED]">أدوات تدقيق وتصحيح المبيعات (التحكم الكامل)</span>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs text-[#C8A75A] hover:underline bg-[#202225] px-2.5 py-1 rounded-md border border-[#292B2E] cursor-pointer"
                >
                  {isEditing ? "إغلاق لوحة التعديل" : "🔧 تعديل أو فرض أرقام مبيعات يدوية"}
                </button>
              </div>

              {!isEditing ? (
                <div className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  إذا كنت تلاحظ تكرارًا في الحسابات أو ترغب في تعديل الرقم المعروض ليطابق الرقم الحقيقي بالضبط، يمكنك الضغط على زر التعديل لفرض قيمة مبيعات معينة أو إضافة تسويات مالية يدوية.
                </div>
              ) : (
                <div className="space-y-4 pt-1 border-t border-[#292B2E] text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Manual Offset/Adjustment */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-[#A1A1AA] block font-semibold">
                        مبلغ تسوية يدوية (يضاف أو يطرح):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={adjustVal}
                          onChange={(e) => setAdjustVal(Number(e.target.value))}
                          placeholder="مثال: -15000 أو 20000"
                          className="flex-1 bg-[#141517] border border-[#292B2E] rounded-lg px-3 py-1.5 text-xs text-[#EDEDED] font-mono outline-hidden focus:border-[#C8A75A]"
                        />
                        <span className="text-[10px] text-[#6B7280]">ج.م</span>
                      </div>
                      <p className="text-[10px] text-[#6B7280]">
                        يُطرح أو يُضاف هذا المبلغ إلى الرقم الفعلي المحسوب تلقائياً.
                      </p>
                    </div>

                    {/* 2. Direct Override value */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-[#A1A1AA] block font-semibold">
                        فرض رقم مبيعات معين (Override):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={overrideVal === null ? "" : overrideVal}
                          onChange={(e) => setOverrideVal(e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="فرض رقم مبيعات ثابت للشهر"
                          className="flex-1 bg-[#141517] border border-[#292B2E] rounded-lg px-3 py-1.5 text-xs text-[#EDEDED] font-mono outline-hidden focus:border-[#C8A75A]"
                        />
                        <span className="text-[10px] text-[#6B7280]">ج.م</span>
                      </div>
                      <p className="text-[10px] text-[#6B7280]">
                        إذا تم كتابته، سيتم تجاهل كافة حسابات السجلات تماماً وعرض هذا الرقم. اتركه فارغاً للحساب التلقائي.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#292B2E]">
                    <button
                      onClick={() => {
                        setAdjustVal(0);
                        setOverrideVal(null);
                        setSalesManualAdjustment(0);
                        setSalesOverrideValue(null);
                        showToast("تم إعادة تصفير التسويات والرجوع لحسابات السجلات الفعلية", "info");
                        setIsEditing(false);
                      }}
                      className="px-3 py-1.5 bg-red-950/40 text-red-400 hover:bg-red-950/60 border border-red-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      🔄 استعادة حساب السجلات الفعلي
                    </button>
                    <button
                      onClick={() => {
                        setSalesManualAdjustment(adjustVal);
                        setSalesOverrideValue(overrideVal);
                        showToast("تم حفظ تعديلات أرقام المبيعات بنجاح وتحديث لوحة العمليات", "success");
                        setIsEditing(false);
                      }}
                      className="px-4 py-1.5 bg-[#C8A75A] hover:bg-[#B8974A] text-black rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      💾 حفظ وتطبيق التعديلات
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification Footnote */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{lineageReport.verificationNotes}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#18191B] border-t border-[#292B2E] flex items-center justify-between">
          <button
            onClick={() => {
              const targetTab = lineageReport.sourceEntity === "sales" ? "sales" : lineageReport.sourceEntity === "quotations" ? "quotations" : "contracts";
              setSelectedMetricForLineage(null);
              setCurrentTab(targetTab as any);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#202225] hover:bg-[#25282C] text-[#EDEDED] rounded-xl text-xs font-bold border border-[#292B2E] transition-all cursor-pointer"
          >
            <span>عرض السجلات بالكامل في شاشة {lineageReport.sourceEntity}</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>

          <button
            onClick={() => setSelectedMetricForLineage(null)}
            className="px-4 py-1.5 bg-[#C8A75A] hover:bg-[#B8974A] text-black font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
