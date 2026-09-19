import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  User,
  Phone,
  Building2,
  MapPin,
  Flame,
  FileText,
  Tag,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Customer, CompanyId, CustomerStage, InterestLevel, CustomerSource } from "../../types";
import { STANDARD_AREAS, normalizeArea } from "../../utils/areaUtils";

interface CustomerEditModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updated: Customer) => void;
}

const STAGE_OPTIONS: { value: CustomerStage; label: string }[] = [
  { value: "inquiry", label: "استفسار جديد" },
  { value: "contacted", label: "تم التواصل" },
  { value: "qualified", label: "مؤهل / جاد" },
  { value: "inspection", label: "معاينة / رفع مقاسات" },
  { value: "quotation", label: "عرض سعر" },
  { value: "negotiation", label: "تفاوض" },
  { value: "contracted", label: "تم التعاقد" },
  { value: "sold", label: "مبيعات مكتملة" },
  { value: "lost", label: "فرصة ضائعة" },
  { value: "deferred", label: "مؤجل" },
];

const SOURCE_OPTIONS: CustomerSource[] = [
  "Excel Import",
  "WhatsApp",
  "Facebook",
  "Instagram",
  "Phone Call",
  "Phone",
  "Website",
  "Referral",
  "Manual",
  "AI Assistant",
  "Other",
];

