import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Inspection, CompanyId } from "../../types";
import {
  Ruler,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  Eye,
  Phone,
} from "lucide-react";

export const InspectionsView: React.FC = () => {
  const {
    filteredInspections,
    customers,
    companies,
    activeCompanyId,
    addInspection,
    setSelectedCustomerIdFor360,
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || "");
  const [surveyor, setSurveyor] = useState("م. أحمد كمال (مهندس المعاينات)");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("14:00");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const getCompany = (compId: CompanyId) => companies.find((c) => c.id === compId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return;

    addInspection({
      companyId: cust.companyId,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      area: cust.area,
      surveyor,
      date,
      time,
      address: address || cust.area || "موقع العميل",
      result: "pending",
      notes: notes || "معاينة ورفع مقاسات فتحات UPVC",
      measurementsCount: 0,
    } as any);

    setShowAddModal(false);
    setNotes("");
    setAddress("");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-800">
              <Ruler className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              المعاينات ورفع المقاسات (Inspections)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            جدولة زيارات الفنيين والمهندسين لرفع مقاسات الفتحات الهندسية في الموقع
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>حجز موعد معاينة</span>
        </button>
      </div>

      {/* Grid of Inspections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInspections.map((insp) => {
          const comp = getCompany(insp.companyId);
          return (
            <div
              key={insp.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span 
    className="font-extrabold text-sm text-slate-900 block cursor-pointer hover:text-emerald-600 transition-colors"
    onClick={() => setSelectedCustomerIdFor360(insp.customerId)}
  >
    {insp.customerName}
  </span>
                    {comp && (
                      <span
                        className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded ${comp.badgeBg} ${comp.badgeText}`}
                      >
                        {comp.name}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      insp.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {insp.status === "completed" ? "تمت المعاينة" : "مجدولة"}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {insp.date} • {insp.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>الفني: {insp.surveyor}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{insp.address}</span>
                  </div>
                </div>

                {insp.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-xl italic">
                    "{insp.notes}"
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={`tel:${insp.customerPhone}`}
                  className="text-xs font-bold text-slate-700 flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span dir="ltr">{insp.customerPhone}</span>
                </a>

                <button
                  onClick={() => setSelectedCustomerIdFor360(insp.customerId)}
                  className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>ملف العميل</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">حجز موعد معاينة ورفع مقاسات</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">العميل *:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.area}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">الفني / المهندس المسؤول:</label>
                <input
                  type="text"
                  value={surveyor}
                  onChange={(e) => setSurveyor(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">تاريخ الزيارة:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">الوقت:</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">عنوان الموقع بالتفصيل:</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="رقم العقار، الشارع، علامة مميزة..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">ملاحظات وعدد الفتحات المتوقعة:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: شقة كاملة، 6 شبابيك وباب بلكونة، يفضل أخذ مقاسات دقيقة للشتر..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-slate-600 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  تأكيد الحجز
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
