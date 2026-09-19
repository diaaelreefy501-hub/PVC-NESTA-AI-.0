import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { CompanyId, QuotationItem } from "../../types";
import {
  FileSpreadsheet,
  Zap,
  Layers,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

interface CreateQuotationModalProps {
  onClose: () => void;
  defaultCustomerId?: string;
}

export const CreateQuotationModal: React.FC<CreateQuotationModalProps> = ({
  onClose,
  defaultCustomerId,
}) => {
  const { customers, companies, activeCompanyId, addQuotation } = useApp();

  // Mode: "quick" for rapid total + description, "detailed" for itemized dimensions
  const [entryMode, setEntryMode] = useState<"quick" | "detailed">("quick");

  // General deal info
  const [customerId, setCustomerId] = useState(defaultCustomerId || customers[0]?.id || "");
  const [companyId, setCompanyId] = useState<CompanyId>(
    activeCompanyId !== "all" ? activeCompanyId : companies[0]?.id || "comp-newhouse"
  );
  const [notes, setNotes] = useState("");
  const [expiryDays, setExpiryDays] = useState(15);

  // Quick Mode inputs
  const [quickAmount, setQuickAmount] = useState<number | "">("");
  const [quickDescription, setQuickDescription] = useState(
    "توريد وتركيب شبابيك وأبواب UPVC شامل الزجاج والإكسسوارات"
  );

  // Detailed Mode inputs
  const [detailedItems, setDetailedItems] = useState<
    Array<{
      id: string;
      description: string;
      width: number;
      height: number;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      systemType?: string;
      glassType?: string;
    }>
  >([
    {
      id: "item-1",
      description: "شباك UPVC جرار ضلفتين",
      width: 1.2,
      height: 1.2,
      quantity: 1,
      unitPrice: 4500,
      totalPrice: 4500,
      systemType: "جرار",
      glassType: "دبل 24 مم شفاف",
    },
  ]);

  const addDetailedItem = () => {
    setDetailedItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: "شباك UPVC مفصلي",
        width: 1.0,
        height: 1.2,
        quantity: 1,
        unitPrice: 4000,
        totalPrice: 4000,
        systemType: "مفصلي",
        glassType: "دبل 24 مم شفاف",
      },
    ]);
  };

  const removeDetailedItem = (id: string) => {
    setDetailedItems((prev) => prev.filter((it) => it.id !== id));
  };

  const updateDetailedItem = (
    id: string,
    updates: Partial<{
      description: string;
      width: number;
      height: number;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      systemType?: string;
      glassType?: string;
    }>
  ) => {
    setDetailedItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, ...updates };
        updated.totalPrice = (updated.quantity || 1) * (updated.unitPrice || 0);
        return updated;
      })
    );
  };

  const calculatedDetailedTotal = detailedItems.reduce(
    (acc, it) => acc + (it.totalPrice || 0),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) {
      alert("يرجى اختيار العميل");
      return;
    }

    const today = new Date();
    const expDate = new Date();
    expDate.setDate(today.getDate() + expiryDays);

    let finalItems: QuotationItem[] = [];
    let finalTotal = 0;

    if (entryMode === "quick") {
      finalTotal = Number(quickAmount) || 0;
      finalItems = [
        {
          id: crypto.randomUUID(),
          description: quickDescription,
          quantity: 1,
          unitPrice: finalTotal,
          totalPrice: finalTotal,
        },
      ];
    } else {
      finalTotal = calculatedDetailedTotal;
      finalItems = detailedItems.map((item) => {
        return {
          id: item.id,
          description: item.description,
          width: item.width,
          height: item.height,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice,
          systemType: item.systemType,
          glassType: item.glassType,
        };
      });
    }

    if (finalTotal <= 0) {
      alert("يرجى إدخال قيمة العرض بشكل صحيح");
      return;
    }

    addQuotation({
      companyId,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      area: cust.area,
      date: today.toISOString().split("T")[0],
      expiryDate: expDate.toISOString().split("T")[0],
      status: "sent",
      items: finalItems,
      subtotal: finalTotal,
      discountTotal: 0,
      totalAmount: finalTotal,
      notes,
      isSummaryQuote: entryMode === "quick",
      summaryDescription: entryMode === "quick" ? quickDescription : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#EAEAEA] overflow-hidden my-auto animate-in fade-in" dir="rtl">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#111111] text-white flex items-center justify-between border-b border-[#222222]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C8A75A]/20 text-[#C8A75A] border border-[#C8A75A]/40 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">إنشاء عرض سعر جديد</h3>
              <p className="text-[11px] text-[#9CA3AF]">اختر الإدخال السريع المباشر أو التفصيل بالمقاسات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#9CA3AF] hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-3 bg-[#F8F8F5] border-b border-[#EAEAEA] flex gap-2">
          <button
            type="button"
            onClick={() => setEntryMode("quick")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              entryMode === "quick"
                ? "bg-[#111111] text-[#C8A75A] shadow-xs"
                : "bg-white text-[#6B7280] border border-[#EAEAEA] hover:bg-slate-50"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>عرض سعر سريع (قيمة + وصف فقط)</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode("detailed")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              entryMode === "detailed"
                ? "bg-[#111111] text-[#C8A75A] shadow-xs"
                : "bg-white text-[#6B7280] border border-[#EAEAEA] hover:bg-slate-50"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>مقايسة تفصيلية (بنود ومقاسات)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Top Section: Client & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#111111]">العميل *:</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold text-[#111111] outline-hidden focus:border-[#C8A75A]"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) {c.area ? `- ${c.area}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#111111]">الشركة التابع لها العرض *:</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value as CompanyId)}
                className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold text-[#111111] outline-hidden focus:border-[#C8A75A]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 1. QUICK MODE INPUTS */}
          {entryMode === "quick" && (
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-3.5">
              <div className="space-y-1">
                <label className="font-extrabold text-[#111111] flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#C8A75A]" />
                  <span>إجمالي قيمة العرض (بالجنيه المصري) *:</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step={500}
                  placeholder="مثال: 65000"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value ? Number(e.target.value) : "")}
                  className="w-full p-3 bg-white border border-[#EAEAEA] rounded-xl font-mono text-base font-black text-[#111111] focus:border-[#C8A75A] outline-hidden"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#111111]">وصف العرض والأعمال المشمولة *:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="مثال: توريد وتركيب عدد 6 شبابيك UPVC دبل جورجيا لفيلا التجمع..."
                  value={quickDescription}
                  onChange={(e) => setQuickDescription(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#111111] focus:border-[#C8A75A] outline-hidden"
                />
              </div>
            </div>
          )}

          {/* 2. DETAILED MODE INPUTS */}
          {entryMode === "detailed" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-[#111111]">بنود المقايسة:</span>
                <button
                  type="button"
                  onClick={addDetailedItem}
                  className="px-2.5 py-1 bg-[#111111] text-[#C8A75A] rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بند</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {detailedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl space-y-2 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[11px] text-[#6B7280]">بند #{idx + 1}</span>
                      {detailedItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDetailedItem(item.id)}
                          className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={item.description}
                          placeholder="الوصف / نوع الوحدة"
                          onChange={(e) => updateDetailedItem(item.id, { description: e.target.value })}
                          className="w-full p-1.5 bg-white border border-[#EAEAEA] rounded-lg text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={item.quantity}
                          min={1}
                          placeholder="العدد"
                          onChange={(e) =>
                            updateDetailedItem(item.id, { quantity: Number(e.target.value) })
                          }
                          className="w-full p-1.5 bg-white border border-[#EAEAEA] rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={item.unitPrice}
                          step={100}
                          placeholder="سعر الوحدة"
                          onChange={(e) =>
                            updateDetailedItem(item.id, { unitPrice: Number(e.target.value) })
                          }
                          className="w-full p-1.5 bg-white border border-[#EAEAEA] rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1">
                      <span>الإجمالي للبند:</span>
                      <strong className="text-[#111111] font-mono font-black">
                        {(item.totalPrice || 0).toLocaleString()} ج.م
                      </strong>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-[#111111] text-white rounded-xl flex items-center justify-between">
                <span className="font-bold">إجمالي المقايسة التفصيلية:</span>
                <span className="font-mono text-base font-black text-[#C8A75A]">
                  {((calculatedDetailedTotal) || 0).toLocaleString()} ج.م
                </span>
              </div>
            </div>
          )}

          {/* Expiry and General Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="font-bold text-[#6B7280]">صلاحية العرض (أيام):</label>
              <input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-[#6B7280]">ملاحظات وشروط الدفع والتسليم:</label>
              <input
                type="text"
                placeholder="مثال: الدفعة الأولى 50% والتسليم خلال 20 يوم عمل..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAEAEA]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#6B7280] hover:text-[#111111] rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ وإصدار العرض</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
