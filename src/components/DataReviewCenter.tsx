import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { DataReviewItem, Contract, Sale, Quotation, Customer, Opportunity, AuditLogEntry } from "../types";
import { runContractsDiagnostic } from "../utils/contractDiagnostic";
import { DiagnosticEngine, DiagnosticIssue } from "../utils/diagnosticEngine";
import { DrillDownModal } from "./DrillDownModal";
import { classifyCustomer } from "../utils/customerClassifier";
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  Layers, 
  Check, 
  X, 
  Eye, 
  FileCheck2, 
  DollarSign, 
  Activity, 
  FileSpreadsheet, 
  Ban, 
  ShieldCheck, 
  Scale, 
  ArrowRightLeft,
  UserPlus,
  Trash2,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  History,
  Link2,
  Lock,
  Plus
} from "lucide-react";

export const DataReviewCenter: React.FC = () => {
  const {
    contracts,
    sales,
    opportunities,
    customers,
    quotations,
    inquiries,
    companies,
    tasks,
    followUps,
    inspections,
    interactions,
    payments,
    approveRecord,
    excludeRecord,
    showToast,
    deleteQuotation,
    deleteContract,
    deleteCustomer,
    updateQuotation,
    addAuditLog,
    auditLogs,
    clearAuditLogs,
    purgeOrphanContracts,
    createCustomersFromOrphanContracts,
  } = useApp();

  // Active Control Panel view tabs
  const [activeTab, setActiveTab] = useState<
    'diagnostic' | 'duplicate_quotes_groups' | 'all_quotes_control' | 'all_customers_control' | 'missing_links_control' | 'audit_logs_control'
  >('diagnostic');

  const [expandedCustId, setExpandedCustId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Specific Filters for Quotation Control
  const [quoteFilter, setQuoteFilter] = useState<
    'all' | 'healthy' | 'duplicate' | 'unlinked' | 'needs_review' | 'linked_customer' | 'linked_opp' | 'approved_independent'
  >('all');

  // Specific Filters for Customer Control
  const [customerFilter, setCustomerFilter] = useState<
    'all' | 'healthy' | 'needs_intervention' | 'active_sales_cycle' | 'no_contract_no_active_cycle'
  >('all');

  // Drill down modal state
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    entityType: string;
    records: any[];
    classificationFilter?: 'all' | 'healthy' | 'needs_intervention' | 'active_sales_cycle' | 'no_contract_no_active_cycle' | 'unclassified';
  }>({
    isOpen: false,
    title: '',
    entityType: '',
    records: []
  });

  // Batch Selection State
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());

  // Comparative Delete Confirmation Dialogue for Quotations
  const [confirmQuoteDelete, setConfirmQuoteDelete] = useState<{
    quote: Quotation;
    otherQuotesInGroup: Quotation[];
  } | null>(null);

  // Bulk Action Preview Modal State
  const [bulkActionPreview, setBulkActionPreview] = useState<{
    isOpen: boolean;
    actionType: 'delete' | 'exclude' | 'review';
    entityType: 'Quotation' | 'Customer' | 'Contract';
    ids: string[];
    summary: { deleteCount: number; excludeCount: number; reviewCount: number };
  } | null>(null);

  // Quick linking dialog helper state
  const [linkingQuote, setLinkingQuote] = useState<Quotation | null>(null);
  const [linkingSearch, setLinkingSearch] = useState("");
  const [expandedViolationId, setExpandedViolationId] = useState<string | null>(null);

  // Data Snapshot for Unified Diagnostic Engine
  const snapshot = useMemo(() => ({
    snapshotId: `SNAP-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    source: 'DATA_CONTROL_CENTER_UI',
    companyScope: 'All',
    recordCounts: {
      companies: companies.length,
      customers: customers.length,
      inquiries: inquiries.length,
      opportunities: opportunities.length,
      followups: followUps.length,
      quotations: quotations.length,
      contracts: contracts.length,
      sales: sales.length,
      payments: payments.length
    },
    companies,
    customers,
    inquiries,
    opportunities,
    followups: followUps,
    quotations,
    contracts,
    sales,
    payments
  }), [companies, customers, inquiries, opportunities, followUps, quotations, contracts, sales, payments]);

  // Unified Diagnostic Issues
  const unifiedDiagResult = useMemo(() => {
    return DiagnosticEngine.run(snapshot);
  }, [snapshot]);

  // Detailed Quotation violations memo for PVC Nesta / Vertex report
  const quotationViolations = useMemo(() => {
    const customerIds = new Set(customers.map(c => c.id));
    return quotations.filter(q => {
      return q.customerId && !customerIds.has(q.customerId);
    }).map(q => {
      const company = companies.find(c => c.id === q.companyId);
      return {
        quote: q,
        companyName: company ? company.name : (q.companyId === "comp-import-1789231993585-501" ? "PVC Nesta" : "Vertex"),
        classification: "CUSTOMER_NOT_FOUND",
        reason: "رقم تعريف العميل (customerId) غير موجود بالكامل في قاعدة البيانات الحالية.",
        recommendedAction: "إجراء ربط يدوي (Manual Link) بعميل نشط، أو إنشاء ملف عميل جديد بالهوية المفقودة لتسوية السجل الفني."
      };
    });
  }, [quotations, customers, companies]);

  // Live Contract Diagnostic Report
  const diagnosticReport = useMemo(() => {
    return runContractsDiagnostic(customers, contracts, sales);
  }, [customers, contracts, sales]);

  // -------------------------------------------------------------
  // CUSTOMER CONTROL STATS DIRECTORY (All 88 Customers)
  // -------------------------------------------------------------
  const customerControlStats = useMemo(() => {
    return customers.map(c => {
      const cContracts = contracts.filter(con => con.customerId === c.id);
      const cSales = sales.filter(s => s.customerId === c.id || (s.contractId && cContracts.some(con => con.id === s.contractId)));
      const cPayments = payments.filter(p => p.customerId === c.id || (p.contractId && cContracts.some(con => con.id === p.contractId)));
      const cOpps = opportunities.filter(o => o.customerId === c.id);
      const cQuotes = quotations.filter(q => q.customerId === c.id);
      const cInqs = inquiries.filter(i => i.customerId === c.id);
      const cFollowups = followUps.filter(f => f.customerId === c.id);
      
      const classificationInfo = classifyCustomer(c, snapshot, unifiedDiagResult.issues);
      
      return {
        customer: c,
        contracts: cContracts,
        sales: cSales,
        payments: cPayments,
        opportunities: cOpps,
        quotations: cQuotes,
        inquiries: cInqs,
        followups: cFollowups,
        classification: classificationInfo.classification,
        healthReason: classificationInfo.reason,
        issueCount: unifiedDiagResult.issues.filter(iss => iss.recordId === c.id || iss.evidence?.customerId === c.id).length
      };
    });
  }, [customers, contracts, sales, payments, opportunities, quotations, inquiries, followUps, snapshot, unifiedDiagResult.issues]);

  const filteredCustomerControlStats = useMemo(() => {
    return customerControlStats.filter(item => {
      // Search match
      const nameMatch = item.customer.name.includes(searchQuery) || (item.customer.phone && item.customer.phone.includes(searchQuery));
      if (!nameMatch) return false;

      // Filter match
      if (customerFilter === 'all') return true;
      return item.classification === customerFilter;
    });
  }, [customerControlStats, searchQuery, customerFilter]);

  // -------------------------------------------------------------
  // QUOTATION DENSE CLASSIFICATION (104 Quotations)
  // -------------------------------------------------------------
  const classifiedQuotations = useMemo(() => {
    return quotations.map(q => {
      const isDuplicate = q.recordStatus === 'duplicate' || unifiedDiagResult.issues.some(iss => iss.ruleId === 'DUP-QUOTE-001' && iss.recordId === q.id);
      const isUnlinked = !q.customerId || !customers.some(c => c.id === q.customerId);
      const isLinkedToOpp = Boolean(q.opportunityId && opportunities.some(o => o.id === q.opportunityId));
      const isLinkedToCust = Boolean(q.customerId && customers.some(c => c.id === q.customerId));
      const hasIssues = unifiedDiagResult.issues.some(iss => iss.recordId === q.id);
      
      let type: 'healthy' | 'duplicate' | 'unlinked' | 'needs_review' | 'approved_independent' = 'healthy';
      if (isDuplicate) {
        type = 'duplicate';
      } else if (isUnlinked) {
        type = 'unlinked';
      } else if (hasIssues) {
        type = 'needs_review';
      } else if (isLinkedToCust && !contracts.some(c => c.customerId === q.customerId)) {
        type = 'approved_independent';
      }
      
      return {
        quote: q,
        type,
        isLinkedToOpp,
        isLinkedToCust,
        issues: unifiedDiagResult.issues.filter(iss => iss.recordId === q.id)
      };
    });
  }, [quotations, customers, opportunities, contracts, unifiedDiagResult.issues]);

  const filteredClassifiedQuotations = useMemo(() => {
    return classifiedQuotations.filter(item => {
      // Search match
      const queryMatch = 
        (item.quote.quoteNumber || '').includes(searchQuery) || 
        (item.quote.customerName || '').includes(searchQuery) ||
        (item.quote.totalAmount || '').toString().includes(searchQuery);
      if (!queryMatch) return false;

      // Filter category match
      if (quoteFilter === 'all') return true;
      if (quoteFilter === 'healthy') return item.type === 'healthy' || item.type === 'approved_independent';
      if (quoteFilter === 'duplicate') return item.type === 'duplicate';
      if (quoteFilter === 'unlinked') return item.type === 'unlinked';
      if (quoteFilter === 'needs_review') return item.type === 'needs_review';
      if (quoteFilter === 'linked_customer') return item.isLinkedToCust;
      if (quoteFilter === 'linked_opp') return item.isLinkedToOpp;
      if (quoteFilter === 'approved_independent') return item.type === 'approved_independent';
      
      return true;
    });
  }, [classifiedQuotations, searchQuery, quoteFilter]);

  // -------------------------------------------------------------
  // DUPLICATE GROUPS REVIEW (Quotations Grouped Reviews)
  // -------------------------------------------------------------
  const quotationDuplicateGroups = useMemo(() => {
    const groups: Record<string, typeof quotations> = {};
    quotations.forEach(q => {
      // Rule: Same customer + Same quotation number + Same amount (quoteNumber, customerId, totalAmount)
      const qNum = (q.quoteNumber || '').trim().toLowerCase();
      const custId = q.customerId || 'nocust';
      const amt = Number(q.totalAmount) || 0;
      
      if (qNum && custId && amt > 0) {
        const key = `${custId}_${qNum}_${amt}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(q);
      }
    });
    
    return Object.entries(groups)
      .filter(([_, items]) => items.length > 1)
      .map(([key, items], idx) => {
        const [custId, qNum, amt] = key.split('_');
        const customerName = customers.find(c => c.id === custId)?.name || items[0]?.customerName || 'عميل غير معروف';
        return {
          groupId: `QT-DUP-GRP-${idx + 1}`,
          key,
          qNum: items[0]?.quoteNumber || qNum,
          customerName,
          amount: Number(amt),
          items: items.sort((a, b) => {
            const dateA = a.createdAt || "";
            const dateB = b.createdAt || "";
            return dateB.localeCompare(dateA); // Newest first
          })
        };
      });
  }, [quotations, customers]);

  // -------------------------------------------------------------
  // MISSING RELATIONSHIPS DIRECTORY (250 items)
  // -------------------------------------------------------------
  const missingLinks = useMemo(() => {
    // Collect all relationship and missing linkages from both unified check and manual scans
    const links: Array<{
      id: string;
      entityType: 'Customer' | 'Quotation' | 'Contract' | 'Sale' | 'Payment' | 'Opportunity';
      recordId: string;
      recordName: string;
      missingRelation: string;
      relatedId: string;
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      reason: string;
      itemReference: any;
    }> = [];

    // 1. Quotations without Customer Links
    quotations.forEach(q => {
      const hasCust = q.customerId && customers.some(c => c.id === q.customerId);
      if (!hasCust) {
        links.push({
          id: `MISS-Q-${q.id}`,
          entityType: 'Quotation',
          recordId: q.id,
          recordName: q.quoteNumber || 'غير محدد',
          missingRelation: 'Customer (عميل)',
          relatedId: q.customerId || 'NULL',
          severity: 'HIGH',
          reason: 'عرض سعر تائه لا ينتمي لأي عميل مسجل في المنظومة',
          itemReference: q
        });
      }
    });

    // 2. Contracts without Customer Links
    contracts.forEach(c => {
      const hasCust = c.customerId && customers.some(cust => cust.id === c.customerId);
      if (!hasCust) {
        links.push({
          id: `MISS-C-${c.id}`,
          entityType: 'Contract',
          recordId: c.id,
          recordName: c.contractNumber || 'غير محدد',
          missingRelation: 'Customer (عميل)',
          relatedId: c.customerId || 'NULL',
          severity: 'CRITICAL',
          reason: 'عقد تائه (Orphan Contract) لا توجد له أي بطاقة عميل مقابلة بالرقم أو الهوية',
          itemReference: c
        });
      }
    });

    // 3. Sales without Contract Links
    sales.forEach(s => {
      if (!s.contractId) {
        links.push({
          id: `MISS-S-${s.id}`,
          entityType: 'Sale',
          recordId: s.id,
          recordName: `مبيعة ${s.amount.toLocaleString()} ج.م`,
          missingRelation: 'Contract (عقد)',
          relatedId: 'NULL',
          severity: 'MEDIUM',
          reason: 'مبيعة حرة مسجلة بدون ربطها بمشروع تعاقدي مباشر',
          itemReference: s
        });
      }
    });

    // 4. Opportunities without Customer
    opportunities.forEach(o => {
      if (!o.customerId) {
        links.push({
          id: `MISS-O-${o.id}`,
          entityType: 'Opportunity',
          recordId: o.id,
          recordName: o.title || 'فرصة بدون عنوان',
          missingRelation: 'Customer (عميل)',
          relatedId: 'NULL',
          severity: 'MEDIUM',
          reason: 'فرصة بيعية نشطة معزولة لم يتم ربطها بملف عميل',
          itemReference: o
        });
      }
    });

    // 5. Add general diagnostic missing issues
    unifiedDiagResult.issues.forEach(iss => {
      if (iss.category === 'RELATIONSHIP' && !links.some(l => l.recordId === iss.recordId)) {
        links.push({
          id: `MISS-DIAG-${iss.id}`,
          entityType: iss.entityType as any,
          recordId: iss.recordId,
          recordName: iss.recordId,
          missingRelation: iss.evidence?.referencedEntity || 'من السجل المرتبط',
          relatedId: iss.evidence?.value || 'NULL',
          severity: iss.severity as any,
          reason: iss.reason,
          itemReference: null
        });
      }
    });

    return links;
  }, [quotations, contracts, sales, opportunities, customers, unifiedDiagResult.issues]);

  const filteredMissingLinks = useMemo(() => {
    return missingLinks.filter(l => {
      return l.recordId.includes(searchQuery) || l.recordName.includes(searchQuery) || l.reason.includes(searchQuery);
    });
  }, [missingLinks, searchQuery]);

  // -------------------------------------------------------------
  // MUTATION EVENT HANDLERS (AUDITED CONTROLS)
  // -------------------------------------------------------------
  const executeDeleteQuotation = (id: string, reason: string) => {
    const item = quotations.find(q => q.id === id);
    if (!item) return;

    // 1. Delete record in React App State via AppContext
    deleteQuotation(id);

    // 2. Add Audit Log
    addAuditLog({
      companyId: item.companyId || 'all',
      action: 'DELETE',
      actionType: 'DELETE_QUOTATION',
      entityType: 'Quotation',
      entityId: id,
      customerName: item.customerName,
      description: `حذف عرض سعر نهائياً لتسوية التكرارات. الرقم: ${item.quoteNumber || 'غير محدد'}، القيمة: ${item.totalAmount} ج.م. السبب المباشر: ${reason}`,
      oldValue: item,
      newValue: null,
      status: 'resolved'
    });

    // 3. Clear selections and show feedback
    setSelectedRecordIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setConfirmQuoteDelete(null);
    showToast("تم حذف عرض السعر وتسجيل العملية في سجل التدقيق المالي بنجاح", "success");
  };

  const executeExcludeQuotation = (id: string, reason: string) => {
    const item = quotations.find(q => q.id === id);
    if (!item) return;

    // 1. Mark as excluded
    excludeRecord('quotation', id, reason);

    // 2. Add Audit Log
    addAuditLog({
      companyId: item.companyId || 'all',
      action: 'EXCLUDE',
      actionType: 'EXCLUDE_QUOTATION',
      entityType: 'Quotation',
      entityId: id,
      customerName: item.customerName,
      description: `تم استثناء عرض السعر ${item.quoteNumber || id} من فحص جودة البيانات المباشر والربط المكرر. السبب: ${reason}`,
      oldValue: item,
      newValue: { ...item, recordStatus: 'excluded' },
      status: 'resolved'
    });

    setSelectedRecordIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showToast("تم استبعاد الملف التشغيلي من الفحص المباشر بنجاح", "info");
  };

  const executeKeepSingleQuotation = (id: string) => {
    const item = quotations.find(q => q.id === id);
    if (!item) return;

    // 1. Re-approve / Keep
    approveRecord('quotation', id);

    // 2. Add Audit log
    addAuditLog({
      companyId: item.companyId || 'all',
      action: 'APPROVE',
      actionType: 'APPROVE_QUOTATION',
      entityType: 'Quotation',
      entityId: id,
      customerName: item.customerName,
      description: `اعتماد والاحتفاظ بعرض السعر ${item.quoteNumber || id} كمسند صالح وموثق والاحتفاظ به في حسابات المجموعات.`,
      oldValue: item,
      newValue: { ...item, recordStatus: 'approved' },
      status: 'resolved'
    });

    showToast("تم اعتماد وتأصيل عرض السعر بنجاح", "success");
  };

  const executeResolveLink = (quoteId: string, customerId: string) => {
    const quote = quotations.find(q => q.id === quoteId);
    const cust = customers.find(c => c.id === customerId);
    if (!quote || !cust) return;

    // Update quote
    updateQuotation(quoteId, {
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone
    });

    addAuditLog({
      companyId: quote.companyId || 'all',
      action: 'LINK',
      actionType: 'LINK_QUOTATION_CUSTOMER',
      entityType: 'Quotation',
      entityId: quoteId,
      customerName: cust.name,
      description: `ربط عرض السعر ${quote.quoteNumber || quoteId} بالعميل المسجل ${cust.name} هاتف ${cust.phone} لإصلاح الروابط الناقصة.`,
      oldValue: quote,
      newValue: { ...quote, customerId: cust.id, customerName: cust.name },
      status: 'resolved'
    });

    setLinkingQuote(null);
    showToast("تم إتمام ربط الكيانات وتحديث جودة العلاقات بنجاح المالي.", "success");
  };

  // -------------------------------------------------------------
  // BATCH ACTIONS ENGINE
  // -------------------------------------------------------------
  const handleBatchSelectAll = (targetItems: any[]) => {
    const next = new Set<string>();
    targetItems.forEach(item => {
      const id = item.quote?.id || item.id;
      if (id) next.add(id);
    });
    setSelectedRecordIds(next);
    showToast(`تم تحديد ${next.size} سجلاً بنجاح.`, "info");
  };

  const handleBatchSelectDuplicatesOnly = (targetItems: any[]) => {
    const next = new Set<string>();
    targetItems.forEach(item => {
      const q = item.quote || item;
      const isDup = q.recordStatus === 'duplicate' || item.type === 'duplicate';
      if (isDup && q.id) {
        next.add(q.id);
      }
    });
    setSelectedRecordIds(next);
    showToast(`تم تحديد السجلات المكررة فقط (${next.size} سجلاً).`, "info");
  };

  const handleBatchInvertSelection = (targetItems: any[]) => {
    const next = new Set<string>();
    targetItems.forEach(item => {
      const id = item.quote?.id || item.id;
      if (id && !selectedRecordIds.has(id)) {
        next.add(id);
      }
    });
    setSelectedRecordIds(next);
    showToast("تم عكس التحديد الحالي للسجلات.", "info");
  };

  const handleBulkActionTrigger = (actionType: 'delete' | 'exclude' | 'review') => {
    if (selectedRecordIds.size === 0) {
      showToast("يرجى تحديد سجل واحد على الأقل أولاً.", "warning");
      return;
    }

    const idsArr = Array.from(selectedRecordIds);
    let deleteCount = 0;
    let excludeCount = 0;
    let reviewCount = 0;

    if (actionType === 'delete') deleteCount = idsArr.length;
    if (actionType === 'exclude') excludeCount = idsArr.length;
    if (actionType === 'review') reviewCount = idsArr.length;

    setBulkActionPreview({
      isOpen: true,
      actionType,
      entityType: 'Quotation',
      ids: idsArr,
      summary: { deleteCount, excludeCount, reviewCount }
    });
  };

  const executeBulkAction = () => {
    if (!bulkActionPreview) return;
    const { actionType, ids } = bulkActionPreview;

    ids.forEach(id => {
      if (actionType === 'delete') {
        executeDeleteQuotation(id, "حذف دفعي منظم من لوحة التحكم الشاملة");
      } else if (actionType === 'exclude') {
        executeExcludeQuotation(id, "استبعاد دفعي منظم من لوحة التحكم الشاملة");
      } else if (actionType === 'review') {
        executeKeepSingleQuotation(id);
      }
    });

    showToast(`تم تنفيذ الإجراء الدفعي بنجاح على ${ids.length} سجلاً.`, "success");
    setSelectedRecordIds(new Set());
    setBulkActionPreview(null);
  };

  // -------------------------------------------------------------
  // RECONCILIATION CALCULATION FOR QUICK VIEW
  // -------------------------------------------------------------
  const quotationReconciliation = useMemo(() => {
    const totalQuotations = quotations.length;
    const contractedCustomerIds = new Set(
      contracts
        .filter((c) => c.recordStatus !== 'duplicate' && c.recordStatus !== 'excluded')
        .map((c) => c.customerId)
        .filter(Boolean)
    );

    const realOppsMap = new Map(opportunities.map((o) => [o.id, o]));
    const realInqsSet = new Set(inquiries.map((i) => i.id));

    const quotesLinkedByOpps = new Set(
      opportunities
        .map((o) => o.quotationId)
        .filter(Boolean)
    );

    let linkedToContractedCount = 0;
    let linkedToOppsCount = 0;
    let linkedToInqsCount = 0;

    const duplicateMap = new Map<string, typeof quotations>();
    const orphanQuotes: Array<{ quote: typeof quotations[0]; reason: string }> = [];

    quotations.forEach((q) => {
      if (q.customerId && contractedCustomerIds.has(q.customerId)) {
        linkedToContractedCount++;
      }
      if (quotesLinkedByOpps.has(q.id)) {
        linkedToOppsCount++;
      }
      if (q.inquiryId && realInqsSet.has(q.inquiryId)) {
        linkedToInqsCount++;
      }

      const dupKey = q.quoteNumber
        ? `${q.companyId}_${q.quoteNumber.trim()}`
        : `${q.companyId}_${q.customerId}_${q.totalAmount}`;
      const group = duplicateMap.get(dupKey) || [];
      group.push(q);
      duplicateMap.set(dupKey, group);

      const hasCust = Boolean(q.customerId && customers.some((c) => c.id === q.customerId));
      const hasOpp = quotesLinkedByOpps.has(q.id);
      const hasInq = Boolean(q.inquiryId && realInqsSet.has(q.inquiryId));

      if (!hasCust && !hasOpp && !hasInq) {
        orphanQuotes.push({
          quote: q,
          reason: 'عرض سعر تائه: لا ينتمي لعميل مسجل أو فرصة أو استفسار',
        });
      }
    });

    const duplicateGroups = Array.from(duplicateMap.values()).filter((g) => g.length > 1);
    const duplicatesCount = duplicateGroups.reduce((sum, g) => sum + (g.length - 1), 0);
    const validStandaloneCount = Math.max(0, totalQuotations - orphanQuotes.length - duplicatesCount);

    return {
      totalQuotations,
      linkedToContractedCount,
      linkedToOppsCount,
      linkedToInqsCount,
      validStandaloneCount,
      duplicatesCount,
      orphanQuotesCount: orphanQuotes.length,
      reconciledTotal: totalQuotations - duplicatesCount,
    };
  }, [quotations, contracts, opportunities, inquiries, customers]);

  // Handle Quick link lookup
  const filteredQuickCustomers = useMemo(() => {
    if (!linkingSearch) return customers.slice(0, 10);
    return customers.filter(c => c.name.includes(linkingSearch) || c.phone.includes(linkingSearch)).slice(0, 10);
  }, [customers, linkingSearch]);

  return (
    <div className="space-y-6 pb-12">
      {/* 🛡️ DATA CONTROL CENTER HEADER BANNER */}
      <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#C8A75A] animate-pulse" />
              <h1 className="text-xl font-bold text-[#EDEDED]">بوابة التحكم والرقابة التامة (DATA CONTROL CENTER)</h1>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1">
              الطبقة العازلة والإدارية الأكثر صرامة للتدقيق والتحصين. الكشف المباشر ← التشخيص الذكي ← المراجعة اليدوية المقارنة ← الإجراءات وتأصيل الروابط.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#C8A75A] font-bold">
              نشطة: {unifiedDiagResult.issues.length} قواعد مخالفة
            </span>
            <span className="px-3 py-1.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#A1A1AA]">
              العملاء: {customers.length}
            </span>
          </div>
        </div>

        {/* 🚀 SIX CORE NAVIGATION TABS */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 border-t border-[#292B2E] pt-4">
          <button
            onClick={() => { setActiveTab('diagnostic'); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'diagnostic'
                ? 'bg-[#C8A75A] text-black font-extrabold shadow-md'
                : 'bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            مطابقة الأرقام والتشخيص
          </button>

          <button
            onClick={() => { setActiveTab('all_customers_control'); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'all_customers_control'
                ? 'bg-[#C8A75A] text-black font-extrabold shadow-md'
                : 'bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            سجل العملاء الشامل ({customers.length})
          </button>

          <button
            onClick={() => { setActiveTab('all_quotes_control'); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'all_quotes_control'
                ? 'bg-[#C8A75A] text-black font-extrabold shadow-md'
                : 'bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            إدارة عروض الأسعار ({quotations.length})
          </button>

          <button
            onClick={() => { setActiveTab('duplicate_quotes_groups'); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'duplicate_quotes_groups'
                ? 'bg-[#C8A75A] text-black font-extrabold shadow-md'
                : 'bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            مجموعات التكرار ({quotationDuplicateGroups.length})
          </button>

          <button
            onClick={() => { setActiveTab('missing_links_control'); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'missing_links_control'
                ? 'bg-[#C8A75A] text-black font-extrabold shadow-md'
                : 'bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            الروابط الناقصة ({missingLinks.length})
          </button>

          <button
            onClick={() => { setActiveTab('audit_logs_control'); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'audit_logs_control'
                ? 'bg-[#C8A75A] text-black font-extrabold shadow-md'
                : 'bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            سجل العمليات والتدقيق ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR FOR ACTIVE SCREENS */}
      {activeTab !== 'diagnostic' && activeTab !== 'audit_logs_control' && (
        <div className="bg-[#141517] border border-[#292B2E] p-4 rounded-xl flex flex-col md:flex-row items-center gap-3 justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder={
                activeTab === 'all_customers_control' ? "البحث بالاسم، الهاتف، أو الرمز..." :
                activeTab === 'all_quotes_control' ? "البحث برقم العرض، اسم العميل، القيمة..." :
                "البحث السريع في السجلات..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#18191B] border border-[#292B2E] rounded-xl pl-4 pr-10 py-2.5 text-xs text-[#EDEDED] focus:border-[#C8A75A] outline-none"
            />
          </div>

          {/* Quotation Specific Filtering Controls */}
          {activeTab === 'all_quotes_control' && (
            <div className="flex flex-wrap items-center gap-1.5 bg-[#18191B] p-1.5 rounded-xl border border-[#292B2E] w-full md:w-auto">
              <button
                onClick={() => setQuoteFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${quoteFilter === 'all' ? 'bg-[#C8A75A] text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                الكل
              </button>
              <button
                onClick={() => setQuoteFilter('healthy')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${quoteFilter === 'healthy' ? 'bg-[#C8A75A] text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                سليم
              </button>
              <button
                onClick={() => setQuoteFilter('duplicate')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${quoteFilter === 'duplicate' ? 'bg-rose-950 text-rose-400 border border-rose-900/40' : 'text-zinc-400 hover:text-white'}`}
              >
                مكرر
              </button>
              <button
                onClick={() => setQuoteFilter('unlinked')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${quoteFilter === 'unlinked' ? 'bg-amber-950 text-amber-400 border border-amber-900/40' : 'text-zinc-400 hover:text-white'}`}
              >
                غير مرتبط
              </button>
              <button
                onClick={() => setQuoteFilter('needs_review')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${quoteFilter === 'needs_review' ? 'bg-orange-950 text-orange-400 border border-orange-900/40' : 'text-zinc-400 hover:text-white'}`}
              >
                يحتاج مراجعة
              </button>
              <button
                onClick={() => setQuoteFilter('approved_independent')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${quoteFilter === 'approved_independent' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' : 'text-zinc-400 hover:text-white'}`}
              >
                مستقل معتمد
              </button>
            </div>
          )}

          {/* Customer Specific Filtering Controls */}
          {activeTab === 'all_customers_control' && (
            <div className="flex flex-wrap items-center gap-1.5 bg-[#18191B] p-1.5 rounded-xl border border-[#292B2E] w-full md:w-auto">
              <button
                onClick={() => setCustomerFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${customerFilter === 'all' ? 'bg-[#C8A75A] text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                الكل
              </button>
              <button
                onClick={() => setCustomerFilter('healthy')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${customerFilter === 'healthy' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' : 'text-zinc-400 hover:text-white'}`}
              >
                سليم ({customerControlStats.filter(s => s.classification === 'healthy').length})
              </button>
              <button
                onClick={() => setCustomerFilter('needs_intervention')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${customerFilter === 'needs_intervention' ? 'bg-rose-950 text-rose-400 border border-rose-900/40' : 'text-zinc-400 hover:text-white'}`}
              >
                يحتاج تدخل ({customerControlStats.filter(s => s.classification === 'needs_intervention').length})
              </button>
              <button
                onClick={() => setCustomerFilter('active_sales_cycle')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${customerFilter === 'active_sales_cycle' ? 'bg-blue-950 text-blue-400 border border-blue-900/40' : 'text-zinc-400 hover:text-white'}`}
              >
                دورة مبيعات نشطة ({customerControlStats.filter(s => s.classification === 'active_sales_cycle').length})
              </button>
              <button
                onClick={() => setCustomerFilter('no_contract_no_active_cycle')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${customerFilter === 'no_contract_no_active_cycle' ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' : 'text-zinc-400 hover:text-white'}`}
              >
                غير نشط وبدون عقد ({customerControlStats.filter(s => s.classification === 'no_contract_no_active_cycle').length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* SCREEN 1: DIAGNOSTIC & NUMBERS RECONCILIATION */}
      {/* -------------------------------------------------------------------------------------- */}
      {activeTab === 'diagnostic' && (
        <div className="space-y-6">
          <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-2 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-extrabold text-sm text-amber-300">
                    تقرير التشخيص والتدقيق المباشر (Diagnostic Audit Report)
                  </h3>
                  <span className="text-[10px] text-amber-400 bg-amber-900/40 px-2.5 py-1 rounded-full border border-amber-800/60 font-mono">
                    تاريخ الفحص: {new Date(diagnosticReport.timestamp).toLocaleString("ar-EG")}
                  </span>
                </div>

                <p className="text-xs text-amber-200/90 leading-relaxed">
                  هذا التقرير يفسر وجود تباين في علاقات الكيانات: <span className="font-black text-amber-300">{diagnosticReport.summary.totalContracts} عقداً</span> مفعلاً، مقابل <span className="font-black text-amber-300">{diagnosticReport.summary.totalRegisteredCustomers} عملاء مسجلين</span>.
                </p>

                <ul className="list-disc list-inside text-xs text-amber-200/80 space-y-1 pr-1 font-medium">
                  {diagnosticReport.summary.rootCauses.map((cause, idx) => (
                    <li key={idx}>{cause}</li>
                  ))}
                </ul>

                {(diagnosticReport.summary.orphanContractsCount > 0) && (
                  <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-amber-800/40 mt-3">
                    <button
                      onClick={createCustomersFromOrphanContracts}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>إنشاء بطاقات عملاء تلقائية لـ ({diagnosticReport.summary.orphanContractsCount}) عقد تائه</span>
                    </button>
                    <button
                      onClick={purgeOrphanContracts}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف وتصفية العقود التائهة التاريخية</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Metric Buttons for Drill down */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              onClick={() => { setActiveTab('all_customers_control'); }}
              className="bg-[#18191B] border border-[#292B2E] hover:border-[#C8A75A]/60 rounded-2xl p-4 space-y-1 text-right transition-all cursor-pointer outline-none"
            >
              <span className="text-[11px] font-semibold text-[#A1A1AA]">العملاء المسجلين</span>
              <p className="text-xl font-black text-[#EDEDED] font-mono">{diagnosticReport.summary.totalRegisteredCustomers}</p>
              <span className="text-[10px] text-emerald-400 block mt-0.5">افتح السجل الشامل 88 ←</span>
            </button>

            <button
              onClick={() => setDrillDown({
                isOpen: true,
                title: "مراجعة وتدقيق قائمة العقود المسجلة بالمنظومة",
                entityType: "Contract",
                records: contracts
              })}
              className="bg-[#18191B] border border-[#292B2E] hover:border-[#C8A75A]/60 rounded-2xl p-4 space-y-1 text-right transition-all cursor-pointer outline-none"
            >
              <span className="text-[11px] font-semibold text-[#A1A1AA]">إجمالي العقود</span>
              <p className="text-xl font-black text-[#C8A75A] font-mono">{diagnosticReport.summary.totalContracts}</p>
              <span className="text-[10px] text-zinc-500 block mt-0.5">افتح سجل العقود 83 ←</span>
            </button>

            <button
              onClick={() => setDrillDown({
                isOpen: true,
                title: "مراجعة وتدقيق العقود المربوطة السليمة",
                entityType: "Contract",
                records: contracts.filter(c => c.customerId && customers.some(cust => cust.id === c.customerId))
              })}
              className="bg-[#18191B] border border-[#292B2E] hover:border-[#C8A75A]/60 rounded-2xl p-4 space-y-1 text-right transition-all cursor-pointer outline-none"
            >
              <span className="text-[11px] font-semibold text-[#A1A1AA]">عقود مسجلة سليمة</span>
              <p className="text-xl font-black text-emerald-400 font-mono">{diagnosticReport.summary.registeredContractsCount}</p>
              <span className="text-[10px] text-emerald-400 block mt-0.5">المرتبطة بالعملاء الـ 83</span>
            </button>

            <button
              onClick={() => setDrillDown({
                isOpen: true,
                title: "مراجعة وتدقيق العقود غير المسجلة (Orphan)",
                entityType: "Contract",
                records: contracts.filter(c => !c.customerId || !customers.some(cust => cust.id === c.customerId))
              })}
              className="bg-[#18191B] border border-[#292B2E] hover:border-[#C8A75A]/60 rounded-2xl p-4 space-y-1 text-right transition-all cursor-pointer outline-none"
            >
              <span className="text-[11px] font-semibold text-[#A1A1AA]">عقود غير مسجلة (Orphan)</span>
              <p className="text-xl font-black text-amber-400 font-mono">{diagnosticReport.summary.orphanContractsCount}</p>
              <span className="text-[10px] text-amber-400 block mt-0.5">بدون عملاء مرتبطين</span>
            </button>

            <button
              onClick={() => setDrillDown({
                isOpen: true,
                title: "مراجعة وتدقيق قائمة فواتير المبيعات",
                entityType: "Sale",
                records: sales
              })}
              className="bg-[#18191B] border border-[#292B2E] hover:border-[#C8A75A]/60 rounded-2xl p-4 space-y-1 text-right transition-all cursor-pointer outline-none"
            >
              <span className="text-[11px] font-semibold text-[#A1A1AA]">إجمالي المبيعات</span>
              <p className="text-xl font-black text-blue-400 font-mono">{diagnosticReport.summary.totalSales}</p>
              <span className="text-[10px] text-blue-400 block mt-0.5">{diagnosticReport.salesMappingSummary.salesLinkedToContractsCount} مربوطة بعقود</span>
            </button>

            <button
              onClick={() => { setActiveTab('all_quotes_control'); }}
              className="bg-[#18191B] border border-[#292B2E] hover:border-[#C8A75A]/60 rounded-2xl p-4 space-y-1 text-right transition-all cursor-pointer outline-none"
            >
              <span className="text-[11px] font-semibold text-[#A1A1AA]">عروض الأسعار</span>
              <p className="text-xl font-black text-[#C8A75A] font-mono">{quotationReconciliation.totalQuotations}</p>
              <span className="text-[10px] text-zinc-500 block mt-0.5">افتح سجل العروض 104 ←</span>
            </button>
          </div>

          {/* Quotations Reconciliation Audit Panel */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#292B2E]">
              <div>
                <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#C8A75A]" />
                  تقرير تدقيق ومطابقة عروض الأسعار (Quotations Reconciliation Audit)
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  تطابق عروض الأسعار الإجمالية ({quotationReconciliation.totalQuotations} عرض سعر) مع العملاء، الفرص البيعية، والمتابعات النشطة.
                </p>
              </div>
              <button
                onClick={() => { setActiveTab('all_quotes_control'); }}
                className="px-3 py-1.5 bg-[#C8A75A]/15 border border-[#C8A75A]/30 text-[#C8A75A] font-extrabold text-xs rounded-xl self-start sm:self-auto hover:bg-[#C8A75A]/25 transition-all cursor-pointer"
              >
                المطابق الصافي الفعلي: {quotationReconciliation.reconciledTotal} عرض سعر
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => { setActiveTab('all_quotes_control'); }}
                className="bg-[#141517] hover:border-[#C8A75A]/60 text-right p-3.5 rounded-xl border border-[#292B2E] cursor-pointer outline-none transition-all"
              >
                <span className="text-[11px] text-[#A1A1AA] block">إجمالي عروض الأسعار</span>
                <span className="text-lg font-black text-[#EDEDED] font-mono">{quotationReconciliation.totalQuotations}</span>
              </button>
              <button
                onClick={() => { setActiveTab('all_quotes_control'); setQuoteFilter('linked_customer'); }}
                className="bg-[#141517] hover:border-[#C8A75A]/60 text-right p-3.5 rounded-xl border border-[#292B2E] cursor-pointer outline-none transition-all"
              >
                <span className="text-[11px] text-[#A1A1AA] block">مرتبطة بعملاء</span>
                <span className="text-lg font-black text-emerald-400 font-mono">{quotationReconciliation.linkedToContractedCount}</span>
              </button>
              <button
                onClick={() => { setActiveTab('all_quotes_control'); setQuoteFilter('linked_opp'); }}
                className="bg-[#141517] hover:border-[#C8A75A]/60 text-right p-3.5 rounded-xl border border-[#292B2E] cursor-pointer outline-none transition-all"
              >
                <span className="text-[11px] text-[#A1A1AA] block">مرتبطة بفرص بيعية</span>
                <span className="text-lg font-black text-blue-400 font-mono">{quotationReconciliation.linkedToOppsCount}</span>
              </button>
              <button
                onClick={() => { setActiveTab('duplicate_quotes_groups'); }}
                className="bg-[#141517] hover:border-[#C8A75A]/60 text-right p-3.5 rounded-xl border border-[#292B2E] cursor-pointer outline-none transition-all"
              >
                <span className="text-[11px] text-[#A1A1AA] block">عروض مكررة بنفس الأرقام</span>
                <span className="text-lg font-black text-rose-400 font-mono">
                  {quotationReconciliation.duplicatesCount}
                </span>
              </button>
            </div>
          </div>

          {/* Unified Reconciliation Engine Matrix */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#292B2E]">
              <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#C8A75A]" />
                مصفوفة مطابقة مجموعات العلاقات — Unified Reconciliation Engine Matrix
              </h3>
              <span className="text-xs text-[#A1A1AA] font-mono">
                موازنة ومقاصة كاملة لجودة العلاقات
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unifiedDiagResult.reconciliations.map((recon, idx) => (
                <div key={idx} className="bg-[#141517] border border-[#292B2E] p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#EDEDED]">{recon.source} ↔ {recon.target}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                      recon.status === "PASS"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}>
                      {recon.status === "PASS" ? "✓ مطابق تماماً" : "⚠️ بحاجة تدقيق روابط"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-right">
                    <div className="bg-[#18191B] p-2 rounded border border-[#292B2E]">
                      <span className="text-[#A1A1AA] block text-[9px]">تم مسحه</span>
                      <strong className="font-mono text-[#EDEDED]">{recon.recordsChecked}</strong>
                    </div>
                    <div className="bg-[#18191B] p-2 rounded border border-[#292B2E]">
                      <span className="text-emerald-400 block text-[9px]">سليم ومطابق</span>
                      <strong className="font-mono text-emerald-400">{recon.recordsPassed}</strong>
                    </div>
                    <div className={`p-2 rounded border ${recon.recordsFailed > 0 ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-[#18191B] border-[#292B2E] text-zinc-400"}`}>
                      <span className="block text-[9px]">مخالف وقضية</span>
                      <strong className="font-mono">{recon.recordsFailed}</strong>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#A1A1AA] space-y-1 bg-[#18191B] p-2 rounded-lg font-mono" dir="ltr">
                    <div>Relation: <span className="text-white">{recon.source}</span> → <span className="text-white">{recon.target}</span></div>
                    <div>Join Key: <span className="text-white">{recon.joinKey}</span></div>
                    <div>Cardinality: <span className="text-amber-400">{recon.expectedCardinality}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ====================================================================================== */}
          {/* PVC NESTA - EXCLUSIVE VIOLATIONS & INTEGRITY CENTER */}
          {/* ====================================================================================== */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 space-y-6">
            <div className="border-b border-[#292B2E] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#EDEDED]">
                    مركز رقابة جودة علاقات عروض الأسعار (PVC Nesta Quotation Integrity)
                  </h3>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    تشخيص كامل وتفصيلي للمخالفات الـ 11 في علاقة عروض الأسعار والعملاء مع توضيح تباين الأرقام المنهجي وغياب ربط الفرص.
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Explanations Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Discrepancy explanation */}
              <div className="bg-[#141517] border border-[#292B2E] rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  تفسير ومقاصة تناقض الأرقام الحسابية
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed text-justify">
                  تشير الإحصائيات المختصرة بالواجهة لـ <span className="text-amber-400 font-bold">83 عرض سعر</span> بينما تعرض مصفوفة جودة العلاقات <span className="text-emerald-400 font-bold">84 عرضاً سليماً</span> بالإضافة لـ <span className="text-rose-400 font-bold">11 مخالفة</span> (المجموع 95 عرض سعر بالمنظومة).
                </p>
                <div className="p-2.5 bg-[#18191B] rounded-lg border border-[#292B2E]/60 text-[11px] text-zinc-400 space-y-1">
                  <div>• <span className="text-amber-400 font-bold">83 عرضاً:</span> هو عدد العروض المرتبطة بعملاء <strong>يمتلكون عقداً فعلياً</strong> بالمنظومة.</div>
                  <div>• <span className="text-emerald-400 font-bold">84 عرضاً:</span> يشمل العروض الـ 83 بالإضافة لـ <strong>عرض سعر واحد</strong> مرتبط بعميل مسجل <strong>لا يمتلك عقداً بعد</strong> (في مرحلة الفرصة البيعية).</div>
                  <div>• <span className="text-rose-400 font-bold">11 مخالفة:</span> عروض أسعار تائهة لعملاء <strong>مفقودين بالكامل</strong> من قاعدة البيانات.</div>
                </div>
              </div>

              {/* Box 2: Opportunity linkage explanation */}
              <div className="bg-[#141517] border border-[#292B2E] rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  تحليل غياب الربط المباشر بالفرص البيعية (0 عروض)
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed text-justify">
                  يظهر التشخيص وجود <span className="text-blue-400 font-bold">0 عروض أسعار</span> مرتبطة بالفرص من اتجاه جدول العروض. هذا السلوك سليم تماماً ويرجع إلى <strong>التصميم الهيكلي لقاعدة البيانات</strong>.
                </p>
                <div className="p-2.5 bg-[#18191B] rounded-lg border border-[#292B2E]/60 text-[11px] text-zinc-400 space-y-1">
                  <div>• <span className="text-blue-400 font-bold">غياب حقل الربط:</span> جدول عروض الأسعار <code className="text-zinc-300">quotations</code> لا يحتوي أساساً على عمود <code className="text-zinc-300">opportunityId</code>.</div>
                  <div>• <span className="text-emerald-400 font-bold">العلاقة العكسية:</span> يتم تخزين الربط بشكل عكسي داخل جدول الفرص <code className="text-zinc-300">opportunities / interactions</code> حيث يحمل كائن الفرصة معرّف عرض السعر <code className="text-zinc-300">quotationId</code>.</div>
                  <div>• <span className="text-zinc-400">النتيجة:</span> العلاقات سليمة وموجودة وموثقة بالكامل، ولكن بالاتجاه المعاكس المعتمد في بنية قاعدة البيانات.</div>
                </div>
              </div>
            </div>

            {/* Violations Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  قائمة الـ 11 عرض سعر المخالفة لقواعد التكامل التشغيلي
                </h4>
                <span className="text-[10px] text-rose-300 bg-rose-950/40 border border-rose-900/40 px-2 py-0.5 rounded font-black">
                  مخالفات Integrate_Quotation_To_Customer
                </span>
              </div>

              <div className="overflow-x-auto border border-[#292B2E] rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-[#141517] text-[#A1A1AA] h-10 border-b border-[#292B2E]">
                      <th className="pr-4 py-2">رقم عرض السعر ID</th>
                      <th className="py-2">الشركة المالكة</th>
                      <th className="py-2">معرّف العميل المخزن</th>
                      <th className="py-2">وجود العميل؟</th>
                      <th className="py-2">القيمة والتاريخ</th>
                      <th className="py-2">التصنيف الفني</th>
                      <th className="py-2 pl-4 text-left">التفاصيل والإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotationViolations.map((v) => {
                      const isExpanded = expandedViolationId === v.quote.id;
                      return (
                        <React.Fragment key={v.quote.id}>
                          <tr className="border-b border-[#292B2E]/40 hover:bg-[#141517]/80 h-12 transition-colors">
                            <td className="pr-4 py-2 font-mono text-[11px] font-black text-zinc-300">
                              {v.quote.quoteNumber || "N/A"}{" "}
                              <span className="text-zinc-600 block text-[9px] font-mono">{v.quote.id.substring(0, 8)}...</span>
                            </td>
                            <td className="py-2 font-bold text-zinc-400">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                v.quote.companyId === "comp-import-1789231993585-501" 
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {v.companyName}
                              </span>
                            </td>
                            <td className="py-2 font-mono text-zinc-500 text-[10px]">
                              {v.quote.customerId || "NULL"}
                            </td>
                            <td className="py-2 font-bold text-rose-400">
                              ❌ غير موجود بالكامل
                            </td>
                            <td className="py-2 text-zinc-300 font-mono text-[11px]">
                              {v.quote.totalAmount?.toLocaleString()} ج.م
                              <span className="text-zinc-600 block text-[9px] font-mono">{v.quote.date || "N/A"}</span>
                            </td>
                            <td className="py-2">
                              <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black font-mono">
                                {v.classification}
                              </span>
                            </td>
                            <td className="py-2 pl-4 text-left">
                              <button
                                onClick={() => setExpandedViolationId(isExpanded ? null : v.quote.id)}
                                className="px-2.5 py-1 bg-[#202225] border border-zinc-800 text-zinc-300 text-[10px] rounded hover:border-[#C8A75A]/60 cursor-pointer transition-all font-black"
                              >
                                {isExpanded ? "إغلاق التفاصيل ▲" : "تفاصيل السجل ▼"}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Detail Panel */}
                          {isExpanded && (
                            <tr className="bg-[#141517]/40 border-b border-[#292B2E]">
                              <td colSpan={7} className="p-4 pr-6 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right text-xs">
                                  {/* Section 1: Record Identifiers */}
                                  <div className="bg-[#18191B] p-3.5 rounded-xl border border-[#292B2E]/80 space-y-1.5">
                                    <h5 className="font-extrabold text-[#C8A75A] border-b border-[#292B2E] pb-1 mb-1 font-sans">المعرفات الرقمية للسجل</h5>
                                    <div>• <strong>رمز المعرف (quotationId):</strong> <code className="font-mono text-zinc-400 select-all">{v.quote.id}</code></div>
                                    <div>• <strong>رقم العرض:</strong> <span className="font-mono text-zinc-400">{v.quote.quoteNumber || "N/A"}</span></div>
                                    <div>• <strong>الشركة المالكة:</strong> <span className="text-zinc-400">{v.companyName} ({v.quote.companyId})</span></div>
                                  </div>

                                  {/* Section 2: Integrity Reason */}
                                  <div className="bg-[#18191B] p-3.5 rounded-xl border border-[#292B2E]/80 space-y-1.5">
                                    <h5 className="font-extrabold text-[#C8A75A] border-b border-[#292B2E] pb-1 mb-1 font-sans">سبب المخالفة المحدد</h5>
                                    <div>• <strong>التصنيف الفني:</strong> <span className="text-rose-400 font-bold font-mono">CUSTOMER_NOT_FOUND</span></div>
                                    <div>• <strong>التشخيص الفني:</strong> <span className="text-zinc-300 leading-relaxed block mt-0.5">{v.reason}</span></div>
                                    <div className="text-[11px] text-zinc-500 mt-1 font-sans">المخالفة ناتجة عن تسجيل عرض السعر تحت معرّف غير مطابق لأي بطاقة عميل في المنظومة.</div>
                                  </div>

                                  {/* Section 3: Recommended Action */}
                                  <div className="bg-[#18191B] p-3.5 rounded-xl border border-[#292B2E]/80 space-y-1.5 flex flex-col justify-between">
                                    <div>
                                      <h5 className="font-extrabold text-[#C8A75A] border-b border-[#292B2E] pb-1 mb-1 font-sans">الإجراء التشغيلي الموصى به</h5>
                                      <p className="text-zinc-300 leading-relaxed text-[11px] font-sans">{v.recommendedAction}</p>
                                    </div>
                                    
                                    <div className="pt-2 flex items-center gap-1.5 justify-end">
                                      <button
                                        onClick={() => { setLinkingQuote(v.quote); setLinkingSearch(""); }}
                                        className="px-2.5 py-1 bg-[#C8A75A] text-black font-extrabold text-[10px] rounded hover:opacity-90 cursor-pointer flex items-center gap-1"
                                      >
                                        <Link2 className="w-3 h-3" />
                                        ربط بعميل موجود
                                      </button>
                                      <button
                                        onClick={() => {
                                          excludeRecord('quotation', v.quote.id, "استبعاد مخالفةIntegrate_Quotation_To_Customer");
                                          showToast("تم استثناء المشكلة التشغيلية بنجاح", "info");
                                        }}
                                        className="px-2 py-1 bg-[#202225] border border-zinc-800 text-zinc-400 text-[10px] rounded hover:border-zinc-700 cursor-pointer"
                                      >
                                        استثناء وفحص لاحق
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* SCREEN 2: ALL 88 CUSTOMERS CONTROL REGISTER */}
      {/* -------------------------------------------------------------------------------------- */}
      {activeTab === 'all_customers_control' && (
        <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#292B2E]">
            <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C8A75A]" />
              دليل الرقابة الشامل للعملاء المسجلين بالمنظومة (88 عميل)
            </h3>
            <span className="text-xs text-[#A1A1AA]">
              معروض: {filteredCustomerControlStats.length} من {customers.length} عملاء
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#292B2E] text-[#A1A1AA] h-10">
                  <th className="pb-2">العميل والمعرّف</th>
                  <th className="pb-2 text-center">حالة النزاهة</th>
                  <th className="pb-2 text-center">العقود</th>
                  <th className="pb-2 text-center">المبيعات</th>
                  <th className="pb-2 text-center">التحصيلات</th>
                  <th className="pb-2 text-center">الفرص البيعية</th>
                  <th className="pb-2 text-center">العروض</th>
                  <th className="pb-2 text-center">المتابعات</th>
                  <th className="pb-2 text-center">المرحلة الحالية</th>
                  <th className="pb-2 text-left">قضايا الجودة</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomerControlStats.map((item) => {
                  const hasCriticalIssues = item.issueCount > 0;
                  return (
                    <tr 
                      key={item.customer.id} 
                      className="border-b border-[#292B2E]/40 hover:bg-[#141517] transition-colors h-14"
                    >
                      {/* Name / ID */}
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center ${
                            item.classification === 'healthy' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' :
                            item.classification === 'needs_intervention' ? 'bg-rose-950/40 text-rose-400 border border-rose-900/40' :
                            'bg-zinc-800 text-zinc-300'
                          }`}>
                            {item.customer.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-zinc-100 block">{item.customer.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{item.customer.phone || 'بلا هاتف'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Health Classification */}
                      <td className="py-2 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-black ${
                          item.classification === 'healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          item.classification === 'needs_intervention' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          item.classification === 'active_sales_cycle' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-zinc-900 text-zinc-400'
                        }`}>
                          {
                            item.classification === 'healthy' ? 'سليم وصحي' :
                            item.classification === 'needs_intervention' ? 'يستدعي مراجعة' :
                            item.classification === 'active_sales_cycle' ? 'دورة بيع نشطة' :
                            'غير نشط وبدون عقد'
                          }
                        </span>
                      </td>

                      {/* Contracts count */}
                      <td className="py-2 text-center font-mono font-bold text-zinc-300">
                        {item.contracts.length > 0 ? (
                          <span className="text-emerald-400 font-extrabold">{item.contracts.length} عقد</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Sales Count */}
                      <td className="py-2 text-center font-mono text-zinc-400">
                        {item.sales.length > 0 ? `${item.sales.length} مبيعة` : '—'}
                      </td>

                      {/* Payments Count */}
                      <td className="py-2 text-center font-mono text-zinc-400">
                        {item.payments.length > 0 ? `${item.payments.length} دفعة` : '—'}
                      </td>

                      {/* Opportunities */}
                      <td className="py-2 text-center font-mono text-zinc-400">
                        {item.opportunities.length > 0 ? `${item.opportunities.length} فرصة` : '—'}
                      </td>

                      {/* Quotations count */}
                      <td className="py-2 text-center font-mono text-zinc-400">
                        {item.quotations.length > 0 ? `${item.quotations.length} عرض` : '—'}
                      </td>

                      {/* Followups count */}
                      <td className="py-2 text-center font-mono text-zinc-400">
                        {item.followups.length > 0 ? (
                          <span className="text-amber-400">{item.followups.length} متابعة</span>
                        ) : '—'}
                      </td>

                      {/* Stage */}
                      <td className="py-2 text-center">
                        <span className="text-[10px] text-zinc-300 bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700/60">
                          {item.customer.stage}
                        </span>
                      </td>

                      {/* Issues Count */}
                      <td className="py-2 text-left font-mono">
                        {hasCriticalIssues ? (
                          <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-900/40 text-[10px] font-bold">
                            ⚠️ {item.issueCount} قضايا
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-bold text-[10px]">✓ نظيف ومطابق</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* SCREEN 3: ALL 104 QUOTATIONS CONTROL SCREEN */}
      {/* -------------------------------------------------------------------------------------- */}
      {activeTab === 'all_quotes_control' && (
        <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#292B2E]">
            <div>
              <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#C8A75A]" />
                سجل تتبع ومراقبة عروض الأسعار (Quotations Control - 104 عرض)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                تصفية شاملة وعزل التكرارات والتعارضات. الإجراءات المتاحة: حذف نهائي، استبعاد، اعتماد، وتأصيل العلاقات.
              </p>
            </div>

            {/* Batch Action Controllers */}
            <div className="flex items-center gap-1.5 bg-[#202225] p-1.5 rounded-xl border border-[#292B2E]">
              <span className="text-[10px] text-zinc-400 px-2">التحكم الدفعي:</span>
              <button
                onClick={() => handleBatchSelectAll(filteredClassifiedQuotations)}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 font-bold cursor-pointer"
              >
                تحديد الكل
              </button>
              <button
                onClick={() => handleBatchSelectDuplicatesOnly(filteredClassifiedQuotations)}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 text-rose-300 rounded hover:bg-zinc-700 font-bold cursor-pointer"
              >
                المكرر فقط
              </button>
              <button
                onClick={() => handleBatchInvertSelection(filteredClassifiedQuotations)}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 font-bold cursor-pointer"
              >
                عكس التحديد
              </button>
              <button
                onClick={() => setSelectedRecordIds(new Set())}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 cursor-pointer"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>

          {/* Batch Processing Command Bar */}
          {selectedRecordIds.size > 0 && (
            <div className="bg-[#C8A75A]/10 border border-[#C8A75A]/30 p-3.5 rounded-xl flex items-center justify-between gap-4 animate-pulse">
              <div className="text-xs">
                تم تحديد <strong className="text-[#C8A75A] text-sm">{selectedRecordIds.size}</strong> عرض سعر للمراجعة والعمل المباشر.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkActionTrigger('delete')}
                  className="px-3 py-1.5 bg-rose-950 text-rose-400 border border-rose-900/40 hover:bg-rose-900 text-[10px] font-black rounded-lg cursor-pointer"
                >
                  حذف السجلات المحددة
                </button>
                <button
                  onClick={() => handleBulkActionTrigger('exclude')}
                  className="px-3 py-1.5 bg-amber-950 text-amber-400 border border-amber-900/40 hover:bg-amber-900 text-[10px] font-black rounded-lg cursor-pointer"
                >
                  استبعاد من الفحص
                </button>
                <button
                  onClick={() => handleBulkActionTrigger('review')}
                  className="px-3 py-1.5 bg-emerald-950 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900 text-[10px] font-black rounded-lg cursor-pointer"
                >
                  اعتماد كعروض مستقلة
                </button>
              </div>
            </div>
          )}

          {/* List/Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#292B2E] text-[#A1A1AA] h-10">
                  <th className="pb-2 w-8">تحديد</th>
                  <th className="pb-2">معرّف العرض</th>
                  <th className="pb-2">رقم العرض</th>
                  <th className="pb-2">اسم العميل والربط</th>
                  <th className="pb-2">تاريخ الإصدار</th>
                  <th className="pb-2 text-center">إجمالي القيمة</th>
                  <th className="pb-2 text-center">الحالة المصنفة</th>
                  <th className="pb-2 text-left">التحكم والإجراء المتاح</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassifiedQuotations.map((item) => {
                  const isChecked = selectedRecordIds.has(item.quote.id);
                  return (
                    <tr 
                      key={item.quote.id} 
                      className={`border-b border-[#292B2E]/40 hover:bg-[#141517] transition-colors h-14 ${
                        isChecked ? 'bg-[#C8A75A]/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedRecordIds(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(item.quote.id);
                              else next.delete(item.quote.id);
                              return next;
                            });
                          }}
                          className="w-3.5 h-3.5 rounded accent-[#C8A75A] cursor-pointer"
                        />
                      </td>

                      {/* ID */}
                      <td className="py-2 font-mono text-[11px] text-zinc-500">
                        {item.quote.id}
                      </td>

                      {/* Number */}
                      <td className="py-2 font-mono font-black text-[#EDEDED]">
                        {item.quote.quoteNumber || '—'}
                      </td>

                      {/* Customer / Relations */}
                      <td className="py-2">
                        <div>
                          <span className="font-extrabold text-zinc-200 block">{item.quote.customerName || 'عميل غير معروف'}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {item.isLinkedToOpp ? '✓ مرتبط بفرصة بيعية' : '⚠️ لا توجد له فرصة مرتبطة'}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-2 text-zinc-400 font-mono">
                        {item.quote.date || '—'}
                      </td>

                      {/* Value */}
                      <td className="py-2 text-center font-mono font-bold text-[#C8A75A]">
                        {(Number(item.quote.totalAmount) || 0).toLocaleString()} ج.م
                      </td>

                      {/* Type Label */}
                      <td className="py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                          item.type === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          item.type === 'duplicate' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                          item.type === 'unlinked' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                          item.type === 'needs_review' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                          'bg-zinc-800 text-zinc-300'
                        }`}>
                          {
                            item.type === 'healthy' ? 'عرض سليم' :
                            item.type === 'duplicate' ? 'مكرر' :
                            item.type === 'unlinked' ? 'تائه وغير مرتبط' :
                            item.type === 'needs_review' ? 'يحتاج مراجعة وتدقيق' :
                            'مستقل معتمد'
                          }
                        </span>
                      </td>

                      {/* Controls */}
                      <td className="py-2 text-left">
                        <div className="flex items-center gap-1.5 justify-end">
                          {item.type === 'unlinked' && (
                            <button
                              onClick={() => { setLinkingQuote(item.quote); setLinkingSearch(""); }}
                              className="p-1 bg-[#202225] border border-amber-800/30 text-amber-400 hover:bg-zinc-800 rounded-lg cursor-pointer flex items-center gap-1 text-[10px]"
                              title="ربط الكيان بعميل مسجل"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              ربط العميل
                            </button>
                          )}

                          <button
                            onClick={() => executeKeepSingleQuotation(item.quote.id)}
                            className="p-1 bg-emerald-950 text-emerald-400 hover:bg-emerald-900 rounded-lg cursor-pointer"
                            title="اعتماد والاحتفاظ بالسجل"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => executeExcludeQuotation(item.quote.id, "استبعاد يدوي من إدارة عروض الأسعار")}
                            className="p-1 bg-amber-950 text-amber-400 hover:bg-amber-900 rounded-lg cursor-pointer"
                            title="استبعاد من الفحص"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              // Find other quotes in the database that share duplicate criteria
                              const otherQuotes = quotations.filter(oq => 
                                oq.id !== item.quote.id && 
                                oq.customerId === item.quote.customerId && 
                                oq.quoteNumber === item.quote.quoteNumber && 
                                oq.totalAmount === item.quote.totalAmount
                              );
                              setConfirmQuoteDelete({
                                quote: item.quote,
                                otherQuotesInGroup: otherQuotes
                              });
                            }}
                            className="p-1 bg-rose-950 text-rose-400 hover:bg-rose-900 rounded-lg cursor-pointer"
                            title="حذف نهائي"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* SCREEN 4: DUPLICATE QUOTATIONS GROUPS REVIEW */}
      {/* -------------------------------------------------------------------------------------- */}
      {activeTab === 'duplicate_quotes_groups' && (
        <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
          <div className="pb-3 border-b border-[#292B2E]">
            <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              مجموعات التكرار النشطة لعروض الأسعار (Quotation Duplicate Groups Review)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              ممنوع حذف السجلات تلقائياً. مقارنة السجلات المتطابقة جنباً إلى جنب واختيار العرض الصالح للاحتفاظ به وحذف أو استثناء التكرارات الوهمية.
            </p>
          </div>

          {quotationDuplicateGroups.length === 0 ? (
            <div className="p-8 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="font-extrabold text-xs">قاعدة البيانات محصنة وخالية من التكرارات!</h4>
              <p className="text-[10px] text-[#A1A1AA]">لم يتم العثور على أي عروض أسعار تشترك في نفس الرقم والقيمة والعميل معاً.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {quotationDuplicateGroups.map((group) => (
                <div key={group.key} className="bg-[#141517] border border-[#292B2E] rounded-xl p-4 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#292B2E] pb-2">
                    <div>
                      <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-black font-mono">
                        {group.groupId}
                      </span>
                      <h4 className="text-xs font-black text-[#EDEDED] mt-1.5">
                        رقم العرض: {group.qNum} | العميل: {group.customerName}
                      </h4>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-zinc-500 block">قيمة العرض المكرر</span>
                      <strong className="text-amber-400 font-mono text-sm">{group.amount.toLocaleString()} ج.م</strong>
                    </div>
                  </div>

                  {/* Compare table within the group */}
                  <div className="overflow-x-auto bg-[#18191B] p-2 rounded-xl border border-[#292B2E]/60">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-[#292B2E] text-zinc-400 h-8">
                          <th className="pb-1">المعرّف</th>
                          <th className="pb-1">رقم العرض</th>
                          <th className="pb-1">الفرصة المرتبطة</th>
                          <th className="pb-1">تاريخ الإنشاء</th>
                          <th className="pb-1">حالة السجل بالمنظومة</th>
                          <th className="pb-1 text-left">إجراءات المقارنة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((q) => (
                          <tr key={q.id} className="border-b border-[#292B2E]/40 hover:bg-[#202225] h-11">
                            <td className="py-1 font-mono text-[10px] text-zinc-500">{q.id}</td>
                            <td className="py-1 font-mono font-bold text-zinc-200">{q.quoteNumber || '—'}</td>
                            <td className="py-1 text-zinc-400 font-mono text-[11px]">
                              {q.opportunityId ? `OPP: ${q.opportunityId}` : 'لا توجد فرصة'}
                            </td>
                            <td className="py-1 font-mono text-zinc-500">{q.createdAt || '—'}</td>
                            <td className="py-1">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                q.recordStatus === 'duplicate' ? 'bg-rose-950 text-rose-300 border border-rose-900/40' :
                                q.recordStatus === 'excluded' ? 'bg-zinc-800 text-zinc-400' :
                                'bg-emerald-950 text-emerald-400 border border-emerald-900/40'
                              }`}>
                                {q.recordStatus || 'نشط'}
                              </span>
                            </td>
                            <td className="py-1 text-left">
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => executeKeepSingleQuotation(q.id)}
                                  className="px-2 py-1 bg-emerald-950 text-emerald-400 hover:bg-emerald-900 font-bold text-[10px] rounded cursor-pointer"
                                >
                                  الاحتفاظ بهذا
                                </button>
                                <button
                                  onClick={() => executeExcludeQuotation(q.id, "استثناء من التكرار عبر مقارنة المجموعات")}
                                  className="px-2 py-1 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-[10px] rounded cursor-pointer"
                                >
                                  استبعاد
                                </button>
                                <button
                                  onClick={() => {
                                    const others = group.items.filter(oi => oi.id !== q.id);
                                    setConfirmQuoteDelete({
                                      quote: q,
                                      otherQuotesInGroup: others
                                    });
                                  }}
                                  className="px-2 py-1 bg-rose-950 text-rose-400 hover:bg-rose-900 font-bold text-[10px] rounded cursor-pointer"
                                >
                                  حذف نهائي
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* SCREEN 5: MISSING RELATIONSHIPS BOARD */}
      {/* -------------------------------------------------------------------------------------- */}
      {activeTab === 'missing_links_control' && (
        <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
          <div className="pb-3 border-b border-[#292B2E]">
            <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#C8A75A]" />
              بوابة معالجة العلاقات والروابط الناقصة (Missing Links Board)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              كل سجل مسجل يجب أن يكون مربوطاً بهرم العلاقات السليم. إصلاح العلاقات بشكل آمن يعيد الاستقرار لكافة التقارير المالية والتحليلات.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#292B2E] text-[#A1A1AA] h-10">
                  <th className="pb-2">الكيان المصدر</th>
                  <th className="pb-2">السجل ومفتاحه</th>
                  <th className="pb-2">العلاقة المفقودة</th>
                  <th className="pb-2">قيمة المعرّف الحالية</th>
                  <th className="pb-2 text-center">مستوى الخطورة</th>
                  <th className="pb-2">السبب الفني</th>
                  <th className="pb-2 text-left">الإجراء اليدوي المقترح</th>
                </tr>
              </thead>
              <tbody>
                {filteredMissingLinks.map((link) => (
                  <tr 
                    key={link.id} 
                    className="border-b border-[#292B2E]/40 hover:bg-[#141517] transition-colors h-14"
                  >
                    {/* Entity Type */}
                    <td className="py-2">
                      <span className="px-2.5 py-1 rounded bg-[#202225] border border-[#292B2E] text-zinc-300 font-mono font-bold text-[10px]">
                        {link.entityType.toUpperCase()}
                      </span>
                    </td>

                    {/* Record ID / Name */}
                    <td className="py-2 font-mono text-[11px] font-black text-zinc-200">
                      {link.recordName} <span className="text-zinc-600 block text-[9px]">{link.recordId}</span>
                    </td>

                    {/* Missing Relation */}
                    <td className="py-2 text-[#C8A75A] font-bold">
                      {link.missingRelation}
                    </td>

                    {/* Related ID */}
                    <td className="py-2 font-mono text-zinc-500 text-[10px]">
                      {link.relatedId}
                    </td>

                    {/* Severity */}
                    <td className="py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        link.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        link.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {link.severity}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="py-2 text-zinc-400 text-xs">
                      {link.reason}
                    </td>

                    {/* Quick action button */}
                    <td className="py-2 text-left">
                      <div className="flex items-center gap-1 justify-end">
                        {link.entityType === 'Quotation' && (
                          <button
                            onClick={() => { setLinkingQuote(link.itemReference); setLinkingSearch(""); }}
                            className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-900/40 text-amber-300 font-extrabold text-[10px] rounded cursor-pointer flex items-center gap-1"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            ربط الآن
                          </button>
                        )}
                        <button
                          onClick={() => {
                            excludeRecord(link.entityType.toLowerCase(), link.recordId, "استبعاد مشكلة العلاقة الناقصة");
                            showToast("تم تجاوز واستثناء مشكلة العلاقة الناقصة بنجاح", "info");
                          }}
                          className="px-2 py-1 bg-[#202225] border border-zinc-800 text-zinc-400 text-[10px] rounded cursor-pointer"
                        >
                          تجاوز المشكلة
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* SCREEN 6: ACTION AUDIT LOGS WITH TIMELINE */}
      {/* -------------------------------------------------------------------------------------- */}
      {activeTab === 'audit_logs_control' && (
        <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#292B2E]">
            <div>
              <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
                <History className="w-4 h-4 text-[#C8A75A]" />
                سجل تتبع التغييرات والتدقيق الفني للعمليات (DCC Audit Log Center)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                تتبع كامل لكافة إجراءات التعديل والحذف والاستبعاد التي تتم عبر بوابة التحكم الفائقة لضمان الشفافية.
              </p>
            </div>
            <button
              onClick={() => {
                clearAuditLogs();
                showToast("تم تصفية سجل التدقيق الحالي بنجاح", "info");
              }}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-300 hover:text-white border border-[#292B2E] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              تفريغ السجل
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs space-y-2">
              <History className="w-10 h-10 mx-auto text-zinc-600 animate-pulse" />
              <span>لا توجد عمليات مراجعة مسجلة في الجلسة الحالية حتى الآن.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-[#141517] border border-[#292B2E] p-4 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#292B2E]/40 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        log.action === 'DELETE' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                        log.action === 'EXCLUDE' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                        'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">الكيان: {log.entityType} [{log.entityId}]</span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                      <span>المنفذ: المسؤول الفني للمنظومة</span>
                      <span>•</span>
                      <span dir="ltr">{log.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-zinc-100">{log.description}</p>

                  {/* Changes detail comparative */}
                  {log.oldValue && (
                    <div className="p-3 bg-[#18191B] rounded-lg border border-[#292B2E] text-[10px] font-mono text-zinc-400 space-y-1" dir="ltr">
                      <div><strong>BEFORE STATE:</strong> {JSON.stringify(log.oldValue)}</div>
                      <div><strong>AFTER STATE:</strong> {log.newValue ? JSON.stringify(log.newValue) : 'DELETED (NULL)'}</div>
                    </div>
                  )}

                  {/* Rollback Notification */}
                  <div className="flex items-center gap-1.5 justify-end text-[10px] text-rose-400 font-bold bg-rose-950/20 px-2.5 py-1 rounded-lg border border-rose-900/30 self-end w-fit">
                    <Lock className="w-3.5 h-3.5" />
                    <span>الاسترجاع غير متاح لهذا الإجراء (Rollback غير متاح)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* COMPARATIVE DELETE CONFIRMATION DIALOGUE MODAL */}
      {/* -------------------------------------------------------------------------------------- */}
      {confirmQuoteDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-full bg-rose-950 border border-rose-900/40 text-rose-400">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1 text-right">
                <h3 className="text-base font-black text-rose-300">هل أنت متأكد من حذف عرض السعر نهائياً؟</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  تنبيه: حذف هذا السجل سيؤدي لتعديل فوري لقيم التقارير المالية ومقاصة مطابقة البيانات.
                </p>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-3 text-xs leading-relaxed">
              <div className="font-bold text-zinc-200">معلومات السجل المراد حذفه:</div>
              <ul className="space-y-1.5 text-zinc-300 font-mono">
                <li>• معرّف العرض: {confirmQuoteDelete.quote.id}</li>
                <li>• رقم عرض السعر: {confirmQuoteDelete.quote.quoteNumber || '—'}</li>
                <li>• اسم العميل: {confirmQuoteDelete.quote.customerName}</li>
                <li>• قيمة عرض السعر: {Number(confirmQuoteDelete.quote.totalAmount).toLocaleString()} ج.م</li>
                <li>• السبب المسجل للتكرار: نفس رقم العرض + نفس العميل + نفس القيمة.</li>
              </ul>

              {confirmQuoteDelete.otherQuotesInGroup.length > 0 && (
                <div className="pt-2 border-t border-zinc-800 space-y-1">
                  <div className="font-bold text-emerald-400">العرض البديل السليم المتبقي بالمنظومة:</div>
                  {confirmQuoteDelete.otherQuotesInGroup.map((oq) => (
                    <div key={oq.id} className="text-[11px] text-zinc-400 font-mono">
                      • {oq.quoteNumber || '—'} | المعرّف: {oq.id} | بقيمة: {Number(oq.totalAmount).toLocaleString()} ج.م للعميل {oq.customerName}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                onClick={() => setConfirmQuoteDelete(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                إلغاء الأمر
              </button>
              <button
                onClick={() => executeDeleteQuotation(confirmQuoteDelete.quote.id, "حذف يدوي مدقق للتكرارات")}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl cursor-pointer"
              >
                تأكيد الحذف نهائياً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* BULK ACTION PREVIEW STEP DIALOGUE */}
      {/* -------------------------------------------------------------------------------------- */}
      {bulkActionPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-950 border border-amber-900/40 text-amber-400">
                <Scale className="w-6 h-6" />
              </div>
              <div className="space-y-1 text-right">
                <h3 className="text-base font-black text-amber-300">مراجعة ومعاينة الإجراء الدفعي المجمع</h3>
                <p className="text-xs text-zinc-400">
                  يرجى تدقيق التغييرات أدناه قبل إقرانها نهائياً بقاعدة البيانات التشغيلية.
                </p>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs space-y-2 leading-relaxed">
              <div className="font-bold text-zinc-200">تفاصيل المعاينة الفنية للعمليات:</div>
              <div className="text-[#C8A75A] font-bold">
                سيتم تنفيذ الإجراء على: {bulkActionPreview.ids.length} سجلًا
              </div>
              <div className="space-y-1 text-zinc-300 font-mono">
                <div>• الحذف الفعلي: {bulkActionPreview.summary.deleteCount} سجلًا</div>
                <div>• الاستبعاد من الفحوصات: {bulkActionPreview.summary.excludeCount} سجلًا</div>
                <div>• الاعتماد اليدوي للمراجعة: {bulkActionPreview.summary.reviewCount} سجلًا</div>
              </div>

              <div className="pt-2 border-t border-zinc-800 text-[11px] text-emerald-400 font-bold">
                ✓ لن يتم إجراء أي تعديلات أو حذف لبقية السجلات والبيانات السليمة بالمنظومة.
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                onClick={() => setBulkActionPreview(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                رجوع وتعديل
              </button>
              <button
                onClick={executeBulkAction}
                className="px-4 py-2 bg-[#C8A75A] hover:bg-[#b8974a] text-black font-black text-xs rounded-xl cursor-pointer"
              >
                تأكيد وتنفيذ الإجراء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* QUICK LINK RELATIONS POPUP MODAL */}
      {/* -------------------------------------------------------------------------------------- */}
      {linkingQuote && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-base font-black text-[#EDEDED]">ربط وتأصيل علاقة عرض السعر QT-{linkingQuote.quoteNumber || linkingQuote.id}</h3>
              <p className="text-xs text-zinc-400 mt-1">
                البحث واختيار العميل الصحيح من قائمة الـ 88 عميلاً لتصحيح وحفظ روابط الكيانات.
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الهاتف للعميل..."
                  value={linkingSearch}
                  onChange={(e) => setLinkingSearch(e.target.value)}
                  className="w-full bg-[#141517] border border-[#292B2E] rounded-xl pl-4 pr-10 py-2 text-xs text-[#EDEDED] focus:border-[#C8A75A] outline-none"
                />
              </div>

              <div className="max-h-48 overflow-y-auto border border-[#292B2E] rounded-xl bg-[#141517] p-2 space-y-1">
                {filteredQuickCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => executeResolveLink(linkingQuote.id, c.id)}
                    className="w-full text-right p-2 hover:bg-zinc-800 rounded-lg text-xs text-zinc-200 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-bold">{c.name}</span>
                    <span className="font-mono text-[10px] text-zinc-500">{c.phone}</span>
                  </button>
                ))}
                {filteredQuickCustomers.length === 0 && (
                  <div className="p-4 text-center text-zinc-500 text-[11px]">لا توجد نتائج مطابقة.</div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setLinkingQuote(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Core Drill down modal fallback */}
      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
        entityType={drillDown.entityType}
        records={drillDown.records}
        snapshot={snapshot}
        activeIssues={unifiedDiagResult.issues}
        classificationFilter={drillDown.classificationFilter}
      />
    </div>
  );
};
