import { 
  Customer, 
  FollowUp, 
  Quotation, 
  Contract, 
  Opportunity, 
  Sale, 
  Payment, 
  Company, 
  Inquiry, 
  Interaction 
} from "../types";

export interface DiagnosticIssue {
  id: string;
  ruleId: string;
  entityType: string;
  recordId: string;
  companyId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'RELATIONSHIP' | 'TENANT_ISOLATION' | 'FINANCIAL' | 'DUPLICATE' | 'DATA_QUALITY' | 'BUSINESS_STATE' | 'MISSING_REFERENCE' | 'RECONCILIATION';
  status: 'Open' | 'Resolved' | 'Ignored' | 'Excluded' | 'ManualReview' | 'Blocked';
  reason: string;
  evidence: {
    field?: string;
    value?: any;
    referencedEntity?: string;
    referencedId?: string;
    exists?: boolean;
    companyIdMismatch?: boolean;
    [key: string]: any;
  };
  relatedRecords?: any[];
  suggestedAction: 'NO_ACTION' | 'REVIEW' | 'LINK' | 'FIX' | 'EXCLUDE' | 'IGNORE';
  detectedAt: string;
  source: string;
  fingerprint: string;
}

export interface DataSnapshot {
  snapshotId: string;
  generatedAt: string;
  source: string;
  companyScope: string;
  recordCounts: {
    companies: number;
    customers: number;
    inquiries: number;
    opportunities: number;
    followups: number;
    quotations: number;
    contracts: number;
    sales: number;
    payments: number;
  };
  companies: Company[];
  customers: Customer[];
  inquiries: Inquiry[];
  opportunities: Opportunity[];
  followups: FollowUp[];
  quotations: Quotation[];
  contracts: Contract[];
  sales: Sale[];
  payments: Payment[];
}

export type ReconciliationResultStatus = 'PASS' | 'FAIL' | 'PARTIAL' | 'BLOCKED' | 'NOT_APPLICABLE';

export interface ReconciliationResult {
  source: string;
  target: string;
  joinKey: string;
  scope: string;
  expectedCardinality: string;
  actualCardinality: string;
  status: ReconciliationResultStatus;
  recordsChecked: number;
  recordsPassed: number;
  recordsFailed: number;
  details?: string;
}

export interface DiagnosticReport {
  scanId: string;
  timestamp: string;
  source: string;
  companiesScope: string;
  recordsScanned: number;
  rulesExecuted: number;
  issues: DiagnosticIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  byEntity: Record<string, number>;
  byCategory: Record<string, number>;
  byRule: Record<string, number>;
  reconciliations: ReconciliationResult[];
}

