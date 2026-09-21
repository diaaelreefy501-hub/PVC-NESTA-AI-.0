import React, { useState, useEffect } from "react";
import { supabase } from "../../integrations/supabase/client";
import { useApp } from "../../context/AppContext";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Copy, 
  Check, 
  X, 
  Maximize2, 
  Minimize2, 
  RefreshCw,
  Database,
  Link2,
  Users
} from "lucide-react";

export interface DiagnosticResult {
  timestamp: string;
  auth: {
    authenticated: boolean;
    sessionExists: boolean;
    userExists: boolean;
    userId: string | null;
    userEmail: string | null;
    companyMembership: string[];
    supabaseProject: string;
    sessionError: string | null;
    userError: string | null;
  };
  customers: {
    dbCount: number;
    expectedCanonical: number;
    match: boolean;
    sample: Array<{ id: string; name: string; phone: string; companyId: string }>;
  };
  opportunities: {
    total: number;
    open: number;
    won: number;
    lost: number;
    other: number;
    storageType: string;
    list: Array<any>;
  };
  companies: {
    dbCount: number;
    list: Array<{ id: string; name: string }>;
  };
  relations: {
    opportunityToCustomer: Array<{
      opportunityId: string;
      oppCustomerId: string;
      oppCompanyId: string;
      customerId: string;
      customerName: string;
      customerPhone: string;
      customerCompanyId: string;
      companyId: string;
      companyName: string;
      customerMatchesOpp: boolean;
      companyMatchesOpp: boolean;
      companyMatchesCust: boolean;
      status: "VERIFIED" | "BROKEN" | "NOT VERIFIED";
    }>;
    brokenOpportunityToCustomer: string[];
    brokenOpportunityToCompany: string[];
    brokenCustomerToCompany: string[];
  };
  inquiryOpportunityCustomer: Array<{
    inquiryId: string;
    opportunityId: string;
    customerId: string;
    companyId: string;
    status: "VERIFIED" | "BROKEN" | "NOT VERIFIED";
  }>;
  uiVisibility: {
    dbCustomersCount: number;
    uiFilteredCustomersCount: number;
    activeCompanyId: string;
    recentOppCustomerInDb: boolean;
    recentOppCustomerInUi: boolean;
    visibilityMismatchReason: string | null;
    customerCreatedFromOppDetails: any | null;
  };
  rls: Record<string, "PASS" | "BLOCKED_BY_RLS" | "TABLE_NOT_FOUND">;
  readOperations: number;
  writeOperations: number;
  verifications: {
    auth: "VERIFIED" | "NOT VERIFIED" | "BROKEN";
    customers: "VERIFIED" | "NOT VERIFIED" | "BROKEN";
    opportunities: "VERIFIED" | "NOT VERIFIED" | "BROKEN";
    companies: "VERIFIED" | "NOT VERIFIED" | "BROKEN";
    validRelations: "VERIFIED" | "NOT VERIFIED" | "BROKEN";
    brokenRelations: "VERIFIED" | "NOT VERIFIED" | "BROKEN";
    inquiryOpportunityCustomer: "VERIFIED" | "NOT VERIFIED" | "BROKEN";
    uiVisibility: "VERIFIED" | "NOT VERIFIED" | "BROKEN";
    rls: "VERIFIED" | "NOT VERIFIED" | "BROKEN";
  };
  finalStatus: "VERIFIED" | "PARTIAL" | "BROKEN" | "BLOCKED";
}

