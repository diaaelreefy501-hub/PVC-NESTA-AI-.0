import React from "react";
import { Customer } from "../../types";
import { useApp } from "../../context/AppContext";
import { AlertCircle, UserCheck, Eye, PlusCircle, X, Phone, MapPin, Building2 } from "lucide-react";

interface DuplicateCustomerModalProps {
  customer?: Customer | null;
  onClose?: () => void;
  onAddInquiryToExisting?: (cust: Customer) => void;
}

export const DuplicateCustomerModal: React.FC<DuplicateCustomerModalProps> = ({
  customer = null,
  onClose = () => {},
  onAddInquiryToExisting,
}) => {
  const { setSelectedCustomerIdFor360, setCurrentTab, companies } = useApp();

  if (!customer) return null;

  const company = companies.find((c) => c.id === customer.companyId);

  const handleOpen360 = () => {
    setSelectedCustomerIdFor360(customer.id);
    onClose();
  };

  const handleAddInquiry = () => {
    if (onAddInquiryToExisting) {
      onAddInquiryToExisting(customer);
    } else {
      setSelectedCustomerIdFor360(customer.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-amber-50 p-4 border-b border-amber-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                هذا العميل موجود بالفعل في النظام!
              </h3>
              <p className="text-xs text-amber-800">
                رقم الهاتف مسجل مسبقاً لمنع تكرار الحسابات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Customer Card */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                {customer.name}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800">
                {customer.stage}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span dir="ltr">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.area}</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>الشركة: <strong className="text-slate-800">{company?.name || "غير محدد"}</strong></span>
              </div>
            </div>

            {customer.notes && (
              <p className="text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-100 italic">
                "{customer.notes}"
              </p>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            بدلاً من إنشاء سجل مكرر، يمكنك فتح ملف العميل لإضافة تفاعل جديد أو استفسار أو تحديث بياناته مباشرة.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleOpen360}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>فتح ملف العميل الكامل (Customer 360)</span>
            </button>

            <button
              onClick={handleAddInquiry}
              className="w-full py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>ربط الاستفسار الحالي بهذا العميل</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 px-4 text-slate-500 hover:text-slate-800 text-xs font-medium"
            >
              تعديل رقم الهاتف والمتابعة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