// 1. Selector Registry
export const SelectorRegistry = {
  customers: {
    all: (snap: DataSnapshot) => snap.customers,
    active: (snap: DataSnapshot) => snap.customers.filter(c => c.stage !== 'duplicate'),
    contracted: (snap: DataSnapshot) => {
      const contractedIds = new Set(snap.contracts.map(c => c.customerId).filter(Boolean));
      return snap.customers.filter(c => contractedIds.has(c.id));
    },
    withoutContract: (snap: DataSnapshot) => {
      const contractedIds = new Set(snap.contracts.map(c => c.customerId).filter(Boolean));
      return snap.customers.filter(c => !contractedIds.has(c.id));
    }
  },
  contracts: {
    all: (snap: DataSnapshot) => snap.contracts,
    valid: (snap: DataSnapshot) => snap.contracts.filter(c => c.recordStatus !== 'duplicate' && c.recordStatus !== 'excluded' && c.totalValue && c.totalValue > 0),
    orphan: (snap: DataSnapshot) => {
      const customerIds = new Set(snap.customers.map(c => c.id));
      return snap.contracts.filter(c => !c.customerId || !customerIds.has(c.customerId));
    },
    duplicate: (snap: DataSnapshot) => snap.contracts.filter(c => c.recordStatus === 'duplicate')
  },
  sales: {
    all: (snap: DataSnapshot) => snap.sales,
    linkedToContract: (snap: DataSnapshot) => {
      const contractIds = new Set(snap.contracts.map(c => c.id));
      return snap.sales.filter(s => s.contractId && contractIds.has(s.contractId));
    },
    orphan: (snap: DataSnapshot) => {
      const contractIds = new Set(snap.contracts.map(c => c.id));
      return snap.sales.filter(s => !s.contractId || !contractIds.has(s.contractId));
    }
  },
  payments: {
    all: (snap: DataSnapshot) => snap.payments,
    linkedToContract: (snap: DataSnapshot) => {
      const contractIds = new Set(snap.contracts.map(c => c.id));
      return snap.payments.filter(p => p.contractId && contractIds.has(p.contractId));
    },
    orphan: (snap: DataSnapshot) => {
      const contractIds = new Set(snap.contracts.map(c => c.id));
      return snap.payments.filter(p => !p.contractId || !contractIds.has(p.contractId));
    }
  },
  quotations: {
    all: (snap: DataSnapshot) => snap.quotations,
    linkedToCustomer: (snap: DataSnapshot) => {
      const customerIds = new Set(snap.customers.map(c => c.id));
      return snap.quotations.filter(q => q.customerId && customerIds.has(q.customerId));
    },
    linkedToOpportunity: (snap: DataSnapshot) => {
      const oppIds = new Set(snap.opportunities.map(o => o.id));
      return snap.quotations.filter(q => q.opportunityId && oppIds.has(q.opportunityId));
    },
    duplicates: (snap: DataSnapshot) => {
      const seen = new Map<string, string>();
      const duplicates: Quotation[] = [];
      snap.quotations.forEach(q => {
        const key = `${q.companyId}_${q.customerId || 'nocust'}_${q.totalAmount || 0}_${q.quoteNumber || 'nonum'}`;
        if (seen.has(key)) {
          duplicates.push(q);
        } else {
          seen.set(key, q.id);
        }
      });
      return duplicates;
    }
  }
};

// 2. Relationship Registry
export const RelationshipRegistry = {
  validate: (
    sourceEntity: any,
    targetId: string,
    targetEntityName: string,
    snap: DataSnapshot,
    isRequired: boolean = true
  ): { isValid: boolean; errorType?: 'MISSING' | 'TENANT_MISMATCH' | 'DELETED'; errorMsg?: string } => {
    if (!targetId) {
      if (isRequired) {
        return { isValid: false, errorType: 'MISSING', errorMsg: `حقل الربط بـ ${targetEntityName} مفقود.` };
      }
      return { isValid: true };
    }

    let targetRecord: any = null;
    if (targetEntityName === 'Customer') {
      targetRecord = snap.customers.find(c => c.id === targetId);
    } else if (targetEntityName === 'Contract') {
      targetRecord = snap.contracts.find(c => c.id === targetId);
    } else if (targetEntityName === 'Opportunity') {
      targetRecord = snap.opportunities.find(o => o.id === targetId);
    }

    if (!targetRecord) {
      return { isValid: false, errorType: 'MISSING', errorMsg: `السجل المرتبط بـ ${targetEntityName} (${targetId}) غير موجود.` };
    }

    // Check Tenant Isolation
    if (sourceEntity.companyId && targetRecord.companyId && sourceEntity.companyId !== targetRecord.companyId) {
      return { 
        isValid: false, 
        errorType: 'TENANT_MISMATCH', 
        errorMsg: `تعارض عزل الشركاء (Cross-Company): السجل يتبع للشركة ${sourceEntity.companyId} بينما السجل المرتبط يتبع للشركة ${targetRecord.companyId}.` 
      };
    }

    if (targetRecord.recordStatus === 'excluded') {
      return { isValid: false, errorType: 'DELETED', errorMsg: `السجل المرتبط بـ ${targetEntityName} تم استبعاده.` };
    }

    return { isValid: true };
  }
};

// 3. Rule Registry & Severity Resolver
export interface DiagnosticRule {
  ruleId: string;
  name: string;
  description: string;
  entity: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'RELATIONSHIP' | 'TENANT_ISOLATION' | 'FINANCIAL' | 'DUPLICATE' | 'DATA_QUALITY' | 'BUSINESS_STATE' | 'MISSING_REFERENCE' | 'RECONCILIATION';
  validate: (snap: DataSnapshot) => DiagnosticIssue[];
}

