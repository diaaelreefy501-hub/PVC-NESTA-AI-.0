import { CompanyId } from "../types";

export type DataLayerConnectionStatus = "disconnected" | "connected" | "syncing" | "pending" | "error";

export type SyncDirection = "nesta_to_sheets" | "sheets_to_nesta" | "two_way";

export interface SheetColumnDef {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "boolean" | "json";
  required?: boolean;
  isId?: boolean;
}

export interface SheetTabSchema {
  tabName: string;
  entityName: string;
  idField: string;
  columns: SheetColumnDef[];
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  direction: SyncDirection;
  entity: string;
  recordId: string;
  companyId: string;
  status: "success" | "failed" | "conflict" | "skipped";
  changesSummary: string;
  errorMessage?: string;
}

export interface SyncConflictRecord {
  id: string;
  entity: string;
  recordId: string;
  companyId: string;
  detectedAt: string;
  nestaVersion: number;
  nestaData: Record<string, any>;
  nestaUpdatedAt: string;
  sheetsVersion: number;
  sheetsData: Record<string, any>;
  sheetsUpdatedAt: string;
  status: "pending_review" | "resolved_nesta" | "resolved_sheets" | "resolved_custom" | "dismissed";
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface SyncQueueItem {
  id: string;
  entity: string;
  recordId: string;
  companyId: string;
  operation: "insert" | "update" | "delete";
  data: Record<string, any>;
  attempts: number;
  maxAttempts: number;
  nextRetryTime: number;
  lastError?: string;
  enqueuedAt: string;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string | null;
  spreadsheetName: string | null;
  spreadsheetUrl: string | null;
  lastSyncTime: string | null;
  lastSyncStatus: "success" | "error" | "never";
  lastErrorMessage?: string;
  autoSyncEnabled: boolean;
  syncIntervalSeconds: number;
  testModeOnly: boolean; // Always true for sandboxed testing
}

export interface TestSuiteResult {
  spreadsheet: "PASS" | "FAIL" | "SKIPPED";
  tabs: "PASS" | "FAIL" | "SKIPPED";
  nestaToSheets: "PASS" | "FAIL" | "SKIPPED";
  sheetsToNesta: "PASS" | "FAIL" | "SKIPPED";
  conflict: "PASS" | "FAIL" | "SKIPPED";
  retry: "PASS" | "FAIL" | "SKIPPED";
  details: {
    testName: string;
    status: "PASS" | "FAIL" | "SKIPPED";
    message: string;
    durationMs: number;
    timestamp: string;
  }[];
}
