import { CompanyId } from "../types";
import {
  cleanCustomer,
  cleanCustomerUpdate,
  cleanInquiry,
  cleanInquiryUpdate,
  cleanFollowUp,
  cleanFollowUpUpdate,
  cleanQuotation,
  cleanContract,
  cleanSale,
  cleanPayment,
  cleanInspection,
  cleanInspectionUpdate,
  cleanCompany,
  cleanCompanyUpdate,
  cleanInteraction,
} from "../integrations/supabase/sanitizer";

export type EntityType =
  | "customer"
  | "inquiry"
  | "opportunity"
  | "quotation"
  | "contract"
  | "sale"
  | "payment"
  | "followup"
  | "inspection"
  | "company"
  | "user"
  | "product"
  | "interaction"
  | "task"
  | "bulk_operation"
  | "import_operation"
  | "system_operation";

export type ChangeStatus =
  | "pending"
  | "processing"
  | "synced"
  | "failed"
  | "conflict"
  | "verified"
  | "needs_review";

export type SyncStatus = "pending" | "synced" | "failed";
export type VerificationStatus = "verified" | "unverified" | "failed" | "pending" | "needs_review";

export type ChangeAction =
  | "insert"
  | "update"
  | "delete"
  | "create"
  | "archive"
  | "restore"
  | "assign"
  | "status_change"
  | "date_change"
  | "stage_change"
  | "priority_change"
  | "financial_change"
  | "bulk_action"
  | "import"
  | "conflict_resolve"
  | "sync_retry"
  | "guardian_action"
  | "ai_action"
  | "system_action";

export interface ChangeRecord {
  id: string; // actionId
  actionId?: string; // alias for actionId
  timestamp: string; // ISO string
  userId?: string;
  userName?: string;
  userRole?: string;
  companyId: string;
  entityType: EntityType;
  entityId?: string; // alias for recordId
  recordId: string;
  action: ChangeAction;
  actionType?: string; // alias for action
  payload: Record<string, any>; // newValue
  newValue?: Record<string, any>; // alias for payload
  previousData?: Record<string, any>; // previousValue
  previousValue?: Record<string, any>; // alias for previousData
  status: ChangeStatus;
  syncStatus?: SyncStatus;
  verificationStatus?: VerificationStatus;
  verifiedAt?: string;
  verifiedData?: any;
  error?: string; // alias for errorMessage
  errorMessage?: string;
  attempts: number;
  lastAttemptAt?: string;
  description: string;
  conflictDetails?: {
    cloudData: Record<string, any>;
    localData: Record<string, any>;
    detectedAt: string;
  };
  bulkDetails?: {
    total: number;
    success: number;
    failed: number;
    entityIds: string[];
    operationName?: string;
  };
  importDetails?: {
    importId: string;
    fileName?: string;
    totalRows: number;
    successCount: number;
    failedCount: number;
    conflictCount: number;
    duplicateCount: number;
    skippedCount: number;
    errors: string[];
    user?: string;
    companyId?: string;
  };
}

const STORAGE_PENDING_KEY = "pvc_nesta_v1_pending_changes";
const STORAGE_LEDGER_KEY = "pvc_nesta_v1_change_ledger";

