import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  FileText,
  DollarSign,
  Calendar,
  User,
  Percent,
  Receipt,
  AlertCircle,
  TrendingUp,
  CreditCard,
  ArrowDownLeft,
} from "lucide-react";
import { Contract, Payment } from "../../types";

interface FinanceDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "contracts" | "collected" | "remaining" | "receipts" | null;
  contracts: Contract[];
  payments: Payment[];
  onCollect?: (contractId: string, remainingAmount: number) => void;
}

export const FinanceDrillDownModal: React.FC<FinanceDrillDownModalProps> = ({
  isOpen,
  onClose,
  type,
  contracts,
  payments,
  onCollect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter & calculate based on type
  const title = type
    ? {
        contracts: "كشف إجمالي التعاقدات (88 عقدًا معتمدًا)",
        collected: "سجل التحصيلات الفعلية المسددة",
        remaining: "كشف مستحقات ومتبقيات العملاء",
        receipts: "دفتر الإيصالات والتحصيلات",
      }[type]
    : "";

  // 1. Filtered and clean data
  const validContracts = useMemo(() => {
    if (!isOpen || !type) return [];
    return contracts.filter(
      (c) =>
        c.recordStatus !== "duplicate" &&
        c.recordStatus !== "excluded" &&
        c.status !== "cancelled"
    );
  }, [contracts, isOpen, type]);

  const validPayments = useMemo(() => {
    if (!isOpen || !type) return [];
    return payments.filter(
      (p) =>
        p.recordStatus !== "duplicate" &&
        p.recordStatus !== "excluded" &&
        p.status !== "reversed" &&
        p.status !== "refunded"
    );
  }, [payments, isOpen, type]);

  // Extract records to display
  const records = useMemo(() => {
    if (!isOpen || !type) return [];
    let list: any[] = [];
    if (type === "contracts") {
      list = validContracts;
    } else if (type === "collected") {
      list = validPayments;
    } else if (type === "remaining") {
      list = validContracts.filter((c) => (c.remainingAmount ?? (c.totalValue - (c.paidAmount || 0))) > 0);
    } else if (type === "receipts") {
      list = payments; // Show all payments including reversed/refunded for audit!
    }

    // Apply search filter
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      list = list.filter((item) => {
        const customerName = (item.customerName || "").toLowerCase();
        const contractNumber = (item.contractNumber || "").toLowerCase();
        const receiptNumber = (item.receiptNumber || "").toLowerCase();
        const notes = (item.notes || "").toLowerCase();
        return (
          customerName.includes(q) ||
          contractNumber.includes(q) ||
          receiptNumber.includes(q) ||
          notes.includes(q)
        );
      });
    }

    return list;
  }, [type, isOpen, validContracts, validPayments, payments, searchTerm]);

  // Aggregate stats for filtered records
  const stats = useMemo(() => {
    if (!isOpen || !type) {
      return { totalVal: 0, paidVal: 0, remVal: 0, totalAmount: 0, reversedAmount: 0, refundedAmount: 0, count: 0 };
    }
    if (type === "contracts" || type === "remaining") {
      const totalVal = records.reduce((sum, c) => sum + (c.totalValue || 0), 0);
      const paidVal = records.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
      const remVal = records.reduce((sum, c) => sum + (c.remainingAmount ?? (c.totalValue - (c.paidAmount || 0))), 0);
      return { totalVal, paidVal, remVal, totalAmount: 0, reversedAmount: 0, refundedAmount: 0, count: records.length };
    } else {
      const totalAmount = records.reduce((sum, p) => {
        if (p.status === "reversed" || p.status === "refunded") return sum;
        return sum + p.amount;
      }, 0);
      const reversedAmount = records.reduce((sum, p) => {
        if (p.status === "reversed") return sum + p.amount;
        return sum;
      }, 0);
      const refundedAmount = records.reduce((sum, p) => {
        if (p.status === "refunded") return sum + p.amount;
        return sum;
      }, 0);
      return { totalVal: 0, paidVal: 0, remVal: 0, totalAmount, reversedAmount, refundedAmount, count: records.length };
    }
  }, [records, type, isOpen]);

  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-150">
      <div className="bg-[#18191B] border border-[#292B2E] rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
        
        {/* Header */}
        <div className="p-6 border-b border-[#292B2E] bg-[#1E2023] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#C8A75A]/10 border border-[#C8A75A]/20 flex items-center justify-center text-[#C8A75A]">
              {type === "contracts" ? (
                <FileText className="w-5.5 h-5.5" />
              ) : type === "collected" ? (
                <ArrowDownLeft className="w-5.5 h-5.5 text-emerald-400" />
              ) : type === "remaining" ? (
                <AlertCircle className="w-5.5 h-5.5 text-amber-400" />
              ) : (
                <Receipt className="w-5.5 h-5.5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-[#EDEDED]">{title}</h3>
              <p className="text-xs text-[#A1A1AA] mt-1">
                تصفية وعرض تفصيلي فوري للحسابات والقيود المتطابقة.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#292B2E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 bg-[#1E2023]/40 border-b border-[#292B2E] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
            <input
              type="text"
              placeholder="ابحث باسم العميل، رقم العقد، رقم الإيصال..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] focus:outline-none focus:border-[#C8A75A] transition-colors"
            />
          </div>

          {/* Quick Metrics Badges inside Drilldown */}
          <div className="flex flex-wrap items-center gap-2.5">
            {type === "contracts" || type === "remaining" ? (
              <>
                <span className="text-xs px-3 py-1.5 rounded-xl bg-[#292B2E] text-[#A1A1AA]">
                  العدد: <strong className="text-[#EDEDED] font-mono">{stats.count}</strong>
                </span>
                <span className="text-xs px-3 py-1.5 rounded-xl bg-[#C8A75A]/10 text-[#C8A75A] border border-[#C8A75A]/20">
                  إجمالي العقود: <strong className="font-mono">{(stats as any).totalVal.toLocaleString()} ج.م</strong>
                </span>
                <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-900/30">
                  المحصل: <strong className="font-mono">{(stats as any).paidVal.toLocaleString()} ج.م</strong>
                </span>
                <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-950/40 text-amber-400 border border-amber-900/30">
                  المتبقي: <strong className="font-mono">{(stats as any).remVal.toLocaleString()} ج.م</strong>
                </span>
              </>
            ) : (
              <>
                <span className="text-xs px-3 py-1.5 rounded-xl bg-[#292B2E] text-[#A1A1AA]">
                  العدد: <strong className="text-[#EDEDED] font-mono">{stats.count}</strong>
                </span>
                <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-900/30">
                  إجمالي التحصيلات النشطة: <strong className="font-mono">{(stats as any).totalAmount.toLocaleString()} ج.م</strong>
                </span>
                {(stats as any).reversedAmount > 0 && (
                  <span className="text-xs px-3 py-1.5 rounded-xl bg-rose-950/40 text-rose-400 border border-rose-900/30">
                    المعكوس (Reversed): <strong className="font-mono">{(stats as any).reversedAmount.toLocaleString()} ج.م</strong>
                  </span>
                )}
                {(stats as any).refundedAmount > 0 && (
                  <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-950/40 text-amber-400 border border-amber-900/30">
                    المرتجع (Refunded): <strong className="font-mono">{(stats as any).refundedAmount.toLocaleString()} ج.م</strong>
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Table Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#18191B]">
          <div className="border border-[#292B2E] rounded-2xl overflow-hidden bg-[#202225]/40">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#202225] text-[#A1A1AA] border-b border-[#292B2E]">
                {type === "contracts" || type === "remaining" ? (
                  <tr>
                    <th className="p-3 font-bold">رقم العقد</th>
                    <th className="p-3 font-bold">تاريخ العقد</th>
                    <th className="p-3 font-bold">اسم العميل</th>
                    <th className="p-3 font-bold">مندوب المبيعات</th>
                    <th className="p-3 font-bold text-left">قيمة العقد</th>
                    <th className="p-3 font-bold text-left">المسدد</th>
                    <th className="p-3 font-bold text-left">المتبقي</th>
                    <th className="p-3 font-bold text-center">حالة التحصيل</th>
                    <th className="p-3 font-bold text-center">إجراءات</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="p-3 font-bold">رقم الإيصال</th>
                    <th className="p-3 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">اسم العميل</th>
                    <th className="p-3 font-bold">رقم العقد</th>
                    <th className="p-3 font-bold text-left">المبلغ</th>
                    <th className="p-3 font-bold">طريقة الدفع</th>
                    <th className="p-3 font-bold text-center">الحالة</th>
                    <th className="p-3 font-bold">ملاحظات</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-[#292B2E]">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-[#71717A] text-xs">
                      لا توجد سجلات مطابقة للبحث حاليًا
                    </td>
                  </tr>
                ) : type === "contracts" || type === "remaining" ? (
                  records.map((c) => {
                    const totalVal = c.totalValue || 0;
                    const paidVal = c.paidAmount || 0;
                    const remVal = c.remainingAmount ?? (totalVal - paidVal);
                    const isPaidFull = remVal <= 0;

                    return (
                      <tr key={c.id} className="hover:bg-[#25282B] transition-colors">
                        <td className="p-3 font-mono font-bold text-[#EDEDED]">
                          {c.contractNumber || c.id.slice(0, 8)}
                        </td>
                        <td className="p-3 font-mono text-[#A1A1AA]">
                          {c.date ? c.date.substring(0, 10) : "-"}
                        </td>
                        <td className="p-3 font-bold text-[#EDEDED]">{c.customerName}</td>
                        <td className="p-3 text-[#A1A1AA]">{c.salesRep || "-"}</td>
                        <td className="p-3 font-mono font-bold text-left text-[#EDEDED]">
                          {totalVal.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 font-mono font-bold text-left text-emerald-400">
                          {paidVal.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 font-mono font-bold text-left text-amber-400">
                          {remVal.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isPaidFull
                                ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                                : remVal > 0 && paidVal > 0
                                ? "bg-sky-950/60 text-sky-400 border-sky-800/40"
                                : "bg-amber-950/60 text-amber-400 border-amber-800/40"
                            }`}
                          >
                            {isPaidFull ? "مسدد بالكامل" : paidVal > 0 ? "مسدد جزئياً" : "بانتظار المقدم"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {remVal > 0 ? (
                            <button
                              onClick={() => onCollect?.(c.id, remVal)}
                              className="px-2.5 py-1 bg-[#C8A75A]/10 hover:bg-[#C8A75A]/20 text-[#C8A75A] border border-[#C8A75A]/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 mx-auto"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>تحصيل الآن</span>
                            </button>
                          ) : (
                            <span className="text-emerald-500 text-[10px] font-bold">✓ مكتمل</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  records.map((p) => {
                    const statusStyles = {
                      recorded: "bg-blue-950/60 text-blue-400 border-blue-800/40",
                      confirmed: "bg-emerald-950/60 text-emerald-400 border-emerald-800/40",
                      reversed: "bg-rose-950/60 text-rose-400 border-rose-800/40",
                      refunded: "bg-amber-950/60 text-amber-400 border-amber-800/40",
                    };
                    const statusLabels = {
                      recorded: "مسجل",
                      confirmed: "مؤكد",
                      reversed: "معكوس",
                      refunded: "مرتجع",
                    };

                    return (
                      <tr key={p.id} className="hover:bg-[#25282B] transition-colors">
                        <td className="p-3 font-mono font-bold text-[#EDEDED]">
                          {p.receiptNumber || `REC-${p.id.slice(0, 6)}`}
                        </td>
                        <td className="p-3 font-mono text-[#A1A1AA]">
                          {p.date ? p.date.substring(0, 10) : "-"}
                        </td>
                        <td className="p-3 font-bold text-[#EDEDED]">{p.customerName}</td>
                        <td className="p-3 font-mono text-[#A1A1AA]">{p.contractNumber || "-"}</td>
                        <td className="p-3 font-mono font-bold text-left text-emerald-400">
                          {p.amount.toLocaleString()} ج.م
                        </td>
                        <td className="p-3">
                          <span className="px-1.5 py-0.5 bg-[#292B2E] text-[#A1A1AA] rounded text-[10px]">
                            {p.method}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              statusStyles[p.status] || statusStyles.confirmed
                            }`}
                          >
                            {statusLabels[p.status] || "مؤكد"}
                          </span>
                        </td>
                        <td className="p-3 text-[#71717A] max-w-[150px] truncate" title={p.notes}>
                          {p.notes || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#292B2E] bg-[#1E2023] flex items-center justify-between text-[11px] text-[#71717A]">
          <span>PVC NESTA • نظام الرقابة والتحقق المالي الشامل v1.0</span>
          <span>إجمالي السجلات المعروضة: {records.length}</span>
        </div>
      </div>
    </div>
  );
};
