import React from "react";
import { Quotation } from "../../types";
import { useApp } from "../../context/AppContext";
import { X, Printer, Download, MessageCircle, FileCheck2, Building2 } from "lucide-react";

export const QuotationPrintModal: React.FC = () => {
  const { selectedQuotationForPrint, setSelectedQuotationForPrint, companies } = useApp();

  if (!selectedQuotationForPrint) return null;

  const q = selectedQuotationForPrint;
  const company = companies.find((c) => c.id === q.companyId);

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const text = `السلام عليكم أستاذ ${q.customerName}، يسعدنا إرسال عرض السعر رقم (${q.quoteNumber}) لقطاعات الـ UPVC بإجمالي ${(q.totalAmount || 0).toLocaleString()} ج.م شامل التوريد والتركيب والضمان.`;
    window.open(`https://wa.me/2${q.customerPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[95vh]">
        {/* Top Controls (not printed) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">معاينة وطباعة عرض السعر</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              {q.quoteNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>إرسال للعميل (واتساب)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / PDF</span>
            </button>

            <button
              onClick={() => setSelectedQuotationForPrint(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 space-y-6 text-slate-900 bg-white print:p-0">
          {/* Header with Company Logo & Data */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {company?.name || "شركة UPVC المتقدمة"}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                متخصصون في تصنيع وتركيب شبابيك وأبواب UPVC بأعلى معايير العزل والجودة
              </p>
              <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                <div>العنوان: القاهرة الجديدة - التجمع الخامس</div>
                <div>تليفون: {company?.phone || ""}</div>
              </div>
            </div>
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt="Company Logo" className="h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center font-black text-xl rounded-2xl">
                {company?.logoText || "UPVC"}
              </div>
            )}
            <div className="text-left space-y-1">
              <div className="text-sm font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 inline-block font-mono">
                {q.quoteNumber}
              </div>
              <div className="text-xs text-slate-600">التاريخ: {q.date}</div>
              <div className="text-xs text-slate-500">صالح حتى: {q.expiryDate}</div>
            </div>
          </div>

          {/* Customer Info Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">السيد العميل:</span>
              <strong className="text-sm text-slate-900">{q.customerName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">رقم الهاتف:</span>
              <strong className="font-mono text-slate-900" dir="ltr">
                {q.customerPhone}
              </strong>
            </div>
          </div>

          {/* Items Table with UPVC Calculation Specs */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">بيان البند والنوع</th>
                  <th className="p-3">المقاسات (سم)</th>
                  <th className="p-3">المساحة م²</th>
                  <th className="p-3">العدد</th>
                  <th className="p-3">سعر الوحدة</th>
                  <th className="p-3">الإجمالي (ج.م)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {q.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-500">{idx + 1}</td>
                    <td className="p-3">
                      <strong className="text-slate-900 block">{item.description}</strong>
                      <span className="text-[11px] text-slate-500">
                        {item.profileType || "قطاع UPVC ممتاز"} • {item.glassType || "زجاج عازل"}
                      </span>
                    </td>
                    <td className="p-3 font-mono" dir="ltr">
                      {item.width ? `${item.width} × ${item.height}` : "-"}
                    </td>
                    <td className="p-3 font-mono">
                      {item.area ? item.area.toFixed(2) : "-"}
                    </td>
                    <td className="p-3 font-bold">{item.quantity}</td>
                    <td className="p-3 font-mono">{item.unitPrice.toLocaleString()}</td>
                    <td className="p-3 font-black text-slate-900">
                      {item.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Calculation */}
          <div className="flex justify-end">
            <div className="w-64 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-bold">{(q.totalAmount || 0).toLocaleString()} ج.م</span>
              </div>
              {q.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>خصم خاص:</span>
                  <span className="font-bold">-{q.discount.toLocaleString()} ج.م</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>الإجمالي النهائي:</span>
                <span className="text-emerald-700">
                  {(q.totalAmount - q.discount).toLocaleString()} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* Terms and Signatures */}
          <div className="border-t border-slate-200 pt-4 space-y-2 text-[11px] text-slate-600">
            <h4 className="font-bold text-slate-900">شروط وأحكام العرض:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>الأسعار تشمل التوريد والتركيب والمعاينة الموقعية.</li>
              <li>ضمان 10 سنوات على قطاعات الـ UPVC ضد التغير اللوني وعيوب التصنيع.</li>
              <li>الدفعة المقدمة 50% عند توقيع العقد، و40% عند التوريد، و10% بعد إتمام التركيب والاستلام.</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-8 text-center text-xs text-slate-700">
            <div className="border-t border-slate-300 pt-2">
              <p className="font-bold">توقيع مسؤول المبيعات والاعتماد</p>
            </div>
            <div className="border-t border-slate-300 pt-2">
              <p className="font-bold">موافقة وتوقيع السيد العميل</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
