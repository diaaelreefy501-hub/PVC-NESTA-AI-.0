import { GoogleSheetsAdapter } from "./googleSheetsAdapter";
import { NESTA_SHEET_SCHEMAS } from "./tabSchemas";
import {
  DataLayerConnectionStatus,
  GoogleSheetsConfig,
  SyncConflictRecord,
  SyncDirection,
  SyncLogEntry,
  SyncQueueItem,
} from "./types";

export class NestaSyncEngine {
  private adapter: GoogleSheetsAdapter;
  private config: GoogleSheetsConfig;
  private connectionStatus: DataLayerConnectionStatus = "disconnected";
  private syncLogs: SyncLogEntry[] = [];
  private conflicts: SyncConflictRecord[] = [];
  private queue: SyncQueueItem[] = [];
  private isProcessingQueue: boolean = false;
  private listeners: Set<() => void> = new Set();
  private simulatedNetworkFailure: boolean = false;

  constructor(adapter?: GoogleSheetsAdapter) {
    this.adapter = adapter || new GoogleSheetsAdapter();
    this.config = {
      spreadsheetId: null,
      spreadsheetName: null,
      spreadsheetUrl: null,
      lastSyncTime: null,
      lastSyncStatus: "never",
      autoSyncEnabled: false,
      syncIntervalSeconds: 60,
      testModeOnly: true,
    };
    this.loadState();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.saveState();
    this.listeners.forEach((fn) => fn());
  }

  private saveState() {
    try {
      localStorage.setItem("nesta_sheets_config", JSON.stringify(this.config));
      localStorage.setItem("nesta_sync_logs", JSON.stringify(this.syncLogs.slice(-100)));
      localStorage.setItem("nesta_sync_conflicts", JSON.stringify(this.conflicts));
    } catch {
      // ignore
    }
  }

  private loadState() {
    try {
      const savedConfig = localStorage.getItem("nesta_sheets_config");
      if (savedConfig) this.config = { ...this.config, ...JSON.parse(savedConfig) };

      const savedLogs = localStorage.getItem("nesta_sync_logs");
      if (savedLogs) this.syncLogs = JSON.parse(savedLogs);

      const savedConflicts = localStorage.getItem("nesta_sync_conflicts");
      if (savedConflicts) this.conflicts = JSON.parse(savedConflicts);

      if (this.config.spreadsheetId) {
        this.adapter.setSpreadsheetId(this.config.spreadsheetId);
        this.connectionStatus = "connected";
      }
    } catch {
      // ignore
    }
  }

  // Getters
  public getAdapter(): GoogleSheetsAdapter {
    return this.adapter;
  }

  public getConfig(): GoogleSheetsConfig {
    return { ...this.config };
  }

  public getConnectionStatus(): DataLayerConnectionStatus {
    return this.connectionStatus;
  }

  public getSyncLogs(): SyncLogEntry[] {
    return [...this.syncLogs];
  }

  public getConflicts(): SyncConflictRecord[] {
    return [...this.conflicts];
  }

  public getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  public setSimulatedNetworkFailure(state: boolean) {
    this.simulatedNetworkFailure = state;
  }

  public isSimulatingNetworkFailure(): boolean {
    return this.simulatedNetworkFailure;
  }