export const RuleRegistry: DiagnosticRule[] = [
  {
    ruleId: 'TENANT-CROSS-COMPANY-001',
    name: 'تداخل عزل الشركاء (Cross-Company Isolation Conflict)',
    description: 'التحقق من عدم وجود أي علاقة عابرة للشركات والشركاء المختلفين.',
    entity: 'All',
    severity: 'CRITICAL',
    category: 'TENANT_ISOLATION',
    validate: (snap: DataSnapshot) => {
      const issues: DiagnosticIssue[] = [];
      
      // Check Contracts
      snap.contracts.forEach(c => {
        if (c.customerId) {
          const cust = snap.customers.find(cu => cu.id === c.customerId);
          if (cust && c.companyId !== cust.companyId) {
            issues.push(buildIssue('TENANT-CROSS-COMPANY-001', 'Contract', c.id, c.companyId, 'CRITICAL',
              `العقد (${c.contractNumber}) يتبع للشركة ${c.companyId} بينما العميل المرتبط يتبع للشركة ${cust.companyId}`,
              { field: 'customerId', value: c.customerId, referencedEntity: 'Customer', referencedId: c.customerId, companyIdMismatch: true },
              'EXCLUDE'
            ));
          }
        }
      });

      // Check Sales
      snap.sales.forEach(s => {
        if (s.contractId) {
          const ctr = snap.contracts.find(c => c.id === s.contractId);
          if (ctr && s.companyId !== ctr.companyId) {
            issues.push(buildIssue('TENANT-CROSS-COMPANY-001', 'Sale', s.id, s.companyId, 'CRITICAL',
              `المبيعة تتبع للشركة ${s.companyId} بينما العقد المرتبط يتبع للشركة ${ctr.companyId}`,
              { field: 'contractId', value: s.contractId, referencedEntity: 'Contract', referencedId: s.contractId, companyIdMismatch: true },
              'EXCLUDE'
            ));
          }
        }
      });

      return issues;
    }
  },
  {
    ruleId: 'REL-CONTRACT-CUSTOMER-001',
    name: 'عقد بدون عميل صالح (Contract must reference valid Customer)',
    description: 'التحقق من ارتباط العقد بعميل مسجل وصحيح.',
    entity: 'Contract',
    severity: 'HIGH',
    category: 'RELATIONSHIP',
    validate: (snap: DataSnapshot) => {
      const issues: DiagnosticIssue[] = [];
      snap.contracts.forEach(c => {
        const val = RelationshipRegistry.validate(c, c.customerId || '', 'Customer', snap, true);
        if (!val.isValid) {
          issues.push(buildIssue('REL-CONTRACT-CUSTOMER-001', 'Contract', c.id, c.companyId, 'HIGH',
            `العقد (${c.contractNumber || 'غير محدد'}) غير مرتبط بعميل صالح: ${val.errorMsg}`,
            { field: 'customerId', value: c.customerId, exists: false, errorType: val.errorType },
            'LINK'
          ));
        }
      });
      return issues;
    }
  },
  {
    ruleId: 'REL-SALE-CONTRACT-001',
    name: 'مبيعات بدون عقد صالح (Sale without valid Contract)',
    description: 'التحقق من ارتباط المبيعات بعقد مسجل وصحيح.',
    entity: 'Sale',
    severity: 'HIGH',
    category: 'RELATIONSHIP',
    validate: (snap: DataSnapshot) => {
      const issues: DiagnosticIssue[] = [];
      snap.sales.forEach(s => {
        if (s.contractId) {
          const val = RelationshipRegistry.validate(s, s.contractId, 'Contract', snap, true);
          if (!val.isValid) {
            issues.push(buildIssue('REL-SALE-CONTRACT-001', 'Sale', s.id, s.companyId, 'HIGH',
              `سجل مبيعات مرتبط بعقد غير صالح: ${val.errorMsg}`,
              { field: 'contractId', value: s.contractId, exists: false, errorType: val.errorType },
              'LINK'
            ));
          }
        }
      });
      return issues;
    }
  },
  {
    ruleId: 'REL-PAYMENT-CONTRACT-001',
    name: 'مدفوعات بدون عقد صالح (Payment without valid Contract)',
    description: 'التحقق من ارتباط المدفوعات والتحصيلات بعقد مبرم وصالح.',
    entity: 'Payment',
    severity: 'HIGH',
    category: 'RELATIONSHIP',
    validate: (snap: DataSnapshot) => {
      const issues: DiagnosticIssue[] = [];
      snap.payments.forEach(p => {
        if (p.contractId) {
          const val = RelationshipRegistry.validate(p, p.contractId, 'Contract', snap, true);
          if (!val.isValid) {
            issues.push(buildIssue('REL-PAYMENT-CONTRACT-001', 'Payment', p.id, p.companyId, 'HIGH',
              `دفعة مالية مرتبطة بعقد غير صالح: ${val.errorMsg}`,
              { field: 'contractId', value: p.contractId, exists: false, errorType: val.errorType },
              'LINK'
            ));
          }
        }
      });
      return issues;
    }
  },
  {
    ruleId: 'FIN-PAYMENT-EXCEEDS-CONTRACT-001',
    name: 'المدفوعات تتجاوز القيمة التعاقدية (Payments exceeds Contract Value)',
    description: 'التحقق من عدم تجاوز إجمالي المبالغ المحصلة للقيمة الإجمالية للعقد المبرم.',
    entity: 'Contract',
    severity: 'HIGH',
    category: 'FINANCIAL',
    validate: (snap: DataSnapshot) => {
      const issues: DiagnosticIssue[] = [];
      snap.contracts.forEach(c => {
        if (c.recordStatus === 'duplicate' || c.recordStatus === 'excluded') return;
        const linkedPayments = snap.payments.filter(p => p.contractId === c.id && p.recordStatus !== 'duplicate' && p.recordStatus !== 'excluded');
        const totalPaid = linkedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const contractVal = Number(c.totalValue) || 0;
        if (contractVal > 0 && totalPaid > contractVal + 10) { // small buffer for floating precision
          issues.push(buildIssue('FIN-PAYMENT-EXCEEDS-CONTRACT-001', 'Contract', c.id, c.companyId, 'HIGH',
            `تنبيه مالي: التحصيلات المحققة للعقد (${totalPaid.toLocaleString()} ج.م) تتجاوز القيمة المالية المسجلة له (${contractVal.toLocaleString()} ج.م).`,
            { totalPaid, contractValue: contractVal, excess: totalPaid - contractVal },
            'REVIEW'
          ));
        }
      });
      return issues;
    }
  },
  {
    ruleId: 'OPP-CUSTOMER-001',
    name: 'فرصة بيعية بدون عميل صالح (Opportunity without valid Customer)',
    description: 'التحقق من ارتباط الفرص البيعية بعميل مسجل وصحيح.',
    entity: 'Opportunity',
    severity: 'HIGH',
    category: 'RELATIONSHIP',
    validate: (snap: DataSnapshot) => {
      const issues: DiagnosticIssue[] = [];
      snap.opportunities.forEach(o => {
        const val = RelationshipRegistry.validate(o, o.customerId || '', 'Customer', snap, true);
        if (!val.isValid) {
          issues.push(buildIssue('OPP-CUSTOMER-001', 'Opportunity', o.id, o.companyId, 'HIGH',
            `فرصة بيعية غير مرتبطة بعميل صالح: ${val.errorMsg}`,
            { field: 'customerId', value: o.customerId, exists: false, errorType: val.errorType },
            'LINK'
          ));
        }
      });
      return issues;
    }
  },
  {
    ruleId: 'QUOTE-CUSTOMER-001',
    name: 'عرض سعر بدون عميل صالح (Quotation without valid Customer)',
    description: 'التحقق من ارتباط عروض الأسعار بعميل مسجل وصحيح.',
    entity: 'Quotation',
    severity: 'HIGH',
    category: 'RELATIONSHIP',
    validate: (snap: DataSnapshot) => {
      const issues: DiagnosticIssue[] = [];
      snap.quotations.forEach(q => {
        const val = RelationshipRegistry.validate(q, q.customerId || '', 'Customer', snap, true);
        if (!val.isValid) {
          issues.push(buildIssue('QUOTE-CUSTOMER-001', 'Quotation', q.id, q.companyId, 'HIGH',
            `عرض سعر غير مرتبط بعميل صالح: ${val.errorMsg}`,
            { field: 'customerId', value: q.customerId, exists: false, errorType: val.errorType },
            'LINK'
          ));
        }
      });
      return issues;
    }
  },
  {
    ruleId: 'DUP-QUOTE-001',
    name: 'عرض سعر مكرر محتمل (Potential Duplicate Quotation)',
    description: 'التحقق من عروض الأسعار التي تحتوي على نفس الرقم والمبلغ لنفس الشريك.',
    entity: 'Quotation',
    severity: 'MEDIUM',
    category: 'DUPLICATE',
    validate: (snap: DataSnapshot) => {
      const issues: DiagnosticIssue[] = [];
      const seen = new Map<string, string[]>();
      
      snap.quotations.forEach(q => {
        const key = `${q.companyId}_${q.customerId || 'nocust'}_${q.totalAmount || 0}_${(q.quoteNumber || '').trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.set(key, []);
        }
        seen.get(key)!.push(q.id);
      });

      seen.forEach((ids, key) => {
        if (ids.length > 1) {
          ids.slice(1).forEach(dupId => {
            issues.push(buildIssue('DUP-QUOTE-001', 'Quotation', dupId, snap.quotations.find(q=>q.id===dupId)!.companyId, 'MEDIUM',
              `عرض سعر مكرر محتمل: يتشابه بالكامل مع العرض المستند ${ids[0]} لنفس العميل والمبلغ والرقم.`,
              { matchedWithIds: ids.filter(i => i !== dupId) },
              'IGNORE'
            ));
          });
        }
      });

      return issues;
    }
  },
  {
    ruleId: 'CUSTOMER-CONTRACT-CONTEXT-001',
    name: 'التحقق من مرحلة العميل والتعاقد الفعلي (Customer Contract Context Verification)',
    description: 'التحقق من التناسق الهيكلي بين مرحلة العميل ووجود عقد مسجل فعلي له.',
    entity: 'Customer',
    severity: 'INFO',
    category: 'BUSINESS_STATE',
    validate: (snap: DataSnapshot) => {
      const issues: DiagnosticIssue[] = [];
      snap.customers.forEach(c => {
        if (c.stage === 'duplicate') return;
        const contractsCount = snap.contracts.filter(ct => ct.customerId === c.id && ct.recordStatus !== 'duplicate' && ct.recordStatus !== 'excluded').length;
        
        if (c.stage === 'contracted' && contractsCount === 0) {
          issues.push(buildIssue('CUSTOMER-CONTRACT-CONTEXT-001', 'Customer', c.id, c.companyId, 'MEDIUM',
            `العميل مسجل بمرحلة "متعاقد" ولكن لا يوجد أي عقد مسجل له في السحابة.`,
            { stage: c.stage, contractsCount },
            'REVIEW'
          ));
        } else if (contractsCount > 0 && c.stage !== 'contracted' && c.stage !== 'won' && c.stage !== 'sold') {
          issues.push(buildIssue('CUSTOMER-CONTRACT-CONTEXT-001', 'Customer', c.id, c.companyId, 'INFO',
            `العميل لديه عقود مسجلة بالفعل (${contractsCount}) ولكن مرحلته الحالية هي "${c.stage}".`,
            { stage: c.stage, contractsCount },
            'NO_ACTION'
          ));
        }
      });
      return issues;
    }
  }
];

// Helper to construct Issue Model
function buildIssue(
  ruleId: string,
  entityType: string,
  recordId: string,
  companyId: string,
  severity: DiagnosticIssue['severity'],
  reason: string,
  evidence: any,
  suggestedAction: DiagnosticIssue['suggestedAction']
): DiagnosticIssue {
  const detectedAt = new Date().toISOString();
  const fingerprint = `${ruleId}|${entityType}|${recordId}|${companyId}`;
  const id = `ISS-${ruleId.replace('REL-', '').replace('FIN-', '').substring(0, 8)}-${recordId.substring(0, 8)}`;
  
  let category: DiagnosticIssue['category'] = 'DATA_QUALITY';
  if (ruleId.startsWith('REL-')) category = 'RELATIONSHIP';
  else if (ruleId.startsWith('TENANT-')) category = 'TENANT_ISOLATION';
  else if (ruleId.startsWith('FIN-')) category = 'FINANCIAL';
  else if (ruleId.startsWith('DUP-')) category = 'DUPLICATE';
  else if (ruleId.startsWith('CUSTOMER-')) category = 'BUSINESS_STATE';

  return {
    id,
    ruleId,
    entityType,
    recordId,
    companyId,
    severity,
    category,
    status: 'Open',
    reason,
    evidence,
    suggestedAction,
    detectedAt,
    source: 'DiagnosticEngine',
    fingerprint
  };
}

// 4. Reconciliation Engine
export const ReconciliationEngine = {
  reconcileContractCustomer: (snap: DataSnapshot): ReconciliationResult => {
    const contractsList = SelectorRegistry.contracts.all(snap);
    const validContracts = SelectorRegistry.contracts.valid(snap);
    const customerIds = new Set(snap.customers.map(c => c.id));
    
    let checked = validContracts.length;
    let passed = 0;
    let failed = 0;

    validContracts.forEach(c => {
      if (c.customerId && customerIds.has(c.customerId)) {
        passed++;
      } else {
        failed++;
      }
    });

    const status: ReconciliationResultStatus = failed === 0 ? 'PASS' : 'PARTIAL';

    return {
      source: 'Contract',
      target: 'Customer',
      joinKey: 'customerId',
      scope: 'Active Valid Contracts',
      expectedCardinality: 'MANY_TO_ONE',
      actualCardinality: `Contracts: ${contractsList.length} ↔ Customers: ${snap.customers.length}`,
      status,
      recordsChecked: checked,
      recordsPassed: passed,
      recordsFailed: failed,
      details: `تم فحص جميع العقود الصالحة والنشطة والتأكد من مطابقة وارتباط كل عقد بملف عميل حقيقي وسليم.`
    };
  },

  reconcileSaleContract: (snap: DataSnapshot): ReconciliationResult => {
    const salesList = SelectorRegistry.sales.all(snap);
    const contractIds = new Set(snap.contracts.map(c => c.id));

    let checked = salesList.length;
    let passed = 0;
    let failed = 0;

    salesList.forEach(s => {
      if (!s.contractId || contractIds.has(s.contractId)) {
        passed++;
      } else {
        failed++;
      }
    });

    const status: ReconciliationResultStatus = failed === 0 ? 'PASS' : 'FAIL';

    return {
      source: 'Sale',
      target: 'Contract',
      joinKey: 'contractId',
      scope: 'All Sales Records',
      expectedCardinality: 'MANY_TO_ONE',
      actualCardinality: `Sales: ${salesList.length} ↔ Contracts: ${snap.contracts.length}`,
      status,
      recordsChecked: checked,
      recordsPassed: passed,
      recordsFailed: failed,
      details: `مقارنة ومطابقة حركات فواتير المبيعات مع التعاقدات المالية الصادرة ومراجعة الروابط.`
    };
  },

  reconcilePaymentContract: (snap: DataSnapshot): ReconciliationResult => {
    const paymentsList = SelectorRegistry.payments.all(snap);
    const contractIds = new Set(snap.contracts.map(c => c.id));

    let checked = paymentsList.length;
    let passed = 0;
    let failed = 0;

    paymentsList.forEach(p => {
      if (!p.contractId || contractIds.has(p.contractId)) {
        passed++;
      } else {
        failed++;
      }
    });

    const status: ReconciliationResultStatus = failed === 0 ? 'PASS' : 'FAIL';

    return {
      source: 'Payment',
      target: 'Contract',
      joinKey: 'contractId',
      scope: 'All Collections / Payments',
      expectedCardinality: 'MANY_TO_ONE',
      actualCardinality: `Payments: ${paymentsList.length} ↔ Contracts: ${snap.contracts.length}`,
      status,
      recordsChecked: checked,
      recordsPassed: passed,
      recordsFailed: failed,
      details: `التحقق والتحليل المالي المباشر للمدفوعات الفعلية المحصلة ومطابقتها على العقود النشطة.`
    };
  },

  reconcileQuotationCustomer: (snap: DataSnapshot): ReconciliationResult => {
    const quotesList = SelectorRegistry.quotations.all(snap);
    const customerIds = new Set(snap.customers.map(c => c.id));

    let checked = quotesList.length;
    let passed = 0;
    let failed = 0;

    quotesList.forEach(q => {
      if (q.customerId && customerIds.has(q.customerId)) {
        passed++;
      } else {
        failed++;
      }
    });

    const status: ReconciliationResultStatus = failed === 0 ? 'PASS' : 'PARTIAL';

    return {
      source: 'Quotation',
      target: 'Customer',
      joinKey: 'customerId',
      scope: 'All Quotations',
      expectedCardinality: 'MANY_TO_ONE',
      actualCardinality: `Quotations: ${quotesList.length} ↔ Customers: ${snap.customers.length}`,
      status,
      recordsChecked: checked,
      recordsPassed: passed,
      recordsFailed: failed,
      details: `حصر وتصنيف عروض الأسعار الإجمالية وربطها بسجلات العملاء للتخلص من العروض المعزولة.`
    };
  }
};

// 5. Core Diagnostic Engine Class
export class DiagnosticEngine {
  public static run(snap: DataSnapshot): DiagnosticReport {
    let allIssues: DiagnosticIssue[] = [];
    let rulesCount = 0;

    // Run each registered Rule
    RuleRegistry.forEach(rule => {
      try {
        const ruleIssues = rule.validate(snap);
        allIssues = [...allIssues, ...ruleIssues];
        rulesCount++;
      } catch (err) {
        console.error(`Rule ${rule.ruleId} failed:`, err);
      }
    });

    // Deduplication Layer using fingerprint lookup
    const seenFingerprints = new Set<string>();
    const deduplicatedIssues = allIssues.filter(issue => {
      if (seenFingerprints.has(issue.fingerprint)) {
        return false;
      }
      seenFingerprints.add(issue.fingerprint);
      return true;
    });

    // Summary counts
    const critical = deduplicatedIssues.filter(i => i.severity === 'CRITICAL').length;
    const high = deduplicatedIssues.filter(i => i.severity === 'HIGH').length;
    const medium = deduplicatedIssues.filter(i => i.severity === 'MEDIUM').length;
    const low = deduplicatedIssues.filter(i => i.severity === 'LOW').length;
    const info = deduplicatedIssues.filter(i => i.severity === 'INFO').length;

    // By Entity, Category, Rule
    const byEntity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byRule: Record<string, number> = {};

    deduplicatedIssues.forEach(issue => {
      byEntity[issue.entityType] = (byEntity[issue.entityType] || 0) + 1;
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      byRule[issue.ruleId] = (byRule[issue.ruleId] || 0) + 1;
    });

    // Run Reconciliations
    const reconciliations = [
      ReconciliationEngine.reconcileContractCustomer(snap),
      ReconciliationEngine.reconcileSaleContract(snap),
      ReconciliationEngine.reconcilePaymentContract(snap),
      ReconciliationEngine.reconcileQuotationCustomer(snap)
    ];

    const recordsScanned = snap.companies.length + 
                           snap.customers.length + 
                           snap.inquiries.length + 
                           snap.opportunities.length + 
                           snap.followups.length + 
                           snap.quotations.length + 
                           snap.contracts.length + 
                           snap.sales.length + 
                           snap.payments.length;

    return {
      scanId: `DIAG-${new Date().toISOString().replace(/[-:T]/g, '').substring(0, 15)}`,
      timestamp: new Date().toISOString(),
      source: snap.source,
      companiesScope: snap.companyScope,
      recordsScanned,
      rulesExecuted: rulesCount,
      issues: deduplicatedIssues,
      summary: { critical, high, medium, low, info },
      byEntity,
      byCategory,
      byRule,
      reconciliations
    };
  }

  public static runDiagnosticScan(snapshot: any): {
    issues: DiagnosticIssue[];
    reconciliations: ReconciliationResult[];
    report: {
      scanId: string;
      timestamp: string;
      source: string;
      companiesScope: string;
      recordsScanned: number;
      rulesExecuted: number;
      summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
      };
      byEntity: Record<string, number>;
      byCategory: Record<string, number>;
      byRule: Record<string, number>;
      reconciliationResults: Record<string, {
        result: ReconciliationResultStatus;
        recordsScanned: number;
        recordsPassed: number;
        recordsFailed: number;
        source: string;
        target: string;
        joinKey: string;
        scope: string;
        expectedCardinality: string;
        actualCardinality: string;
        details?: string;
      }>;
    };
  } {
    const fullSnap: DataSnapshot = {
      snapshotId: `SNAP-${new Date().getTime()}`,
      generatedAt: new Date().toISOString(),
      source: snapshot.source || 'AppContext',
      companyScope: snapshot.companyScope || 'all-authorized-companies',
      companies: snapshot.companies || [],
      customers: snapshot.customers || [],
      inquiries: snapshot.inquiries || [],
      opportunities: snapshot.opportunities || [],
      followups: snapshot.followups || [],
      quotations: snapshot.quotations || [],
      contracts: snapshot.contracts || [],
      sales: snapshot.sales || [],
      payments: snapshot.payments || [],
      recordCounts: {
        companies: (snapshot.companies || []).length,
        customers: (snapshot.customers || []).length,
        inquiries: (snapshot.inquiries || []).length,
        opportunities: (snapshot.opportunities || []).length,
        followups: (snapshot.followups || []).length,
        quotations: (snapshot.quotations || []).length,
        contracts: (snapshot.contracts || []).length,
        sales: (snapshot.sales || []).length,
        payments: (snapshot.payments || []).length,
      }
    };

    const report = this.run(fullSnap);
    const r1 = ReconciliationEngine.reconcileContractCustomer(fullSnap);
    const r2 = ReconciliationEngine.reconcileSaleContract(fullSnap);
    const r3 = ReconciliationEngine.reconcilePaymentContract(fullSnap);
    const r4 = ReconciliationEngine.reconcileQuotationCustomer(fullSnap);

    const reconciliationResults = {
      "العقد ↔ العميل": {
        result: r1.status,
        recordsScanned: r1.recordsChecked,
        recordsPassed: r1.recordsPassed,
        recordsFailed: r1.recordsFailed,
        source: r1.source,
        target: r1.target,
        joinKey: r1.joinKey,
        scope: r1.scope,
        expectedCardinality: r1.expectedCardinality,
        actualCardinality: r1.actualCardinality,
        details: r1.details
      },
      "البيع ↔ العقد": {
        result: r2.status,
        recordsScanned: r2.recordsChecked,
        recordsPassed: r2.recordsPassed,
        recordsFailed: r2.recordsFailed,
        source: r2.source,
        target: r2.target,
        joinKey: r2.joinKey,
        scope: r2.scope,
        expectedCardinality: r2.expectedCardinality,
        actualCardinality: r2.actualCardinality,
        details: r2.details
      },
      "الدفع ↔ العقد": {
        result: r3.status,
        recordsScanned: r3.recordsChecked,
        recordsPassed: r3.recordsPassed,
        recordsFailed: r3.recordsFailed,
        source: r3.source,
        target: r3.target,
        joinKey: r3.joinKey,
        scope: r3.scope,
        expectedCardinality: r3.expectedCardinality,
        actualCardinality: r3.actualCardinality,
        details: r3.details
      },
      "العرض ↔ العميل": {
        result: r4.status,
        recordsScanned: r4.recordsChecked,
        recordsPassed: r4.recordsPassed,
        recordsFailed: r4.recordsFailed,
        source: r4.source,
        target: r4.target,
        joinKey: r4.joinKey,
        scope: r4.scope,
        expectedCardinality: r4.expectedCardinality,
        actualCardinality: r4.actualCardinality,
        details: r4.details
      }
    };

    return {
      issues: report.issues,
      reconciliations: report.reconciliations,
      report: {
        scanId: report.scanId,
        timestamp: report.timestamp,
        source: report.source,
        companiesScope: report.companiesScope,
        recordsScanned: report.recordsScanned,
        rulesExecuted: report.rulesExecuted,
        summary: report.summary,
        byEntity: report.byEntity,
        byCategory: report.byCategory,
        byRule: report.byRule,
        reconciliationResults
      }
    };
  }
}
