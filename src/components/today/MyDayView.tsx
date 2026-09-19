import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { FollowUp } from "../../types";
import { SmartSalesCycleAuditModal } from "./SmartSalesCycleAuditModal";
import {
  CalendarDays,
  AlertCircle,
  Clock,
  Flame,
  FileSpreadsheet,
  CheckCircle2,
  Phone,
  MessageCircle,
  Calendar,
  Building2,
  MapPin,
  ArrowRight,
  Plus,
  Eye,
  Check,
  ChevronRight,
  Sparkles,
  Bell,
  CheckCheck,
  ArrowUpRight,
} from "lucide-react";

export const MyDayView: React.FC = () => {
  const {
    todayFollowUps,
    overdueFollowUps,
    hotCustomers,
    quotesNeedingFollowUp,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    completeFollowUp,
    rescheduleFollowUp,
    setSelectedCustomerIdFor360,
    setCurrentTab,
    companies,
    activeCompany,
    activeCompanyId,
    migrateLegacyData,
    contracts,
    quotations,
    opportunities,
    inquiries,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<
    "all" | "alerts" | "overdue" | "today" | "hot" | "quotes"
  >("all");

  const [isMigrating, setIsMigrating] = useState(false);
  const [showSmartSyncModal, setShowSmartSyncModal] = useState(false);

  // Auto-detect contracts that do not have linked quotations
  const contractsWithoutQuotes = useMemo(() => {
    return contracts.filter(
      (c) => !c.quotationId || !quotations.some((q) => q.id === c.quotationId)
    );
  }, [contracts, quotations]);

  // Auto-detect quotations that do not have linked opportunities
  const quotesWithoutOpps = useMemo(() => {
    return quotations.filter(
      (q) => !opportunities.some((o) => o.quotationId === q.id || (o.customerId === q.customerId && o.companyId === q.companyId))
    );
  }, [quotations, opportunities]);

  const hasUnlinkedData = contractsWithoutQuotes.length > 0 || quotesWithoutOpps.length > 0;

  const handleRunMigration = async () => {
    setIsMigrating(true);
    try {
      await migrateLegacyData();
    } catch (e) {
      console.error("Migration error:", e);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRescheduleDays = (id: string, days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    rescheduleFollowUp(id, d.toISOString().split("T")[0]);
  };

  const getCompany = (compId: string) => companies.find((c) => c.id === compId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <CalendarDays className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              اليوم — My Day
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            مركز التركيز اليومي: ماذا يجب أن أفعل الآن لإغلاق الصفقات وإدارة الأولويات؟
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSmartSyncModal(true)}
            className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300/60 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="تشخيص ومزامنة وتطبيق الدورة البيعية على كافة العملاء والبيانات"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>مزامنة دورة المبيعات الذكية</span>
          </button>
          <button
            onClick={() => setCurrentTab("intake")}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>تسجيل استفسار جديد</span>
          </button>
        </div>
      </div>

      {/* Migration Banner - Shows when unlinked contracts or quotations exist */}
      {hasUnlinkedData && (
        <div className="bg-gradient-to-r from-amber-50 via-emerald-50 to-teal-50 border border-emerald-300 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-emerald-950">
                  تطبيق الدورة البيعية وربط البيانات الحالية
                </h3>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                  بحاجة لمزامنة ({contractsWithoutQuotes.length + quotesWithoutOpps.length})
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-900 mt-1 leading-relaxed">
                يوجد بيانات تحتاج لربط مباشر:{" "}
                {contractsWithoutQuotes.length > 0 && (
                  <span className="font-semibold text-amber-900 ml-2">
                    {contractsWithoutQuotes.length} عقد مبيعات بدون عرض سعر،
                  </span>
                )}
                {quotesWithoutOpps.length > 0 && (
                  <span className="font-semibold text-emerald-900 ml-2">
                    {quotesWithoutOpps.length} عرض سعر غير مسجل كفرصة بيعية مفتوحة،
                  </span>
                )}
                اضغط لفتح محرك الفحص الذكي وتطبيق الربط الكامل وتوليد عروض الأسعار والفرص فوراً بدون فقدان أي بيانات.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSmartSyncModal(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shrink-0 transition-all cursor-pointer shadow-sm flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>فحص وتطبيق وربط البيانات الآن ✨</span>
          </button>
        </div>
      )}

      {/* KPI Cards: The What I Have Today Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Operational Alerts Card */}
        <div
          onClick={() => setActiveFilter("alerts")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "alerts"
              ? "bg-purple-50 border-purple-400 ring-2 ring-purple-300"
              : "bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" />
              تنبيهات التشغيل
            </span>
            {unreadNotificationsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-800 mt-2">
            {notifications.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {unreadNotificationsCount > 0
              ? `${unreadNotificationsCount} غير مقروء`
              : "محدّثة بالكامل"}
          </p>
        </div>

        {/* Overdue Card */}
        <div
          onClick={() => setActiveFilter("overdue")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "overdue"
              ? "bg-rose-50 border-rose-400 ring-2 ring-rose-300"
              : "bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              متابعات متأخرة
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-2">
            {overdueFollowUps.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">تتطلب اتصالاً فوريًا الآن</p>
        </div>

        {/* Today's Follow-ups */}
        <div
          onClick={() => setActiveFilter("today")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "today"
              ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300"
              : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              متابعات اليوم
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-800 mt-2">
            {todayFollowUps.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">مجدولة لليوم</p>
        </div>

        {/* Hot Customers */}
        <div
          onClick={() => setActiveFilter("hot")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "hot"
              ? "bg-orange-50 border-orange-400 ring-2 ring-orange-300"
              : "bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              عملاء Hot
            </span>
            <span className="text-xs">🔥</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-orange-700 mt-2">
            {hotCustomers.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">جاهزون للشراء والتعاقد</p>
        </div>

        {/* Pending Quotes */}
        <div
          onClick={() => setActiveFilter("quotes")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "quotes"
              ? "bg-blue-50 border-blue-400 ring-2 ring-blue-300"
              : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              عروض للمتابعة
            </span>
            <span className="text-xs">💰</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-800 mt-2">
            {quotesNeedingFollowUp.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">عروض أسعار معلقة</p>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
            activeFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          الكل ({notifications.length + overdueFollowUps.length + todayFollowUps.length})
        </button>
        <button
          onClick={() => setActiveFilter("alerts")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeFilter === "alerts"
              ? "bg-purple-600 text-white"
              : "bg-purple-50 text-purple-800 hover:bg-purple-100"
          }`}
        >
          ⚡ تنبيهات التشغيل ({notifications.length})
        </button>
        <button
          onClick={() => setActiveFilter("overdue")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeFilter === "overdue"
              ? "bg-rose-600 text-white"
              : "bg-rose-50 text-rose-700 hover:bg-rose-100"
          }`}
        >
          🔴 المتأخرة ({overdueFollowUps.length})
        </button>
        <button
          onClick={() => setActiveFilter("today")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeFilter === "today"
              ? "bg-amber-600 text-white"
              : "bg-amber-50 text-amber-800 hover:bg-amber-100"
          }`}
        >
          🟡 اليوم ({todayFollowUps.length})
        </button>
        <button
          onClick={() => setActiveFilter("hot")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeFilter === "hot"
              ? "bg-orange-600 text-white"
              : "bg-orange-50 text-orange-800 hover:bg-orange-100"
          }`}
        >
          🔥 عملاء Hot ({hotCustomers.length})
        </button>
        <button
          onClick={() => setActiveFilter("quotes")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeFilter === "quotes"
              ? "bg-blue-600 text-white"
              : "bg-blue-50 text-blue-800 hover:bg-blue-100"
          }`}
        >
          📄 عروض الأسعار ({quotesNeedingFollowUp.length})
        </button>
      </div>

      {/* SECTION 0: Operational Real-Time Notifications */}
      {(activeFilter === "all" || activeFilter === "alerts") && notifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-purple-900 font-extrabold text-sm">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-600" />
              <span>مركز التنبيهات التشغيلية الذكية ({notifications.length})</span>
            </div>
            {unreadNotificationsCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 px-2.5 py-1 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {notifications.map((n) => {
              const comp = getCompany(n.companyId);
              const isRead = !!n.readAt;
              const severityStyles =
                n.severity === "high"
                  ? "border-rose-200 bg-rose-50/40 text-rose-950"
                  : n.severity === "medium"
                  ? "border-amber-200 bg-amber-50/40 text-amber-950"
                  : "border-purple-200 bg-purple-50/30 text-purple-950";

              return (
                <div
                  key={n.id}
                  className={`rounded-2xl border p-4 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${severityStyles} ${
                    isRead ? "opacity-75 bg-white" : ""
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          n.severity === "high"
                            ? "bg-rose-100 text-rose-800"
                            : n.severity === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {n.title}
                      </span>
                      {comp && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${comp.badgeBg} ${comp.badgeText}`}
                        >
                          {comp.name}
                        </span>
                      )}
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      {n.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {n.customerId && (
                      <button
                        onClick={() => setSelectedCustomerIdFor360(n.customerId!)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#C8A75A]" />
                        <span>فتح العميل 360</span>
                      </button>
                    )}
                    {!isRead ? (
                      <button
                        onClick={() => markNotificationAsRead(n.id)}
                        title="تحديد كمقروء"
                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold px-2">تم الاطلاع</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 1: Overdue Follow-ups (Alerts) */}
      {(activeFilter === "all" || activeFilter === "overdue") && overdueFollowUps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>متابعات متأخرة لم يتم التواصل بها (عاجل)</span>
          </div>

          <div className="space-y-2.5">
            {overdueFollowUps.map((f) => {
              const comp = getCompany(f.companyId);
              return (
                <div
                  key={f.id}
                  className="bg-white rounded-2xl border border-rose-200 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                        متأخرة منذ {f.dueDate}
                      </span>
                      {comp && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${comp.badgeBg} ${comp.badgeText}`}
                        >
                          {comp.name}
                        </span>
                      )}
                      <span 
    className="font-extrabold text-sm text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
    onClick={(e) => {
      e.stopPropagation();
      setSelectedCustomerIdFor360(f.customerId);
    }}
  >
    {f.customerName}
  </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800">{f.title}</p>
                    {f.notes && <p className="text-xs text-slate-500 italic">"{f.notes}"</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Call */}
                    <a
                      href={`tel:${f.customerPhone}`}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-emerald-200"
                      title="اتصال هاتف"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">اتصال</span>
                    </a>

                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/2${f.customerPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                      title="مراسلة واتساب"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">واتساب</span>
                    </a>

                    {/* Reschedule +1 Day */}
                    <button
                      onClick={() => handleRescheduleDays(f.id, 1)}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                      title="تأجيل لغد"
                    >
                      +1 يوم
                    </button>

                    {/* View 360 */}
                    <button
                      onClick={() => setSelectedCustomerIdFor360(f.customerId)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-medium cursor-pointer"
                      title="عرض ملف العميل"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Done */}
                    <button
                      onClick={() => completeFollowUp(f.id)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      title="تم التواصل بنجاح"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تمت</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Today's Scheduled Follow-ups */}
      {(activeFilter === "all" || activeFilter === "today") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>جدول متابعات اليوم المحددة</span>
            </div>
            <span className="text-xs text-slate-400">{todayFollowUps.length} مهمة</span>
          </div>

          {todayFollowUps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-700">لا توجد متابعات متبقية لليوم!</p>
              <p className="text-xs">رائع، لقد أنجزت جميع المتابعات المجدولة لليوم بنجاح.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayFollowUps.map((f) => {
                const comp = getCompany(f.companyId);
                return (
                  <div
                    key={f.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-amber-300 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {f.time && (
                          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {f.time}
                          </span>
                        )}
                        {comp && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${comp.badgeBg} ${comp.badgeText}`}
                          >
                            {comp.name}
                          </span>
                        )}
                        <span 
    className="font-extrabold text-sm text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
    onClick={(e) => {
      e.stopPropagation();
      setSelectedCustomerIdFor360(f.customerId);
    }}
  >
    {f.customerName}
  </span>
                      </div>

                      <p className="text-xs font-bold text-slate-800">{f.title}</p>
                      {f.notes && <p className="text-xs text-slate-500 italic">"{f.notes}"</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <a
                        href={`tel:${f.customerPhone}`}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-emerald-200"
                        title="اتصال هاتف"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">اتصال</span>
                      </a>

                      <a
                        href={`https://wa.me/2${f.customerPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                        title="مراسلة واتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">واتساب</span>
                      </a>

                      <button
                        onClick={() => handleRescheduleDays(f.id, 1)}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                        title="تأجيل لغد"
                      >
                        +1 يوم
                      </button>

                      <button
                        onClick={() => setSelectedCustomerIdFor360(f.customerId)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-medium cursor-pointer"
                        title="عرض ملف العميل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => completeFollowUp(f.id)}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تمت</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Hot Leads Requiring Touch */}
      {(activeFilter === "all" || activeFilter === "hot") && hotCustomers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-700 font-extrabold text-sm">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>عملاء Hot أولوية قصوى (فرص إغلاق سريعة)</span>
            </div>
            <span className="text-xs text-slate-500">
              {hotCustomers.length} عملاء
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hotCustomers.map((cust) => {
              const comp = getCompany(cust.companyId);
              return (
                <div
                  key={cust.id}
                  className="bg-white rounded-2xl border border-orange-200 p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold text-slate-900">{cust.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-800 font-bold rounded">
                          🔥 Hot
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{cust.area}</span>
                        {comp && <span>• {comp.name}</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedCustomerIdFor360(cust.id)}
                      className="px-2.5 py-1 text-xs font-bold bg-slate-900 text-white rounded-lg flex items-center gap-1 hover:bg-slate-800 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Customer 360
                    </button>
                  </div>

                  {cust.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-2">
                      {cust.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-100">
                    <span className="text-slate-500">
                      المرحلة: <strong className="text-slate-800">{cust.stage}</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${cust.phone}`}
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-emerald-200"
                      >
                        <Phone className="w-3 h-3" />
                        اتصال
                      </a>
                      <a
                        href={`https://wa.me/2${cust.phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        واتساب
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: Quotations Needing Follow-up */}
      {(activeFilter === "all" || activeFilter === "quotes") && quotesNeedingFollowUp.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800 font-extrabold text-sm">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>عروض أسعار أُرسلت للعملاء وتحتاج متابعة قرار</span>
            </div>
            <span className="text-xs text-slate-500">
              {quotesNeedingFollowUp.length} عرض
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quotesNeedingFollowUp.map((q) => {
              const comp = getCompany(q.companyId);
              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-blue-200 p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {q.quoteNumber}
                        </span>
                        <span 
    className="font-extrabold text-sm text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
    onClick={(e) => {
      e.stopPropagation();
      setSelectedCustomerIdFor360(q.customerId);
    }}
  >
    {q.customerName}
  </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {comp?.name} • ينتهي في: {q.expiryDate}
                      </div>
                    </div>

                    <div className="text-left font-black text-sm text-slate-900">
                      {(q.totalAmount || 0).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">ج.م</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600">
                    عدد البنود: <strong>{q.items.length}</strong> (تشمل قطاعات UPVC وزجاج دبل)
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedCustomerIdFor360(q.customerId)}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      عرض ملف العميل
                    </button>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${q.customerPhone}`}
                        className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        متابعة
                      </a>
                      <a
                        href={`https://wa.me/2${q.customerPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        واتساب
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Smart Sales Cycle Audit & Synchronization Modal */}
      <SmartSalesCycleAuditModal
        isOpen={showSmartSyncModal}
        onClose={() => setShowSmartSyncModal(false)}
      />
    </div>
  );
};