export const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { companies, users, updateCustomer } = useApp();

  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState<CompanyId>("");
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [stage, setStage] = useState<CustomerStage>("inquiry");
  const [interestLevel, setInterestLevel] = useState<InterestLevel>("warm");
  const [source, setSource] = useState<CustomerSource>("Excel Import");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [customArea, setCustomArea] = useState("");

  const isNameMissing =
    !customer?.name?.trim() || customer.name.startsWith("عميل بدون اسم");

  useEffect(() => {
    if (customer) {
      // If customer name was placeholder "عميل بدون اسم X", clear it so user can enter real name easily
      if (customer.name.startsWith("عميل بدون اسم")) {
        setName("");
      } else {
        setName(customer.name || "");
      }
      setCompanyId(customer.companyId || (companies[0]?.id as CompanyId) || "");
      setPhone(customer.phone || "");
      setSecondaryPhone(customer.secondaryPhone || "");
      setArea(customer.area || "");
      setAddress(customer.address || "");
      setStage(customer.stage || "inquiry");
      setInterestLevel(customer.interestLevel || "warm");
      setSource(customer.source || "Excel Import");
      setAssignedTo(customer.assignedTo || customer.responsible || "");
      setNotes(customer.notes || "");
      setSavedSuccess(false);

      if (customer.area && !STANDARD_AREAS.includes(customer.area as any)) {
        setCustomArea(customer.area);
      } else {
        setCustomArea("");
      }
    }
  }, [customer, companies, isOpen]);

  if (!isOpen || !customer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalArea = area === "أخرى" ? customArea.trim() : area.trim();
    const finalName = name.trim();

    const updates: Partial<Customer> = {
      name: finalName,
      companyId: companyId as CompanyId,
      phone: phone.trim(),
      secondaryPhone: secondaryPhone.trim(),
      area: finalArea ? normalizeArea(finalArea) : "",
      address: address.trim(),
      stage,
      interestLevel,
      source,
      assignedTo: assignedTo.trim() || undefined,
      notes: notes.trim(),
    };

    updateCustomer(customer.id, updates);

    setSavedSuccess(true);
    if (onSaved) {
      onSaved({
        ...customer,
        ...updates,
      } as Customer);
    }

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const selectedCompany = companies.find((c) => c.id === companyId);

  return (
    <div
      id="customer-edit-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        id="customer-edit-modal-container"
        className="bg-[#18191B] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#292B2E] flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#292B2E] bg-[#111111]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#EDEDED] flex items-center gap-2">
                <span>تعديل واستكمال بيانات العميل</span>
                {isNameMissing && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    بحاجة لإكمال الاسم
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                {selectedCompany?.name ? `الشركة: ${selectedCompany.name}` : "إدارة بيانات العميل"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Missing Name Banner */}
        {isNameMissing && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 flex items-start gap-3 text-amber-300">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">هذا العميل بدون اسم في بيانات الاستيراد!</p>
              <p className="text-[#A1A1AA] mt-0.5">
                يرجى كتابة اسم العميل الحقيقي أدناه. سيتم حفظ الاسم وتحديث كافة العقود والمبيعات وسجلات المتابعة المرتبطة به تلقائياً.
              </p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Row 1: Name & Company */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#EDEDED] mb-1">
                اسم العميل <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: م. أحمد مصطفى"
                  className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-[#202225] text-[#EDEDED] focus:outline-hidden transition-all ${
                    isNameMissing && !name.trim()
                      ? "border-amber-400 focus:border-amber-500 bg-amber-500/5"
                      : "border-[#292B2E] focus:border-[#C8A75A]"
                  }`}
                  autoFocus={isNameMissing}
                />
                {isNameMissing && !name.trim() && (
                  <span className="absolute left-3 top-2.5 text-[10px] text-amber-400 font-bold">
                    مطلوب
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#EDEDED] mb-1">
                الشركة التابع لها
              </label>
              <div className="relative">
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value as CompanyId)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#292B2E] bg-[#202225] text-[#EDEDED] focus:border-[#C8A75A] focus:outline-hidden"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.nameEn ? `(${c.nameEn})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Phones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#EDEDED] mb-1">
                رقم الهاتف الأساسي
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full h-10 px-3.5 pl-9 text-xs rounded-xl border border-[#292B2E] bg-[#202225] text-[#EDEDED] font-mono focus:border-[#C8A75A] focus:outline-hidden"
                  dir="ltr"
                />
                <Phone className="w-4 h-4 text-[#6B7280] absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#EDEDED] mb-1">
                رقم هاتف إضافي (اختياري)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  placeholder="012XXXXXXXX"
                  className="w-full h-10 px-3.5 pl-9 text-xs rounded-xl border border-[#292B2E] bg-[#202225] text-[#EDEDED] font-mono focus:border-[#C8A75A] focus:outline-hidden"
                  dir="ltr"
                />
                <Phone className="w-4 h-4 text-[#6B7280] absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Row 3: Area & Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#EDEDED] mb-1">
                المنطقة الجغرافية
              </label>
              <div className="space-y-2">
                <select
                  value={
                    STANDARD_AREAS.includes(area as any)
                      ? area
                      : area
                      ? "أخرى"
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "أخرى") {
                      setArea("أخرى");
                    } else {
                      setArea(val);
                    }
                  }}
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#292B2E] bg-[#202225] text-[#EDEDED] focus:border-[#C8A75A] focus:outline-hidden"
                >
                  <option value="">-- اختر المنطقة (أو اتركها فارغة) --</option>
                  {STANDARD_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                  <option value="أخرى">منطقة أخرى (كتابة يدوية)...</option>
                </select>

                {(area === "أخرى" || (!STANDARD_AREAS.includes(area as any) && area)) && (
                  <input
                    type="text"
                    value={customArea || area}
                    onChange={(e) => {
                      setCustomArea(e.target.value);
                      setArea("أخرى");
                    }}
                    placeholder="اكتب اسم المنطقة هنا..."
                    className="w-full h-10 px-3.5 text-xs rounded-xl border border-amber-500/40 bg-amber-500/5 text-[#EDEDED] focus:border-[#C8A75A] focus:outline-hidden"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#EDEDED] mb-1">
                العنوان التفصيلي (الشارع / الكمبوند / العمارة)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="مثال: كمبوند ميفيدا - عمارة 12 شقة 4"
                  className="w-full h-10 px-3.5 pl-9 text-xs rounded-xl border border-[#292B2E] bg-[#202225] text-[#EDEDED] focus:border-[#C8A75A] focus:outline-hidden"
                />
                <MapPin className="w-4 h-4 text-[#6B7280] absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Row 4: Stage, Interest, Source, Responsible */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#EDEDED] mb-1">
                مرحلة العميل (Pipeline)
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as CustomerStage)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#292B2E] bg-[#202225] text-[#EDEDED] focus:border-[#C8A75A] focus:outline-hidden"
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#EDEDED] mb-1">
                درجة الاهتمام
              </label>
              <select
                value={interestLevel}
                onChange={(e) => setInterestLevel(e.target.value as InterestLevel)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#292B2E] bg-[#202225] text-[#EDEDED] focus:border-[#C8A75A] focus:outline-hidden"
              >
                <option value="hot">🔥 مهتم جداً (Hot)</option>
                <option value="warm">🟠 متوسط (Warm)</option>
                <option value="cold">🔵 بارد (Cold)</option>
                <option value="lost">❌ غير مهتم / ملغي (Lost)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#EDEDED] mb-1">
                مصدر العميل
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as CustomerSource)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#292B2E] bg-[#202225] text-[#EDEDED] focus:border-[#C8A75A] focus:outline-hidden"
              >
                {SOURCE_OPTIONS.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#EDEDED] mb-1">
                المسؤول عن العميل
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#292B2E] bg-[#202225] text-[#EDEDED] focus:border-[#C8A75A] focus:outline-hidden"
              >
                <option value="">-- غير محدد --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role === "owner" ? "مالك" : u.role === "admin" ? "مدير" : "مبيعات"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Notes & Imported Row Data */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#EDEDED]">
                الملاحظات وبيانات الصف المستوردة كاملة
              </label>
              <span className="text-[11px] text-[#A1A1AA]">
                تشمل كافة الأعمدة والبيانات المستوردة من ملف Excel
              </span>
            </div>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب أي ملاحظات أو تفاصيل إضافية حول العميل..."
              className="w-full p-3 text-xs rounded-xl border border-[#292B2E] bg-[#202225] text-[#EDEDED] focus:border-[#C8A75A] focus:outline-hidden resize-none leading-relaxed"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#292B2E] bg-[#111111]">
          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                تم حفظ وتحديث بيانات العميل بنجاح!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225] rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-black bg-[#C8A75A] hover:bg-[#d8b76a] text-[#111111] rounded-xl shadow-xs hover:shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#111111]" />
              <span>حفظ واستكمال البيانات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
