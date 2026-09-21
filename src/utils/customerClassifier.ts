import { DataSnapshot, DiagnosticIssue } from "./diagnosticEngine";
import { Customer } from "../types";

export type CustomerClassification = 
  | 'healthy'               // Contracted / Healthy
  | 'needs_intervention'    // Needs Intervention
  | 'active_sales_cycle'    // Active Sales Cycle
  | 'no_contract_no_active_cycle' // Inactive / No Sales Cycle
  | 'unclassified';         // Unclassified Fallback

export interface ClassifiedCustomer {
  customer: Customer;
  classification: CustomerClassification;
  contractsCount: number;
  salesCount: number;
  oppsCount: number;
  inquiriesCount: number;
  followupsCount: number;
  quotesCount: number;
  reason: string;
  evidence: {
    contracts: number;
    opportunities: number;
    opportunityStatus?: string;
    lastActivity?: string;
    [key: string]: any;
  };
  suggestedAction: string;
}

export function classifyCustomer(c: Customer, snap: DataSnapshot, activeIssues: DiagnosticIssue[]): ClassifiedCustomer {
  const custContracts = snap.contracts.filter(ct => ct.customerId === c.id && ct.recordStatus !== 'duplicate' && ct.recordStatus !== 'excluded');
  const custSales = snap.sales.filter(s => s.customerId === c.id && s.recordStatus !== 'duplicate' && s.recordStatus !== 'excluded');
  const custOpps = snap.opportunities.filter(o => o.customerId === c.id);
  const custInqs = snap.inquiries.filter(i => i.customerId === c.id);
  const custFollowups = snap.followups.filter(f => f.customerId === c.id);
  const custQuotes = snap.quotations.filter(q => q.customerId === c.id);

  const contractsCount = custContracts.length;
  const salesCount = custSales.length;
  const oppsCount = custOpps.length;
  const inquiriesCount = custInqs.length;
  const followupsCount = custFollowups.length;
  const quotesCount = custQuotes.length;

  // Let's check for "Needs Intervention" first
  let isNeedsIntervention = false;
  const reasons: string[] = [];

  // Check 1: contract expected but missing link
  if (c.stage === 'contracted' && contractsCount === 0) {
    isNeedsIntervention = true;
    reasons.push("العميل بمرحلة 'متعاقد' ولكن لا يوجد عقد مسجل باسمه.");
  }

  // Check 2: Contract exists but has 0 total value
  const zeroValueContracts = custContracts.filter(ct => !ct.totalValue || Number(ct.totalValue) === 0);
  if (zeroValueContracts.length > 0) {
    isNeedsIntervention = true;
    reasons.push(`يوجد عقد مسجل للعميل بدون قيمة مالية (أو قيمته صفر).`);
  }

  // Check 3: Sale exists but not linked to a contract when relation is required
  const orphanSales = custSales.filter(s => !s.contractId);
  if (orphanSales.length > 0) {
    isNeedsIntervention = true;
    reasons.push(`توجد مبيعات مسجلة للعميل غير مرتبطة بعقد.`);
  }

  // Check 4: financial mismatch (payments exceed contract value)
  custContracts.forEach(ct => {
    const payments = snap.payments.filter(p => p.contractId === ct.id && p.recordStatus !== 'duplicate' && p.recordStatus !== 'excluded');
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const contractVal = Number(ct.totalValue) || 0;
    if (contractVal > 0 && totalPaid > contractVal + 10) {
      isNeedsIntervention = true;
      reasons.push(`التحصيلات للعقد ${ct.contractNumber} (${totalPaid.toLocaleString()} ج.م) تتجاوز القيمة المالية للعقد (${contractVal.toLocaleString()} ج.م).`);
    }
  });

  // Check 5: any active diagnostic issue linked to this customer
  const relatedIssues = activeIssues.filter(issue => issue.recordId === c.id || (issue.evidence && (issue.evidence.customerId === c.id || issue.evidence.referencedId === c.id)));
  if (relatedIssues.length > 0) {
    isNeedsIntervention = true;
    relatedIssues.forEach(issue => reasons.push(issue.reason));
  }

  if (isNeedsIntervention) {
    return {
      customer: c,
      classification: 'needs_intervention',
      contractsCount,
      salesCount,
      oppsCount,
      inquiriesCount,
      followupsCount,
      quotesCount,
      reason: reasons.join(" | "),
      evidence: {
        contracts: contractsCount,
        opportunities: oppsCount,
        opportunityStatus: custOpps[0]?.status || 'Open',
        lastActivity: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : undefined,
        issuesCount: relatedIssues.length
      },
      suggestedAction: "تحديث روابط السجل أو القيم المالية للعميل وإقراره يدوياً في مركز المراجعة."
    };
  }

  // Next, if customer has a contract and is clean -> Contracted / Healthy
  if (contractsCount > 0) {
    return {
      customer: c,
      classification: 'healthy',
      contractsCount,
      salesCount,
      oppsCount,
      inquiriesCount,
      followupsCount,
      quotesCount,
      reason: "مسار العميل سليم وصحي تماماً؛ عقد صالح وقيم مالية مطابقة.",
      evidence: {
        contracts: contractsCount,
        opportunities: oppsCount,
        opportunityStatus: custOpps[0]?.status,
        lastActivity: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : undefined
      },
      suggestedAction: "لا يوجد إجراء مطلوب."
    };
  }

  // Next, if customer has NO contract but has an active sales cycle -> Active Sales Cycle
  const hasActiveSalesCycle = 
    custOpps.some(o => o.status === 'open' || o.stage === 'negotiation') || 
    c.stage === 'negotiation' || 
    inquiriesCount > 0 || 
    followupsCount > 0 || 
    quotesCount > 0;

  if (hasActiveSalesCycle) {
    const oppStatus = custOpps.find(o => o.status === 'open')?.status || 'Open';
    return {
      customer: c,
      classification: 'active_sales_cycle',
      contractsCount,
      salesCount,
      oppsCount,
      inquiriesCount,
      followupsCount,
      quotesCount,
      reason: "عميل بدون عقد ولكن لديه دورة بيع نشطة (فرصة بيعية مفتوحة أو متابعة أو عرض سعر نشط).",
      evidence: {
        contracts: contractsCount,
        opportunities: oppsCount,
        opportunityStatus: oppStatus,
        lastActivity: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : undefined,
        quotations: quotesCount,
        inquiries: inquiriesCount
      },
      suggestedAction: "متابعة الفرصة والعمل على إنهاء التفاوض لتوقيع العقد."
    };
  }

  // Next, if customer has NO contract and NO active sales cycle -> Inactive / No Sales Cycle
  // We classify them as 'no_contract_no_active_cycle'
  const isNoActivity = contractsCount === 0 && !hasActiveSalesCycle;
  if (isNoActivity) {
    return {
      customer: c,
      classification: 'no_contract_no_active_cycle',
      contractsCount,
      salesCount,
      oppsCount,
      inquiriesCount,
      followupsCount,
      quotesCount,
      reason: "عميل مسجل ولكن لا يوجد له عقد مبرم ولا أي نشاط بيع أو فرص نشطة.",
      evidence: {
        contracts: contractsCount,
        opportunities: oppsCount,
        lastActivity: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : undefined
      },
      suggestedAction: "تنشيط العميل بفرصة بيع جديدة أو أرشفته."
    };
  }

  // Fallback for extreme cases
  return {
    customer: c,
    classification: 'unclassified',
    contractsCount,
    salesCount,
    oppsCount,
    inquiriesCount,
    followupsCount,
    quotesCount,
    reason: "لم يتم تحديد تصنيف العميل من جودة البيانات الحالية.",
    evidence: {
      contracts: contractsCount,
      opportunities: oppsCount,
      lastActivity: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : undefined
    },
    suggestedAction: "مراجعة جودة بيانات العميل للتصنيف يدوياً."
  };
}