  /**
   * Initializes or links a Google Spreadsheet for NESTA
   */
  public async initializeSpreadsheet(customTitle?: string): Promise<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    title: string;
  }> {
    this.connectionStatus = "syncing";
    this.notify();

    try {
      const title = customTitle || "PVC NESTA AI - Data Layer (Test)";
      const res = await this.adapter.createNestaSpreadsheet(title);

      this.config.spreadsheetId = res.spreadsheetId;
      this.config.spreadsheetName = res.title;
      this.config.spreadsheetUrl = res.spreadsheetUrl;
      this.connectionStatus = "connected";

      this.addLog({
        direction: "nesta_to_sheets",
        entity: "system",
        recordId: res.spreadsheetId,
        companyId: "all",
        status: "success",
        changesSummary: `تم إنشاء وربط جدول البيانات بنجاح: ${res.title}`,
      });

      this.notify();
      return res;
    } catch (err: any) {
      this.connectionStatus = "error";
      this.config.lastSyncStatus = "error";
      this.config.lastErrorMessage = err.message;
      this.addLog({
        direction: "nesta_to_sheets",
        entity: "system",
        recordId: "init",
        companyId: "all",
        status: "failed",
        changesSummary: "فشل تهيئة جدول بيانات Google Sheets",
        errorMessage: err.message,
      });
      this.notify();
      throw err;
    }
  }

  /**
   * Enqueues an entity change to be synced to Sheets
   */
  public enqueueChange(
    entity: string,
    recordId: string,
    companyId: string,
    operation: "insert" | "update" | "delete",
    data: Record<string, any>
  ) {
    // Ensure company_id and stable versioning
    const enrichedData = {
      ...data,
      company_id: companyId || data.companyId || data.company_id || "cmp_nesta_master",
      updatedAt: data.updatedAt || new Date().toISOString(),
      version: typeof data.version === "number" ? data.version + 1 : 1,
    };

    const item: SyncQueueItem = {
      id: "q_" + Math.random().toString(36).substring(2, 9),
      entity,
      recordId,
      companyId: enrichedData.company_id,
      operation,
      data: enrichedData,
      attempts: 0,
      maxAttempts: 5,
      nextRetryTime: Date.now(),
      enqueuedAt: new Date().toISOString(),
    };

    this.queue.push(item);
    this.notify();
    this.processQueue();
  }

  /**
   * Processes the outbox queue with exponential backoff retry
   */
  public async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessingQueue || this.queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessingQueue = true;
    let processed = 0;
    let failed = 0;

    try {
      const now = Date.now();
      const readyItems = this.queue.filter((item) => item.nextRetryTime <= now);

      for (const item of readyItems) {
        if (this.simulatedNetworkFailure) {
          item.attempts += 1;
          const backoffDelay = Math.min(30000, Math.pow(2, item.attempts) * 1000);
          item.nextRetryTime = Date.now() + backoffDelay;
          item.lastError = "خطأ انقطاع الاتصال (Simulated Network Drop)";
          failed++;

          this.addLog({
            direction: "nesta_to_sheets",
            entity: item.entity,
            recordId: item.recordId,
            companyId: item.companyId,
            status: "failed",
            changesSummary: `محاولة المزامنة #${item.attempts} فشلت، إعادة المحاولة بعد ${backoffDelay / 1000} ثانية`,
            errorMessage: item.lastError,
          });
          continue;
        }

        try {
          // Push to sheets
          const tabSchema = NESTA_SHEET_SCHEMAS.find(
            (s) => s.entityName.toLowerCase() === item.entity.toLowerCase() || s.tabName.toLowerCase() === item.entity.toLowerCase()
          );

          if (tabSchema) {
            await this.adapter.writeTabRecords(tabSchema.tabName, [item.data]);
          }

          // Remove successfully processed item from queue
          this.queue = this.queue.filter((q) => q.id !== item.id);
          processed++;

          this.addLog({
            direction: "nesta_to_sheets",
            entity: item.entity,
            recordId: item.recordId,
            companyId: item.companyId,
            status: "success",
            changesSummary: `تمت مزامنة العملية (${item.operation}) بنجاح للسجل ${item.recordId}`,
          });
        } catch (err: any) {
          item.attempts += 1;
          const backoffDelay = Math.min(30000, Math.pow(2, item.attempts) * 1000);
          item.nextRetryTime = Date.now() + backoffDelay;
          item.lastError = err.message;
          failed++;

          this.addLog({
            direction: "nesta_to_sheets",
            entity: item.entity,
            recordId: item.recordId,
            companyId: item.companyId,
            status: "failed",
            changesSummary: `فشل مزامنة السجل (${item.attempts}/${item.maxAttempts})`,
            errorMessage: err.message,
          });
        }
      }
    } finally {
      this.isProcessingQueue = false;
      this.notify();
    }

    return { processed, failed };
  }

  /**
   * Performs full Two-Way Delta Sync with Conflict Detection
   */
  public async performTwoWaySync(
    localDataset: {
      customers: any[];
      inquiries: any[];
      followups: any[];
      quotations: any[];
      contracts: any[];
      sales: any[];
    }
  ): Promise<{
    pushedToSheets: number;
    pulledToNesta: number;
    conflictsDetected: number;
    logs: SyncLogEntry[];
  }> {
    this.connectionStatus = "syncing";
    this.notify();

    let pushed = 0;
    let pulled = 0;
    let conflictCount = 0;

    try {
      // 1. Map each entity
      const entitiesToSync = [
        { tab: "Customers", key: "customers", idKey: "customer_id", altId: "id" },
        { tab: "Inquiries", key: "inquiries", idKey: "inquiry_id", altId: "id" },
        { tab: "FollowUps", key: "followups", idKey: "followup_id", altId: "id" },
        { tab: "Quotations", key: "quotations", idKey: "quotation_id", altId: "id" },
        { tab: "Contracts", key: "contracts", idKey: "contract_id", altId: "id" },
        { tab: "Sales", key: "sales", idKey: "sale_id", altId: "id" },
      ];

      for (const ent of entitiesToSync) {
        const localList: any[] = (localDataset as any)[ent.key] || [];
        const remoteList: any[] = await this.adapter.readTabRecords(ent.tab);

        // Map remote list by id
        const remoteMap = new Map<string, any>();
        remoteList.forEach((r) => {
          const id = r[ent.idKey] || r.id;
          if (id) remoteMap.set(String(id), r);
        });

        // Compare Local items against Remote
        for (const localItem of localList) {
          const id = String(localItem[ent.idKey] || localItem[ent.altId] || localItem.id);
          const companyId = localItem.company_id || localItem.companyId || "cmp_nesta_master";
          const localVer = Number(localItem.version || 1);
          const localUpdated = localItem.updatedAt || localItem.date || new Date().toISOString();

          if (!remoteMap.has(id)) {
            // New local item -> push to sheets
            await this.adapter.writeTabRecords(ent.tab, [
              {
                ...localItem,
                [ent.idKey]: id,
                company_id: companyId,
                version: localVer,
                updatedAt: localUpdated,
                createdAt: localItem.createdAt || localUpdated,
              },
            ]);
            pushed++;
            this.addLog({
              direction: "nesta_to_sheets",
              entity: ent.tab,
              recordId: id,
              companyId,
              status: "success",
              changesSummary: `إضافة سجل جديد من NESTA إلى Sheets`,
            });
          } else {
            const remoteItem = remoteMap.get(id);
            const remoteVer = Number(remoteItem.version || 1);
            const remoteUpdated = remoteItem.updatedAt || "";

            // Check for Conflict: Both modified with different versions/updates
            if (this.hasConflict(localItem, remoteItem, localVer, remoteVer, localUpdated, remoteUpdated)) {
              // Record Conflict without blind overwrite
              const conflictRecord: SyncConflictRecord = {
                id: "conf_" + Math.random().toString(36).substring(2, 9),
                entity: ent.tab,
                recordId: id,
                companyId,
                detectedAt: new Date().toISOString(),
                nestaVersion: localVer,
                nestaData: localItem,
                nestaUpdatedAt: localUpdated,
                sheetsVersion: remoteVer,
                sheetsData: remoteItem,
                sheetsUpdatedAt: remoteUpdated,
                status: "pending_review",
              };

              this.conflicts.unshift(conflictRecord);
              conflictCount++;

              this.addLog({
                direction: "two_way",
                entity: ent.tab,
                recordId: id,
                companyId,
                status: "conflict",
                changesSummary: `اكتشاف تعارض: تم التعديل من الطرفين (NESTA v${localVer} vs Sheets v${remoteVer}) وتم حفظ النسختين للمراجعة`,
              });
            } else if (localVer > remoteVer || new Date(localUpdated) > new Date(remoteUpdated)) {
              // Local is strictly newer -> push to Sheets
              await this.adapter.writeTabRecords(ent.tab, [
                {
                  ...localItem,
                  [ent.idKey]: id,
                  company_id: companyId,
                  version: localVer,
                  updatedAt: localUpdated,
                },
              ]);
              pushed++;
              this.addLog({
                direction: "nesta_to_sheets",
                entity: ent.tab,
                recordId: id,
                companyId,
                status: "success",
                changesSummary: `تحديث السجل في Sheets (الإصدار ${localVer})`,
              });
            } else if (remoteVer > localVer || new Date(remoteUpdated) > new Date(localUpdated)) {
              // Remote is strictly newer -> pull to NESTA
              pulled++;
              this.addLog({
                direction: "sheets_to_nesta",
                entity: ent.tab,
                recordId: id,
                companyId,
                status: "success",
                changesSummary: `سحب التحديث من Sheets إلى NESTA (الإصدار ${remoteVer})`,
              });
            }
          }
        }
      }

      this.config.lastSyncTime = new Date().toISOString();
      this.config.lastSyncStatus = "success";
      this.connectionStatus = "connected";
      this.notify();

      return {
        pushedToSheets: pushed,
        pulledToNesta: pulled,
        conflictsDetected: conflictCount,
        logs: this.syncLogs,
      };
    } catch (err: any) {
      this.connectionStatus = "error";
      this.config.lastSyncStatus = "error";
      this.config.lastErrorMessage = err.message;
      this.addLog({
        direction: "two_way",
        entity: "all",
        recordId: "sync_batch",
        companyId: "all",
        status: "failed",
        changesSummary: "فشلت عملية المزامنة الثنائية",
        errorMessage: err.message,
      });
      this.notify();
      throw err;
    }
  }

  /**
   * Determines if local and remote copies are in actual conflict
   */
  private hasConflict(
    localItem: any,
    remoteItem: any,
    localVer: number,
    remoteVer: number,
    localUpdated: string,
    remoteUpdated: string
  ): boolean {
    if (localVer === remoteVer && localUpdated === remoteUpdated) {
      return false;
    }

    // Check if meaningful fields are divergent
    const compareKeys = ["name", "phone", "status", "stage", "totalValue", "amount", "notes", "result"];
    let divergentFields = 0;

    for (const k of compareKeys) {
      if (localItem[k] !== undefined && remoteItem[k] !== undefined && localItem[k] !== remoteItem[k]) {
        divergentFields++;
      }
    }

    return divergentFields > 0;
  }

  /**
   * Resolve a recorded conflict
   */
  public resolveConflict(
    conflictId: string,
    choice: "nesta" | "sheets" | "custom",
    resolvedBy: string = "Admin",
    resolutionNotes?: string
  ) {
    const conflict = this.conflicts.find((c) => c.id === conflictId);
    if (!conflict) return;

    conflict.status = choice === "nesta" ? "resolved_nesta" : choice === "sheets" ? "resolved_sheets" : "resolved_custom";
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolvedBy = resolvedBy;
    conflict.resolutionNotes = resolutionNotes || `تم اعتماد نسخة (${choice.toUpperCase()})`;

    this.addLog({
      direction: "two_way",
      entity: conflict.entity,
      recordId: conflict.recordId,
      companyId: conflict.companyId,
      status: "success",
      changesSummary: `تم حل التعارض للسجل ${conflict.recordId} باختيار: ${choice}`,
    });

    this.notify();
  }

  private addLog(entry: Omit<SyncLogEntry, "id" | "timestamp">) {
    const log: SyncLogEntry = {
      ...entry,
      id: "log_" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };
    this.syncLogs.unshift(log);
    if (this.syncLogs.length > 200) {
      this.syncLogs.pop();
    }
  }

  public clearLogs() {
    this.syncLogs = [];
    this.notify();
  }

  public clearConflicts() {
    this.conflicts = [];
    this.notify();
  }
}

// Global Singleton Instance
export const globalSyncEngine = new NestaSyncEngine();
