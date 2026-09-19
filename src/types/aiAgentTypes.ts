import { CompanyId, CustomerStage, InterestLevel, PriorityLevel } from "./index";

export type AIMode = "ask" | "check" | "act" | "guardian";
export type AIAgentMode = AIMode;

export type AIActionRiskLevel = "read" | "safe_write" | "restricted_write";

export type AIActionType =
  | "create_followup"
  | "create_customer"
  | "create_inquiry"
  | "create_quotation"
  | "update_customer_stage"
  | "update_inquiry_stage"
  | "assign_responsible"
  | "move_company"
  | "batch_update_status"
  | "batch_assign_responsible"
  | "batch_move_company"
  | "batch_delete"
  | "delete_record"
  | "resolve_incident"
  | "sync_data"
  | "clean_duplicates"
  | "custom";

export interface AIActionProposal {
  id: string;
  type: AIActionType;
  riskLevel: AIActionRiskLevel;
  title: string;
  description: string;
  targetCompanyId?: CompanyId;
  targetEntity: "customer" | "inquiry" | "followup" | "quotation" | "opportunity" | "sale" | "contract" | "system";
  targetIds: string[];
  payload: Record<string, any>;
  requiresConfirmation: boolean;
  confirmationWarning?: string;
}

export interface ChangeSetRecord {
  entityType: string;
  entityId: string;
  companyId: string;
  oldData: Record<string, any>;
  newData: Record<string, any>;
}

export interface ChangeSet {
  id: string;
  timestamp: string;
  actionType: AIActionType;
  description: string;
  requestingUser: string;
  records: ChangeSetRecord[];
  isRolledBack: boolean;
  rolledBackAt?: string;
  rolledBackBy?: string;
}

export type AIActivityStatus = "READ" | "PROPOSED" | "EXECUTED" | "FAILED" | "VERIFIED" | "ROLLED_BACK";

export interface AIActivityLogEntry {
  id: string;
  timestamp: string;
  user: string;
  command: string;
  mode: AIMode;
  companyId?: string;
  action?: string;
  affectedCount: number;
  status: AIActivityStatus;
  resultSummary?: string;
  error?: string;
  verified: boolean;
  changeSetId?: string;
}

export type AlertSeverity = "high" | "medium" | "low" | "critical" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "WARNING" | "warning" | "INFO" | "info";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED" | "ACTIVE" | "active" | "resolved" | "open" | "dismissed";

export interface PredictiveAlert {
  id: string;
  companyId: CompanyId;
  type:
    | "hot_without_next_action"
    | "quote_without_followup"
    | "stalled_opportunity"
    | "overdue_followups_surge"
    | "sales_drop_anomaly"
    | "high_inquiry_low_conversion"
    | "missing_customer_link"
    | "company_isolation_risk"
    | string;
  severity: AlertSeverity;
  affectedEntity?: "customer" | "quotation" | "opportunity" | "inquiry" | "followup" | "company" | string;
  affectedId?: string;
  affectedTitle?: string;
  title?: string;
  description?: string;
  reason?: string;
  detectedAt?: string;
  status: AlertStatus;
  suggestedAction?: string;
  suggestedIntervention?: string;
}

export type IncidentSeverity = "critical" | "high" | "medium" | "low" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type IncidentStatus =
  | "DETECTED"
  | "DIAGNOSED"
  | "WAITING_APPROVAL"
  | "FIXING"
  | "VERIFIED"
  | "RESOLVED"
  | "FIX_FAILED"
  | "OPEN"
  | "open"
  | "in_progress"
  | "resolved";

export interface Incident {
  id: string;
  companyId?: string;
  type: "data_integrity" | "sync_mismatch" | "broken_relation" | "business_rule_violation" | "write_failure" | string;
  severity: IncidentSeverity;
  entityType?: string;
  entityId?: string;
  title?: string;
  description?: string;
  details?: string;
  detectedAt?: string;
  diagnosis?: string;
  proposedFix?: string;
  suggestedFix?: string;
  status: IncidentStatus;
  resolvedAt?: string;
  fixAction?: AIActionProposal;
}

export interface BusinessRuleViolation {
  ruleId: string;
  ruleName: string;
  severity: "critical" | "high" | "medium" | "low" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "WARNING" | "warning";
  entityType: string;
  entityId: string;
  entityLabel: string;
  companyId: string;
  description: string;
  suggestedFix?: string;
  suggestedAction?: string;
  affectedEntitiesCount?: number;
}

export interface DataLineageItem {
  kpiKey: string;
  kpiTitle: string;
  value: number | string;
  formattedValue: string;
  companyName: string;
  period: string;
  filtersDescription: string;
  sourceEntity: "sales" | "contracts" | "quotations" | "customers" | "followups" | "inquiries" | "opportunities";
  calculationFormula: string;
  constituentRecordIds: string[];
  sampleRecords: Array<{
    id: string;
    label: string;
    value: number | string;
    date: string;
    companyId: string;
  }>;
  status: "VERIFIED" | "UNVERIFIED";
  verificationNotes: string;
}

export interface SystemHealthReport {
  timestamp: string;
  overallStatus: "healthy" | "attention" | "critical";
  databaseHealth: {
    connected: boolean;
    tablesChecked: number;
    latencyMs: number;
    status: "healthy" | "warning" | "error";
  };
  syncHealth: {
    pendingSyncCount: number;
    lastSyncedAt: string;
    status: "healthy" | "warning" | "error";
  };
  dataIntegrity: {
    duplicateCustomersCount: number;
    orphanedRecordsCount: number;
    invalidCompanyIdsCount: number;
    status: "healthy" | "warning" | "error";
  };
  businessRules: {
    violationsCount: number;
    criticalViolationsCount: number;
    status: "healthy" | "warning" | "error";
    violations: BusinessRuleViolation[];
  };
  openIncidentsCount: number;
  activeAlertsCount: number;
  emergencyStopActive: boolean;
}