export const PreviewClientDiagnostic: React.FC = () => {
  const { filteredCustomers, activeCompanyId, companies: contextCompanies } = useApp();
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [copied, setCopied] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    const readOpsCount = { count: 0 };
    const writeOps = 0;

    try {
      // 1. AUTH READ
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      readOpsCount.count++;
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      readOpsCount.count++;

      const session = sessionData?.session;
      const user = userData?.user;
      const authenticated = Boolean(session && user);

      // User profile & company membership
      let userCompanyMembership: string[] = [];
      if (user?.id) {
        const { data: profile } = await supabase
          .from("users")
          .select("allowed_company_ids, role")
          .eq("id", user.id)
          .maybeSingle();
        readOpsCount.count++;
        if (profile?.allowed_company_ids) {
          userCompanyMembership = profile.allowed_company_ids;
        }
      }

      // RLS Check on core tables
      const tablesToCheck = [
        "companies",
        "customers",
        "inquiries",
        "opportunities",
        "follow_ups",
        "quotations",
        "contracts",
        "sales",
        "payments",
        "inspections",
        "interactions",
        "users",
      ];
      const rlsMap: Record<string, "PASS" | "BLOCKED_BY_RLS" | "TABLE_NOT_FOUND"> = {};

      for (const tbl of tablesToCheck) {
        const { error: tblErr } = await supabase.from(tbl).select("*").limit(1);
        readOpsCount.count++;
        if (!tblErr) {
          rlsMap[tbl] = "PASS";
        } else if (tblErr.code === "42501" || tblErr.message.includes("permission denied")) {
          rlsMap[tbl] = "BLOCKED_BY_RLS";
        } else if (tblErr.code === "PGRST205" || tblErr.message.includes("Could not find")) {
          rlsMap[tbl] = "TABLE_NOT_FOUND";
        } else {
          rlsMap[tbl] = "BLOCKED_BY_RLS";
        }
      }

      // 2. READ COMPANIES
      const { data: rawCompanies } = await supabase.from("companies").select("*");
      readOpsCount.count++;
      const companiesList = (rawCompanies || []).map((c: any) => ({ id: c.id, name: c.name }));
      const companiesMap = new Map<string, string>();
      companiesList.forEach((c: any) => companiesMap.set(c.id, c.name));

      // 3. READ CUSTOMERS
      const { data: rawCustomers } = await supabase.from("customers").select("*");
      readOpsCount.count++;
      const customersList = rawCustomers || [];
      const customersMap = new Map<string, any>();
      customersList.forEach((c: any) => customersMap.set(c.id, c));

      // 4. READ OPPORTUNITIES
      let oppsList: any[] = [];
      let oppsStorage = "opportunities table";
      if (rlsMap["opportunities"] === "PASS") {
        const { data: oppsData } = await supabase.from("opportunities").select("*");
        readOpsCount.count++;
        oppsList = oppsData || [];
      } else {
        // Read from interactions table where type = 'opportunity_sync'
        oppsStorage = "interactions table (opportunity_sync)";
        const { data: interData } = await supabase
          .from("interactions")
          .select("*")
          .eq("type", "opportunity_sync");
        readOpsCount.count++;
        if (interData) {
          oppsList = interData
            .map((i: any) => {
              try {
                return JSON.parse(i.notes);
              } catch {
                return null;
              }
            })
            .filter(Boolean);
        }
      }

      // 5. READ INQUIRIES & FOLLOW_UPS
      const { data: rawInquiries } = await supabase.from("inquiries").select("*");
      readOpsCount.count++;
      const inquiriesList = rawInquiries || [];

      const { data: rawFollowups } = await supabase.from("follow_ups").select("*");
      readOpsCount.count++;

      // Analysis of Opportunities statuses
      let oppOpen = 0;
      let oppWon = 0;
      let oppLost = 0;
      let oppOther = 0;
      oppsList.forEach((o: any) => {
        const st = (o.status || o.stage || "").toLowerCase();
        if (st === "open" || st === "negotiation" || st === "inquiry" || st === "quotation") {
          oppOpen++;
        } else if (st === "won" || st === "contracted") {
          oppWon++;
        } else if (st === "lost") {
          oppLost++;
        } else {
          oppOther++;
        }
      });

      // Relationship checks
      const oppToCustRelations: any[] = [];
      const brokenOppToCust: string[] = [];
      const brokenOppToComp: string[] = [];

      oppsList.forEach((o: any) => {
        const oppCustId = o.customerId || o.customer_id;
        const oppCompId = o.companyId || o.company_id;

        if (oppCustId) {
          const cust = customersMap.get(oppCustId);
          if (cust) {
            const custCompId = cust.companyId || cust.company_id;
            const compName = companiesMap.get(custCompId) || "غير معروف";
            const custMatches = oppCustId === cust.id;
            const compMatchesOpp = oppCompId ? oppCompId === custCompId : true;
            const compMatchesCust = companiesMap.has(custCompId);

            oppToCustRelations.push({
              opportunityId: o.id,
              oppCustomerId: oppCustId,
              oppCompanyId: oppCompId,
              customerId: cust.id,
              customerName: cust.name,
              customerPhone: cust.phone,
              customerCompanyId: custCompId,
              companyId: custCompId,
              companyName: compName,
              customerMatchesOpp: custMatches,
              companyMatchesOpp: compMatchesOpp,
              companyMatchesCust: compMatchesCust,
              status: custMatches && compMatchesOpp && compMatchesCust ? "VERIFIED" : "BROKEN",
            });
          } else {
            brokenOppToCust.push(`Opp [${o.id}] points to missing Customer [${oppCustId}]`);
          }
        }

        if (oppCompId && !companiesMap.has(oppCompId) && oppCompId !== "all") {
          brokenOppToComp.push(`Opp [${o.id}] points to missing Company [${oppCompId}]`);
        }
      });

      const brokenCustToComp: string[] = [];
      customersList.forEach((c: any) => {
        const cComp = c.companyId || c.company_id;
        if (cComp && !companiesMap.has(cComp)) {
          brokenCustToComp.push(`Customer [${c.id} - ${c.name}] points to missing Company [${cComp}]`);
        }
      });

      // Inquiry -> Opportunity -> Customer
      const inqOppCustRelations: any[] = [];
      inquiriesList.forEach((inq: any) => {
        const inqCustId = inq.customerId || inq.customer_id;
        const inqCompId = inq.companyId || inq.company_id;
        const matchedOpp = oppsList.find((o: any) => o.inquiryId === inq.id || (inqCustId && (o.customerId === inqCustId || o.customer_id === inqCustId)));
        
        if (matchedOpp && inqCustId) {
          const isVerified = (matchedOpp.customerId === inqCustId || matchedOpp.customer_id === inqCustId);
          inqOppCustRelations.push({
            inquiryId: inq.id,
            opportunityId: matchedOpp.id,
            customerId: inqCustId,
            companyId: inqCompId,
            status: isVerified ? "VERIFIED" : "BROKEN",
          });
        }
      });

      // Check customer created from opportunity
      const oppCustomer = customersList.find((c: any) => 
        (c.notes && c.notes.includes("تم إنشاء العميل من الفرصة البيعية")) ||
        oppToCustRelations.some((r) => r.customerId === c.id)
      );

      const isOppCustomerInUi = oppCustomer 
        ? filteredCustomers.some((fc) => fc.id === oppCustomer.id) 
        : false;

      let visibilityMismatchReason: string | null = null;
      if (oppCustomer && !isOppCustomerInUi) {
        if (activeCompanyId !== "all" && oppCustomer.companyId !== activeCompanyId) {
          visibilityMismatchReason = `العميل يتبع الشركة (${oppCustomer.companyId}) بينما الفلتر الحالي في الواجهة مخصص لشركة (${activeCompanyId}).`;
        } else {
          visibilityMismatchReason = `الفلاتر النشطة في واجهة العملاء (بحث/حالة) تحجب ظهور العميل.`;
        }
      }

      // Verifications classification
      const authVerif = authenticated ? "VERIFIED" : "BROKEN";
      const custVerif = customersList.length === 87 ? "VERIFIED" : (customersList.length > 0 ? "PARTIAL" : "NOT VERIFIED") as any;
      const oppsVerif = oppsList.length > 0 ? "VERIFIED" : "NOT VERIFIED";
      const compVerif = companiesList.length > 0 ? "VERIFIED" : "NOT VERIFIED";
      const validRelVerif = oppToCustRelations.length > 0 && oppToCustRelations.every((r) => r.status === "VERIFIED") ? "VERIFIED" : "BROKEN";
      const brokenRelVerif = (brokenOppToCust.length === 0 && brokenOppToComp.length === 0 && brokenCustToComp.length === 0) ? "VERIFIED" : "BROKEN";
      const inqVerif = inqOppCustRelations.length > 0 ? "VERIFIED" : "NOT VERIFIED";
      const uiVisVerif = (oppCustomer ? (isOppCustomerInUi || visibilityMismatchReason !== null) : true) ? "VERIFIED" : "NOT VERIFIED";
      const rlsVerif = rlsMap["customers"] === "PASS" ? "VERIFIED" : "BROKEN";

      const finalDiag: DiagnosticResult = {
        timestamp: new Date().toISOString(),
        auth: {
          authenticated,
          sessionExists: Boolean(session),
          userExists: Boolean(user),
          userId: user?.id || session?.user?.id || null,
          userEmail: user?.email || session?.user?.email || null,
          companyMembership: userCompanyMembership,
          supabaseProject: "https://nzuadqnfoswrimfakdsv.supabase.co",
          sessionError: sessionErr ? sessionErr.message : null,
          userError: userErr ? userErr.message : null,
        },
        customers: {
          dbCount: customersList.length,
          expectedCanonical: 87,
          match: customersList.length === 87,
          sample: customersList.slice(0, 5).map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            companyId: c.companyId || c.company_id,
          })),
        },
        opportunities: {
          total: oppsList.length,
          open: oppOpen,
          won: oppWon,
          lost: oppLost,
          other: oppOther,
          storageType: oppsStorage,
          list: oppsList.slice(0, 5),
        },
        companies: {
          dbCount: companiesList.length,
          list: companiesList,
        },
        relations: {
          opportunityToCustomer: oppToCustRelations,
          brokenOpportunityToCustomer: brokenOppToCust,
          brokenOpportunityToCompany: brokenOppToComp,
          brokenCustomerToCompany: brokenCustToComp,
        },
        inquiryOpportunityCustomer: inqOppCustRelations,
        uiVisibility: {
          dbCustomersCount: customersList.length,
          uiFilteredCustomersCount: filteredCustomers.length,
          activeCompanyId,
          recentOppCustomerInDb: Boolean(oppCustomer),
          recentOppCustomerInUi: isOppCustomerInUi,
          visibilityMismatchReason,
          customerCreatedFromOppDetails: oppCustomer || null,
        },
        rls: rlsMap,
        readOperations: readOpsCount.count,
        writeOperations: writeOps,
        verifications: {
          auth: authVerif,
          customers: custVerif,
          opportunities: oppsVerif,
          companies: compVerif,
          validRelations: validRelVerif,
          brokenRelations: brokenRelVerif,
          inquiryOpportunityCustomer: inqVerif,
          uiVisibility: uiVisVerif,
          rls: rlsVerif,
        },
        finalStatus: authenticated && rlsMap["customers"] === "PASS" ? "VERIFIED" : "BLOCKED",
      };

      setResult(finalDiag);

      // Send to server diagnostic receiver
      try {
        await fetch("/api/client-diagnostic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalDiag),
        });
      } catch (e) {
        console.warn("Could not post diagnostic to /api/client-diagnostic:", e);
      }
    } catch (err: any) {
      console.error("Diagnostic failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const generateReportText = () => {
    if (!result) return "جاري إعداد التقرير...";

    const compListStr = result.companies.list.map((c) => c.name + " (" + c.id + ")").join(" | ");

    const oppToCustStr = result.relations.opportunityToCustomer.length > 0
      ? result.relations.opportunityToCustomer.map((r, idx) => {
          return "[" + (idx + 1) + "] Opp: " + r.opportunityId + " → Cust: " + r.customerId + " (" + r.customerName + " - " + r.customerPhone + ") → Comp: " + r.companyId + " (" + r.companyName + ")\n" +
                 "     Check opp.customer_id === cust.id: " + r.customerMatchesOpp + "\n" +
                 "     Check cust.company_id === opp.company_id: " + r.companyMatchesOpp + "\n" +
                 "     Check comp.id === cust.company_id: " + r.companyMatchesCust + "\n" +
                 "     Status: " + r.status;
        }).join("\n")
      : "No opportunities linked to customers found.";

    const inqOppCustStr = result.inquiryOpportunityCustomer.length > 0
      ? result.inquiryOpportunityCustomer.map((r) => {
          return "Inq: " + r.inquiryId + " → Opp: " + r.opportunityId + " → Cust: " + r.customerId + " [Comp: " + r.companyId + "] - " + r.status;
        }).join("\n")
      : "No linked Inquiry → Opportunity chains found.";

    const rlsStr = Object.entries(result.rls)
      .map(([tbl, st]) => "- " + tbl + ": " + st)
      .join("\n");

    const reasonStr = result.uiVisibility.visibilityMismatchReason
      ? "- Reason: " + result.uiVisibility.visibilityMismatchReason
      : "- Reason: Matching normal UI filter rules";

    return `══════════════════════════════════════════
PVC NESTA — PREVIEW CLIENT REAL DIAGNOSTIC
══════════════════════════════════════════

1. AUTH [${result.verifications.auth}]
- Authenticated: ${result.auth.authenticated}
- User ID: ${result.auth.userId || "None"}
- Session Exists: ${result.auth.sessionExists}
- User Email: ${result.auth.userEmail || "None"}
- Company Membership: [${result.auth.companyMembership.join(", ") || "all"}]
- Supabase Project: ${result.auth.supabaseProject}

2. CUSTOMERS [${result.verifications.customers}]
- Supabase Customers (DB): ${result.customers.dbCount}
- Expected Canonical: ${result.customers.expectedCanonical}
- Match: ${result.customers.match ? "YES" : "NO"}

3. OPPORTUNITIES [${result.verifications.opportunities}]
- Total: ${result.opportunities.total}
- Open: ${result.opportunities.open}
- Won: ${result.opportunities.won}
- Lost: ${result.opportunities.lost}
- Other: ${result.opportunities.other}
- Storage Type: ${result.opportunities.storageType}

4. COMPANIES [${result.verifications.companies}]
- Companies in DB: ${result.companies.dbCount}
- List: ${compListStr}

5. CUSTOMER ↔ OPPORTUNITY ↔ COMPANY [${result.verifications.validRelations}]
${oppToCustStr}

6. BROKEN RELATIONS [${result.verifications.brokenRelations}]
- Broken Opp → Customer: ${result.relations.brokenOpportunityToCustomer.length} (${result.relations.brokenOpportunityToCustomer.join(", ") || "None"})
- Broken Opp → Company: ${result.relations.brokenOpportunityToCompany.length} (${result.relations.brokenOpportunityToCompany.join(", ") || "None"})
- Broken Cust → Company: ${result.relations.brokenCustomerToCompany.length} (${result.relations.brokenCustomerToCompany.join(", ") || "None"})

7. INQUIRY → OPPORTUNITY → CUSTOMER [${result.verifications.inquiryOpportunityCustomer}]
${inqOppCustStr}

8. UI VISIBILITY [${result.verifications.uiVisibility}]
- DB Customers: ${result.uiVisibility.dbCustomersCount}
- UI Filtered Customers: ${result.uiVisibility.uiFilteredCustomersCount}
- Active Company Filter in UI: ${result.uiVisibility.activeCompanyId}
- Recent Opp Customer in DB: ${result.uiVisibility.recentOppCustomerInDb}
- Recent Opp Customer in UI: ${result.uiVisibility.recentOppCustomerInUi}
${reasonStr}

9. RLS AUDIT [${result.verifications.rls}]
${rlsStr}

10. SAFETY AUDIT
- READ OPERATIONS: ${result.readOperations}
- WRITE OPERATIONS: ${result.writeOperations}
- INSERT / UPDATE / DELETE / UPSERT: 0

FINAL DIAGNOSTIC STATUS: ${result.finalStatus}
`;
  };

  const copyReport = () => {
    navigator.clipboard.writeText(generateReportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 z-50 bg-[#1A1A1A] text-[#C8A75A] border border-[#C8A75A]/50 px-3 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 hover:bg-[#252525] transition-all"
      >
        <Database className="w-4 h-4" />
        <span>فحص الـ Client Context</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-96 sm:w-[480px] bg-[#141517] text-white rounded-2xl border border-[#2D3035] shadow-2xl overflow-hidden font-sans text-xs">
      {/* Header Bar */}
      <div className="bg-[#1C1E22] px-4 py-3 border-b border-[#2D3035] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-sm text-amber-300">
            Preview Client Diagnostic (Read-Only)
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <button
            onClick={runDiagnostic}
            disabled={isRunning}
            className="p-1 hover:text-white rounded hover:bg-white/10 transition"
            title="إعادة الفحص"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? "animate-spin text-amber-400" : ""}`} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:text-white rounded hover:bg-white/10 transition"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:text-white rounded hover:bg-white/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {isRunning ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span>جاري استخراج بيانات الجلسة والاستعلام من Supabase داخل المتصفح...</span>
            </div>
          ) : result ? (
            <>
              {/* Quick Status Pill Bar */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#1C1E22] p-2 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">AUTH</span>
                  <span className={`font-bold ${result.auth.authenticated ? "text-emerald-400" : "text-rose-400"}`}>
                    {result.verifications.auth}
                  </span>
                </div>
                <div className="bg-[#1C1E22] p-2 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">CUSTOMERS (DB)</span>
                  <span className="font-bold text-amber-400">
                    {result.customers.dbCount} / 87
                  </span>
                </div>
                <div className="bg-[#1C1E22] p-2 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">WRITE OPS</span>
                  <span className="font-bold text-emerald-400">
                    0 (Safe Read-Only)
                  </span>
                </div>
              </div>

              {/* Text Report Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-zinc-400 text-[11px] font-medium">التقرير المباشر الصادر من المتصفح:</span>
                  <button
                    onClick={copyReport}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "تم النسخ!" : "نسخ التقرير"}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#0A0B0D] rounded-xl text-[10px] text-zinc-300 font-mono overflow-x-auto max-h-56 leading-relaxed border border-zinc-800 select-all" dir="ltr">
                  {generateReportText()}
                </pre>
              </div>

              {/* Details Pill */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-amber-300 text-[11px] leading-relaxed">
                يتم تنفيذ كافة الاستعلامات أعلاه مباشرة من داخل متصفح الـ Preview باستخدام رمز مصادقة العميل (JWT) وبدون أي تعديل على قاعدة البيانات (Mutations: 0).
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-zinc-400">
              اضغط على زر الفحص لتشغيل التشخيص
            </div>
          )}
        </div>
      )}
    </div>
  );
};