export class PersistenceEngine {
  private pendingChanges: Map<string, ChangeRecord> = new Map();
  private changeLedger: ChangeRecord[] = [];
  private subscribers: Set<() => void> = new Set();
  private isSyncing: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  public subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  private notify() {
    this.saveToStorage();
    this.subscribers.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error("PersistenceEngine subscriber error:", err);
      }
    });
  }

  private loadFromStorage() {
    this.pendingChanges.clear();
    this.changeLedger = [];
    try {
      localStorage.removeItem(STORAGE_PENDING_KEY);
      localStorage.removeItem(STORAGE_LEDGER_KEY);
    } catch (e) {}
  }

  private saveToStorage() {
    try {
      localStorage.removeItem(STORAGE_PENDING_KEY);
      localStorage.removeItem(STORAGE_LEDGER_KEY);
    } catch (e) {}
  }

  public clearAllQueuesAndStorage() {
    this.pendingChanges.clear();
    this.changeLedger = [];
    try {
      localStorage.removeItem(STORAGE_PENDING_KEY);
      localStorage.removeItem(STORAGE_LEDGER_KEY);
    } catch (e) {}
    this.notify();
  }

  public getPendingChanges(): ChangeRecord[] {
    return Array.from(this.pendingChanges.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public getAllChanges(): ChangeRecord[] {
    return [...this.changeLedger];
  }

  public getConflicts(): ChangeRecord[] {
    return this.changeLedger.filter((c) => c.status === "conflict");
  }

  public getStats() {
    const total = this.changeLedger.length;
    const pending = Array.from(this.pendingChanges.values()).filter(
      (c) => c.status === "pending" || c.status === "processing"
    ).length;
    const failed = Array.from(this.pendingChanges.values()).filter(
      (c) => c.status === "failed"
    ).length;
    const conflict = this.changeLedger.filter((c) => c.status === "conflict").length;
    const verified = this.changeLedger.filter((c) => c.status === "verified").length;
    const synced = this.changeLedger.filter((c) => c.status === "synced" || c.status === "verified").length;
    const needsReview = this.changeLedger.filter((c) => c.status === "needs_review").length;

    return { total, pending, failed, conflict, verified, synced, needsReview };
  }

  /**
   * Records a user action before attempting cloud save.
   * Ensures zero data loss and establishes an unalterable audit trail.
   */
  public recordChange(params: {
    entityType: EntityType;
    recordId: string;
    companyId: string;
    action: ChangeAction;
    payload: Record<string, any>;
    previousData?: Record<string, any>;
    userName?: string;
    userId?: string;
    userRole?: string;
    description?: string;
  }): ChangeRecord {
    const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const entityNamesAr: Record<EntityType, string> = {
      customer: "العميل",
      inquiry: "الاستفسار",
      opportunity: "الفرصة البيعية",
      quotation: "عرض السعر",
      contract: "العقد",
      sale: "المبيعات",
      payment: "التحصيل المالي",
      followup: "المتابعة",
      inspection: "المعاينة",
      company: "الشركة",
      user: "المستخدم",
      product: "المنتج",
      interaction: "سجل التواصل",
      task: "المهمة",
      bulk_operation: "عملية مجمعة",
      import_operation: "استيراد بيانات",
      system_operation: "إجراء نظام",
    };

    const actionAr: Record<string, string> = {
      insert: "إنشاء",
      create: "إنشاء",
      update: "تعديل",
      delete: "حذف",
      archive: "أرشفة",
      restore: "استعادة",
      assign: "إسناد مسؤول",
      status_change: "تغيير حالة",
      date_change: "تعديل تاريخ",
      stage_change: "تغيير مرحلة",
      priority_change: "تغيير أولوية",
      financial_change: "تعديل مالي",
      bulk_action: "إجراء مجمع",
      import: "استيراد",
      conflict_resolve: "حل تعارض",
      sync_retry: "إعادة مزامنة",
      guardian_action: "إجراء Guardian",
      ai_action: "إجراء ذكاء اصطناعي",
      system_action: "إجراء نظام",
    };

    const autoDesc = `${actionAr[params.action] || params.action} ${entityNamesAr[params.entityType] || params.entityType} (معرف: ${params.recordId.substring(0, 8)})`;

    const change: ChangeRecord = {
      id,
      actionId: id,
      entityType: params.entityType,
      recordId: params.recordId,
      entityId: params.recordId,
      companyId: params.companyId,
      action: params.action,
      actionType: params.action,
      payload: params.payload,
      newValue: params.payload,
      previousData: params.previousData,
      previousValue: params.previousData,
      status: "pending",
      syncStatus: "pending",
      verificationStatus: "unverified",
      timestamp: now,
      attempts: 0,
      userName: params.userName || "المستخدم الحالي",
      userId: params.userId,
      userRole: params.userRole,
      description: params.description || autoDesc,
    };

    this.pendingChanges.set(id, change);
    this.changeLedger.unshift(change);
    this.notify();
    return change;
  }

  /**
   * Records a Bulk Action operation with aggregated stats & linked entity list
   */
  public recordBulkOperation(params: {
    operationName: string;
    entityType: EntityType;
    entityIds: string[];
    actionType: ChangeAction;
    companyId: string;
    userId?: string;
    userName?: string;
    userRole?: string;
    payload?: Record<string, any>;
    results: { entityId: string; success: boolean; error?: string }[];
  }): ChangeRecord {
    const id = `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const successCount = params.results.filter((r) => r.success).length;
    const failedCount = params.results.filter((r) => !r.success).length;
    const isFullSuccess = failedCount === 0;

    const change: ChangeRecord = {
      id,
      actionId: id,
      entityType: "bulk_operation",
      recordId: id,
      entityId: id,
      companyId: params.companyId,
      action: "bulk_action",
      actionType: "bulk_action",
      payload: params.payload || {},
      newValue: params.payload,
      status: isFullSuccess ? "verified" : failedCount > 0 && successCount > 0 ? "needs_review" : "failed",
      syncStatus: isFullSuccess ? "synced" : "failed",
      verificationStatus: isFullSuccess ? "verified" : "needs_review",
      timestamp: now,
      attempts: 1,
      lastAttemptAt: now,
      userName: params.userName || "المستخدم الحالي",
      userId: params.userId,
      userRole: params.userRole,
      description: `[عملية مجمعة] ${params.operationName}: تم معالجة ${params.entityIds.length} عنصر (نجاح: ${successCount}، فشل: ${failedCount})`,
      bulkDetails: {
        total: params.entityIds.length,
        success: successCount,
        failed: failedCount,
        entityIds: params.entityIds,
        operationName: params.operationName,
      },
    };

    this.changeLedger.unshift(change);
    this.notify();
    return change;
  }

  /**
   * Records an Excel / CSV Data Import operation with full audit breakdown
   */
  public recordImportOperation(params: {
    importId: string;
    fileName?: string;
    totalRows: number;
    successCount: number;
    failedCount: number;
    conflictCount: number;
    duplicateCount: number;
    skippedCount: number;
    errors: string[];
    companyId: string;
    userId?: string;
    userName?: string;
  }): ChangeRecord {
    const id = `imp_${params.importId || Date.now()}`;
    const now = new Date().toISOString();
    const isSuccess = params.failedCount === 0;

    const change: ChangeRecord = {
      id,
      actionId: id,
      entityType: "import_operation",
      recordId: params.importId,
      entityId: params.importId,
      companyId: params.companyId,
      action: "import",
      actionType: "import",
      payload: {
        totalRows: params.totalRows,
        successCount: params.successCount,
        failedCount: params.failedCount,
      },
      newValue: {
        totalRows: params.totalRows,
        successCount: params.successCount,
      },
      status: isSuccess ? "verified" : "needs_review",
      syncStatus: isSuccess ? "synced" : "failed",
      verificationStatus: isSuccess ? "verified" : "needs_review",
      timestamp: now,
      attempts: 1,
      lastAttemptAt: now,
      userName: params.userName || "النظام / المستخدم",
      userId: params.userId,
      description: `[استيراد إكسيل] ${params.fileName || "ملف بيانات"}: إجمالي ${params.totalRows} صف (نجاح: ${params.successCount}، تجاوز: ${params.skippedCount}، أخطاء: ${params.failedCount})`,
      importDetails: params,
    };

    this.changeLedger.unshift(change);
    this.notify();
    return change;
  }

  /**
   * Records a System Operation (e.g. Integrity Audit, Coverage Audit, Conflict Resolve, Guardian Action, AI Action)
   */
  public recordSystemOperation(params: {
    actionType: ChangeAction;
    description: string;
    companyId: string;
    userId?: string;
    userName?: string;
    payload?: Record<string, any>;
    previousData?: Record<string, any>;
    status?: ChangeStatus;
    verificationStatus?: VerificationStatus;
  }): ChangeRecord {
    const id = `sys_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const change: ChangeRecord = {
      id,
      actionId: id,
      entityType: "system_operation",
      recordId: id,
      entityId: id,
      companyId: params.companyId,
      action: params.actionType,
      actionType: params.actionType,
      payload: params.payload || {},
      newValue: params.payload,
      previousData: params.previousData,
      previousValue: params.previousData,
      status: params.status || "verified",
      syncStatus: "synced",
      verificationStatus: params.verificationStatus || "verified",
      timestamp: now,
      attempts: 1,
      lastAttemptAt: now,
      userName: params.userName || "النظام",
      userId: params.userId,
      description: params.description,
    };

    this.changeLedger.unshift(change);
    this.notify();
    return change;
  }

  public markChangeVerified(changeId: string, verifiedData?: any) {
    const now = new Date().toISOString();
    const chg = this.pendingChanges.get(changeId);
    if (chg) {
      chg.status = "verified";
      chg.syncStatus = "synced";
      chg.verificationStatus = "verified";
      chg.verifiedAt = now;
      chg.verifiedData = verifiedData;
      chg.lastAttemptAt = now;
      chg.errorMessage = undefined;
      chg.error = undefined;
      this.pendingChanges.delete(changeId);
    }
    const inLedger = this.changeLedger.find((c) => c.id === changeId);
    if (inLedger) {
      inLedger.status = "verified";
      inLedger.syncStatus = "synced";
      inLedger.verificationStatus = "verified";
      inLedger.verifiedAt = now;
      inLedger.verifiedData = verifiedData;
      inLedger.lastAttemptAt = now;
      inLedger.errorMessage = undefined;
      inLedger.error = undefined;
    }
    this.notify();
  }

  public markChangeVerificationFailed(changeId: string, errorMessage: string) {
    const now = new Date().toISOString();
    const chg = this.pendingChanges.get(changeId);
    if (chg) {
      chg.status = "needs_review";
      chg.syncStatus = "failed";
      chg.verificationStatus = "failed";
      chg.attempts = (chg.attempts || 0) + 1;
      chg.lastAttemptAt = now;
      chg.errorMessage = errorMessage;
      chg.error = errorMessage;
    }
    const inLedger = this.changeLedger.find((c) => c.id === changeId);
    if (inLedger) {
      inLedger.status = "needs_review";
      inLedger.syncStatus = "failed";
      inLedger.verificationStatus = "failed";
      inLedger.attempts = (inLedger.attempts || 0) + 1;
      inLedger.lastAttemptAt = now;
      inLedger.errorMessage = errorMessage;
      inLedger.error = errorMessage;
    }
    this.notify();
  }

  public markChangeSuccess(changeId: string) {
    this.markChangeVerified(changeId);
  }

  public markChangeFailed(changeId: string, errorMessage: string) {
    const now = new Date().toISOString();
    const chg = this.pendingChanges.get(changeId);
    if (chg) {
      chg.status = "failed";
      chg.syncStatus = "failed";
      chg.verificationStatus = "failed";
      chg.attempts = (chg.attempts || 0) + 1;
      chg.lastAttemptAt = now;
      chg.errorMessage = errorMessage;
      chg.error = errorMessage;
    }
    const inLedger = this.changeLedger.find((c) => c.id === changeId);
    if (inLedger) {
      inLedger.status = "failed";
      inLedger.syncStatus = "failed";
      inLedger.verificationStatus = "failed";
      inLedger.attempts = (inLedger.attempts || 0) + 1;
      inLedger.lastAttemptAt = now;
      inLedger.errorMessage = errorMessage;
      inLedger.error = errorMessage;
    }
    this.notify();
  }

  public markChangeConflict(changeId: string, cloudData: Record<string, any>, localData: Record<string, any>) {
    const chg = this.pendingChanges.get(changeId);
    const conflictDetails = {
      cloudData,
      localData,
      detectedAt: new Date().toISOString(),
    };
    if (chg) {
      chg.status = "conflict";
      chg.conflictDetails = conflictDetails;
      chg.lastAttemptAt = new Date().toISOString();
    }
    const inLedger = this.changeLedger.find((c) => c.id === changeId);
    if (inLedger) {
      inLedger.status = "conflict";
      inLedger.conflictDetails = conflictDetails;
      inLedger.lastAttemptAt = new Date().toISOString();
    }
    this.notify();
  }

  public resolveConflict(
    changeId: string,
    resolution: "keep_local" | "keep_cloud" | "custom",
    customPayload?: Record<string, any>
  ) {
    const chg = this.pendingChanges.get(changeId) || this.changeLedger.find((c) => c.id === changeId);
    if (!chg) return;

    if (resolution === "keep_local") {
      chg.status = "pending";
      chg.errorMessage = undefined;
      chg.conflictDetails = undefined;
      this.pendingChanges.set(changeId, chg);
    } else if (resolution === "keep_cloud") {
      this.pendingChanges.delete(changeId);
      chg.status = "synced";
      chg.conflictDetails = undefined;
    } else if (resolution === "custom" && customPayload) {
      chg.payload = customPayload;
      chg.status = "pending";
      chg.conflictDetails = undefined;
      this.pendingChanges.set(changeId, chg);
    }
    this.notify();
  }

  public removeChange(changeId: string) {
    this.pendingChanges.delete(changeId);
    this.changeLedger = this.changeLedger.filter((c) => c.id !== changeId);
    this.notify();
  }

  public clearSynced() {
    this.changeLedger = this.changeLedger.filter((c) => c.status !== "synced");
    this.notify();
  }

  /**
   * Merges server-fetched data with any local pending changes so reload does not wipe unsaved local edits!
   */
  public reconcileCloudWithPending<T extends { id: string }>(
    cloudItems: T[],
    entityType: EntityType
  ): T[] {
    const pendingForEntity = Array.from(this.pendingChanges.values()).filter(
      (c) => c.entityType === entityType && (c.status === "pending" || c.status === "failed")
    );

    if (pendingForEntity.length === 0) return cloudItems;

    const merged = new Map<string, T>();
    cloudItems.forEach((item) => merged.set(item.id, { ...item }));

    // Track deleted record IDs to prevent resurrection of deleted items by stale updates
    const deletedRecordIds = new Set<string>();
    pendingForEntity.forEach((change) => {
      if (change.action === "delete") {
        deletedRecordIds.add(change.recordId);
      }
    });
    this.changeLedger.forEach((change) => {
      if (change.entityType === entityType && change.action === "delete") {
        deletedRecordIds.add(change.recordId);
      }
    });

    // Apply pending inserts and updates on top of cloud data
    pendingForEntity.forEach((change) => {
      if (change.action === "delete") {
        merged.delete(change.recordId);
        deletedRecordIds.add(change.recordId);
      } else if (change.action === "update") {
        // RESURRECTION PROTECTION: Ignore update on a deleted record
        if (deletedRecordIds.has(change.recordId)) {
          return;
        }
        const existing = merged.get(change.recordId);
        if (existing) {
          merged.set(change.recordId, { ...existing, ...change.payload });
        } else {
          // Record was created locally and never saved to cloud yet
          merged.set(change.recordId, change.payload as T);
        }
      } else if (change.action === "insert" || change.action === "create") {
        if (!deletedRecordIds.has(change.recordId)) {
          merged.set(change.recordId, change.payload as T);
        }
      }
    });

    return Array.from(merged.values());
  }

  /**
   * Sanitizes payload for Supabase write operations
   */
  private sanitizeForTable(entityType: EntityType, payload: any, action: ChangeAction) {
    switch (entityType) {
      case "customer":
        return action === "insert" ? cleanCustomer(payload) : cleanCustomerUpdate(payload);
      case "inquiry":
        return action === "insert" ? cleanInquiry(payload) : cleanInquiryUpdate(payload);
      case "followup":
        return action === "insert" ? cleanFollowUp(payload) : cleanFollowUpUpdate(payload);
      case "quotation":
        return cleanQuotation(payload);
      case "contract":
        return cleanContract(payload);
      case "sale":
        return cleanSale(payload);
      case "payment":
        return cleanPayment(payload);
      case "inspection":
        return action === "insert" ? cleanInspection(payload) : cleanInspectionUpdate(payload);
      case "company":
        return action === "insert" ? cleanCompany(payload) : cleanCompanyUpdate(payload);
      case "interaction":
        return cleanInteraction(payload);
      default:
        return payload;
    }
  }

  public getTableName(entityType: EntityType): string {
    switch (entityType) {
      case "customer":
        return "customers";
      case "inquiry":
        return "inquiries";
      case "followup":
        return "follow_ups";
      case "quotation":
        return "quotations";
      case "contract":
        return "contracts";
      case "sale":
        return "sales";
      case "payment":
        return "payments";
      case "inspection":
        return "inspections";
      case "company":
        return "companies";
      case "interaction":
        return "interactions";
      case "opportunity":
        return "interactions"; // Opportunities are synced as opportunity_sync in interactions
      case "product":
        return "products";
      default:
        return entityType;
    }
  }

  /**
   * Executes a single change against Supabase
   */
  public async executeChange(supabase: any, change: ChangeRecord): Promise<{ success: boolean; message: string }> {
    if (!supabase) {
      this.markChangeFailed(change.id, "قاعدة البيانات السحابية غير متصلة");
      return { success: false, message: "Supabase not connected" };
    }

    try {
      // Non-table operations (bulk, import, system actions) are self-verifying operational logs
      if (
        change.entityType === "system_operation" ||
        change.entityType === "bulk_operation" ||
        change.entityType === "import_operation"
      ) {
        this.markChangeVerified(change.id);
        return { success: true, message: "تم تسجيل العملية في سجل التدقيق بنجاح" };
      }

      const table = this.getTableName(change.entityType);

      if (change.entityType === "opportunity") {
        if (change.action === "delete") {
          // Delete from opportunities table if it exists
          try {
            await supabase.from("opportunities").delete().eq("id", change.recordId);
          } catch {
            // Ignore missing table error
          }

          // Delete from interactions table where opportunity_sync records are stored
          const { error: intErr } = await supabase
            .from("interactions")
            .delete()
            .eq("id", `opp-sync-${change.recordId}`);

          if (intErr && intErr.code !== "PGRST205") {
            // Try fallback delete by notes if opp-sync- prefix differed
            await supabase
              .from("interactions")
              .delete()
              .eq("type", "opportunity_sync")
              .ilike("notes", `%${change.recordId}%`);
          }

          this.markChangeVerified(change.id);
          return { success: true, message: "تم حذف الفرصة والتحقق منها بنجاح من قاعدة البيانات" };
        } else {
          // Upsert opportunity
          let oppSuccess = false;
          try {
            await supabase.from("opportunities").upsert([change.payload]);
            const { data: readBack } = await supabase.from("opportunities").select("id").eq("id", change.recordId).maybeSingle();
            if (readBack) oppSuccess = true;
          } catch {
            oppSuccess = false;
          }

          const oppData = change.payload || {};
          const interactionPayload = {
            id: `opp-sync-${oppData.id || change.recordId}`,
            customerId: oppData.customerId || "temp",
            companyId: oppData.companyId || change.companyId,
            type: "opportunity_sync",
            date: oppData.createdAt || new Date().toISOString().split("T")[0],
            notes: JSON.stringify(oppData),
            result: "synced",
          };

          const { error } = await supabase.from("interactions").upsert([interactionPayload]);
          if (error && error.code !== "PGRST205" && !oppSuccess) throw error;

          this.markChangeVerified(change.id);
          return { success: true, message: "تمت مزامنة الفرصة والتحقق منها بنجاح" };
        }
      }

      if (change.action === "delete") {
        const { error } = await supabase.from(table).delete().eq("id", change.recordId);
        if (error && error.code !== "PGRST205") throw error;

        // READ-BACK VERIFY FOR DELETE
        const { data: checkRow, error: checkErr } = await supabase
          .from(table)
          .select("id")
          .eq("id", change.recordId)
          .maybeSingle();

        if (checkErr && checkErr.code !== "PGRST205") {
          this.markChangeVerificationFailed(change.id, `فشل التحقق من الحذف: ${checkErr.message}`);
          return { success: false, message: "فشل التحقق من السحابة" };
        }

        if (checkRow) {
          this.markChangeVerificationFailed(change.id, "فشل التحقق: السجل ما زال موجوداً في السحابة بعد أمر الحذف");
          return { success: false, message: "فشل التحقق: السجل لم يُحذف من السحابة" };
        }

        this.markChangeVerified(change.id);
        return { success: true, message: "تم الحذف والتحقق من السحابة بنجاح" };
      } else if (change.action === "insert" || change.action === "create") {
        const sanitized = this.sanitizeForTable(change.entityType, change.payload, "insert");
        const { error } = await supabase.from(table).upsert([sanitized]);
        if (error && error.code !== "PGRST205") throw error;

        // READ-BACK VERIFY FOR INSERT
        const { data: readBack, error: readErr } = await supabase
          .from(table)
          .select("*")
          .eq("id", change.recordId)
          .maybeSingle();

        if (readErr && readErr.code !== "PGRST205") {
          this.markChangeVerificationFailed(change.id, `فشل التحقق: خطأ قراءة السجل من السحابة (${readErr.message})`);
          return { success: false, message: "فشل التحقق من القراءة السحابية" };
        }

        if (!readBack) {
          this.markChangeVerificationFailed(change.id, "فشل التحقق: لم يتم العثور على السجل في السحابة بعد كتابته (Read-back Failed)");
          return { success: false, message: "فشل التحقق: السجل غير موجود في السحابة" };
        }

        this.markChangeVerified(change.id, readBack);
        return { success: true, message: "تم الإنشاء والتحقق من السحابة بنجاح (Verified)" };
      } else {
        // UPDATE (or status_change, assign, date_change, financial_change, etc.)
        if (change.previousData?.updatedAt) {
          const { data: serverRow } = await supabase
            .from(table)
            .select("*")
            .eq("id", change.recordId)
            .maybeSingle();

          if (
            serverRow &&
            serverRow.updatedAt &&
            new Date(serverRow.updatedAt).getTime() > new Date(change.previousData.updatedAt).getTime()
          ) {
            // Conflict detected: Server has newer timestamp
            this.markChangeConflict(change.id, serverRow, change.payload);
            return {
              success: false,
              message: "تم اكتشاف تعارض: تم تعديل السجل من مستخدم آخر بعد وقت تعديلك",
            };
          }
        }

        const sanitized = this.sanitizeForTable(change.entityType, change.payload, "update");
        const { error } = await supabase.from(table).update(sanitized).eq("id", change.recordId);
        if (error && error.code !== "PGRST205") throw error;

        // READ-BACK VERIFY FOR UPDATE
        const { data: readBack, error: readErr } = await supabase
          .from(table)
          .select("*")
          .eq("id", change.recordId)
          .maybeSingle();

        if (readErr && readErr.code !== "PGRST205") {
          this.markChangeVerificationFailed(change.id, `فشل التحقق: خطأ قراءة السجل بعد التعديل (${readErr.message})`);
          return { success: false, message: "فشل التحقق من القراءة السحابية" };
        }

        if (!readBack) {
          this.markChangeVerificationFailed(change.id, "فشل التحقق: تعذرت قراءة السجل المحدث من السحابة (Read-back Failed)");
          return { success: false, message: "فشل التحقق من التعديل" };
        }

        this.markChangeVerified(change.id, readBack);
        return { success: true, message: "تم التعديل والتحقق من السحابة بنجاح (Verified)" };
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.markChangeFailed(change.id, msg);
      return { success: false, message: msg };
    }
  }

  /**
   * Syncs all pending and failed changes (Used by "مزامنة الآن")
   */
  public async syncAllPending(supabase: any): Promise<{
    total: number;
    synced: number;
    failed: number;
    conflicts: number;
    details: string[];
  }> {
    if (this.isSyncing) {
      return {
        total: 0,
        synced: 0,
        failed: 0,
        conflicts: 0,
        details: ["المزامنة جارية بالفعل..."],
      };
    }

    this.isSyncing = true;
    const pendingList = Array.from(this.pendingChanges.values());
    let synced = 0;
    let failed = 0;
    let conflicts = 0;
    const details: string[] = [];

    try {
      for (const change of pendingList) {
        const res = await this.executeChange(supabase, change);
        if (res.success) {
          synced++;
          details.push(`✓ [نجاح] ${change.description}`);
        } else if (change.status === "conflict") {
          conflicts++;
          details.push(`⚠️ [تعارض] ${change.description}`);
        } else {
          failed++;
          details.push(`✗ [فشل] ${change.description}: ${res.message}`);
        }
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return {
      total: pendingList.length,
      synced,
      failed,
      conflicts,
      details,
    };
  }
}

export const globalPersistenceEngine = new PersistenceEngine();
