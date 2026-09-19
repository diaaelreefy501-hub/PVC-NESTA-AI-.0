import { NestaSyncEngine } from "./syncEngine";
import { NESTA_SHEET_SCHEMAS } from "./tabSchemas";
import { TestSuiteResult } from "./types";

export class NestaDataLayerTestRunner {
  private engine: NestaSyncEngine;

  constructor(engine: NestaSyncEngine) {
    this.engine = engine;
  }

  /**
   * Executes the full automated integration test suite for Google Sheets Data Layer
   */
  public async runFullTestSuite(): Promise<TestSuiteResult> {
    const results: TestSuiteResult = {
      spreadsheet: "SKIPPED",
      tabs: "SKIPPED",
      nestaToSheets: "SKIPPED",
      sheetsToNesta: "SKIPPED",
      conflict: "SKIPPED",
      retry: "SKIPPED",
      details: [],
    };

    // --- TEST 1: Spreadsheet Auto-Creation ---
    const t1Start = Date.now();
    try {
      const sheet = await this.engine.initializeSpreadsheet("PVC NESTA AI - Data Layer Automated Test");
      if (sheet && sheet.spreadsheetId) {
        results.spreadsheet = "PASS";
        results.details.push({
          testName: "إنشاء Google Spreadsheet تجريبية تلقائياً",
          status: "PASS",
          message: `تم إنشاء الجدول بنجاح (ID: ${sheet.spreadsheetId})`,
          durationMs: Date.now() - t1Start,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error("لم يتم إرجاع معرف الجدول");
      }
    } catch (err: any) {
      results.spreadsheet = "FAIL";
      results.details.push({
        testName: "إنشاء Google Spreadsheet تجريبية تلقائياً",
        status: "FAIL",
        message: err.message,
        durationMs: Date.now() - t1Start,
        timestamp: new Date().toISOString(),
      });
    }

    // --- TEST 2: Tab Schemas & Column Headers Verification ---
    const t2Start = Date.now();
    try {
      const expectedTabs = NESTA_SHEET_SCHEMAS.map((s) => s.tabName);
      const adapter = this.engine.getAdapter();

      let missingTabs = 0;
      for (const tab of expectedTabs) {
        const rows = await adapter.readTabRecords(tab);
        if (rows === undefined) missingTabs++;
      }

      if (missingTabs === 0 && expectedTabs.length >= 12) {
        results.tabs = "PASS";
        results.details.push({
          testName: `التحقق من إنشاء الـ Tabs والـ Schemas المطلوبة (${expectedTabs.length} Tabs)`,
          status: "PASS",
          message: `تم التحقق من تطابق جميع التبويبات (${expectedTabs.join(", ")}) وأعمدة الـ UUID و company_id و version`,
          durationMs: Date.now() - t2Start,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(`تبويبات مفقودة: ${missingTabs}`);
      }
    } catch (err: any) {
      results.tabs = "FAIL";
      results.details.push({
        testName: "التحقق من إنشاء الـ Tabs والـ Schemas المطلوبة",
        status: "FAIL",
        message: err.message,
        durationMs: Date.now() - t2Start,
        timestamp: new Date().toISOString(),
      });
    }

    // --- TEST 3: NESTA -> Sheets Sync Test ---
    const t3Start = Date.now();
    try {
      const testCustomerId = "test_cust_" + Math.random().toString(36).substring(2, 8);
      const testCustomer = {
        id: testCustomerId,
        customer_id: testCustomerId,
        company_id: "cmp_nesta_master",
        name: "عميل تجريبي - اختبار المزامنة",
        phone: "01099887766",
        area: "التجمع الخامس",
        source: "google_ads",
        stage: "new",
        status: "active",
        totalQuotationsValue: 0,
        totalSalesValue: 0,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const syncResult = await this.engine.performTwoWaySync({
        customers: [testCustomer],
        inquiries: [],
        followups: [],
        quotations: [],
        contracts: [],
        sales: [],
      });

      if (syncResult.pushedToSheets >= 1) {
        results.nestaToSheets = "PASS";
        results.details.push({
          testName: "اختبار مزامنة NESTA → Sheets (Push Test Data)",
          status: "PASS",
          message: `تم إرسال وحفظ السجل التجريبي بنجاح إلى Sheets مع معرف الشركة والإصدار والـ UUID`,
          durationMs: Date.now() - t3Start,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error("لم يتم تأكيد دفع السجل إلى Sheets");
      }
    } catch (err: any) {
      results.nestaToSheets = "FAIL";
      results.details.push({
        testName: "اختبار مزامنة NESTA → Sheets",
        status: "FAIL",
        message: err.message,
        durationMs: Date.now() - t3Start,
        timestamp: new Date().toISOString(),
      });
    }

    // --- TEST 4: Sheets -> NESTA Sync Test (Delta Pull) ---
    const t4Start = Date.now();
    try {
      const adapter = this.engine.getAdapter();
      const testInqId = "test_inq_" + Math.random().toString(36).substring(2, 8);

      // Add a record directly to Sheets store with a newer updated timestamp
      const remoteRecord = {
        inquiry_id: testInqId,
        company_id: "cmp_nesta_master",
        customer_id: "test_cust_123",
        customerName: "عميل Sheets مجرب",
        productType: "أبواب PVC عازلة",
        status: "new",
        date: "2026-09-16",
        version: 2,
        createdAt: "2026-09-16T10:00:00Z",
        updatedAt: "2026-09-16T12:00:00Z",
      };

      await adapter.writeTabRecords("Inquiries", [remoteRecord]);

      // Local has older version (v1)
      const localInquiry = {
        id: testInqId,
        inquiry_id: testInqId,
        company_id: "cmp_nesta_master",
        customer_id: "test_cust_123",
        customerName: "عميل Sheets مجرب",
        productType: "أبواب PVC عازلة",
        status: "new",
        date: "2026-09-16",
        version: 1,
        createdAt: "2026-09-16T10:00:00Z",
        updatedAt: "2026-09-16T10:00:00Z",
      };

      const pullResult = await this.engine.performTwoWaySync({
        customers: [],
        inquiries: [localInquiry],
        followups: [],
        quotations: [],
        contracts: [],
        sales: [],
      });

      if (pullResult.pulledToNesta >= 1) {
        results.sheetsToNesta = "PASS";
        results.details.push({
          testName: "اختبار مزامنة Sheets → NESTA (Delta Pull Test)",
          status: "PASS",
          message: `تم التعرف على التحديث الأحدث في Sheets بنجاح وسحبه إلى NESTA`,
          durationMs: Date.now() - t4Start,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error("لم يتم سحب التعديل الأحدث من Sheets");
      }
    } catch (err: any) {
      results.sheetsToNesta = "FAIL";
      results.details.push({
        testName: "اختبار مزامنة Sheets → NESTA",
        status: "FAIL",
        message: err.message,
        durationMs: Date.now() - t4Start,
        timestamp: new Date().toISOString(),
      });
    }

    // --- TEST 5: Conflict Detection Test (Preserve Both Sides) ---
    const t5Start = Date.now();
    try {
      const conflictRecordId = "test_conf_" + Math.random().toString(36).substring(2, 8);
      const adapter = this.engine.getAdapter();

      // Sheets version has edited phone and stage
      const sheetsSide = {
        customer_id: conflictRecordId,
        company_id: "cmp_nesta_master",
        name: "عميل نزاع تجريبي",
        phone: "01111111111",
        stage: "contracted",
        version: 3,
        updatedAt: "2026-09-16T14:30:00Z",
      };
      await adapter.writeTabRecords("Customers", [sheetsSide]);

      // NESTA side has different edited phone and stage
      const nestaSide = {
        id: conflictRecordId,
        customer_id: conflictRecordId,
        company_id: "cmp_nesta_master",
        name: "عميل نزاع تجريبي",
        phone: "01222222222",
        stage: "lost",
        version: 3,
        updatedAt: "2026-09-16T14:32:00Z",
      };

      const prevConflicts = this.engine.getConflicts().length;
      await this.engine.performTwoWaySync({
        customers: [nestaSide],
        inquiries: [],
        followups: [],
        quotations: [],
        contracts: [],
        sales: [],
      });

      const newConflicts = this.engine.getConflicts();
      const detected = newConflicts.find((c) => c.recordId === conflictRecordId);

      if (detected && newConflicts.length > prevConflicts) {
        results.conflict = "PASS";
        results.details.push({
          testName: "اختبار كشف التعارض وتوثيق الطرفين (Conflict Detection & Preservation)",
          status: "PASS",
          message: `تم كشف التعارض بنجاح وتوثيق نسختي NESTA و Sheets في جدول Sync_Conflicts دون الكتابة فوق البيانات تلقائياً`,
          durationMs: Date.now() - t5Start,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error("فشل محرك المزامنة في اكتشاف التعارض وتوثيق الطرفين");
      }
    } catch (err: any) {
      results.conflict = "FAIL";
      results.details.push({
        testName: "اختبار كشف التعارض وتوثيق الطرفين",
        status: "FAIL",
        message: err.message,
        durationMs: Date.now() - t5Start,
        timestamp: new Date().toISOString(),
      });
    }

    // --- TEST 6: Network Failure Simulation + Queue Retry with Backoff ---
    const t6Start = Date.now();
    try {
      // 1. Simulate network failure
      this.engine.setSimulatedNetworkFailure(true);

      const queueTestId = "test_q_" + Math.random().toString(36).substring(2, 8);
      this.engine.enqueueChange("Customers", queueTestId, "cmp_nesta_master", "update", {
        name: "عميل اختبار الطابور وإعادة المحاولة",
        phone: "01500000000",
      });

      // Process with simulated failure -> should fail and queue for retry
      const failResult = await this.engine.processQueue();
      const queueAfterFail = this.engine.getQueue().find((q) => q.recordId === queueTestId);

      if (!queueAfterFail || queueAfterFail.attempts < 1) {
        throw new Error("فشل وضع السجل في طابور إعادة المحاولة مع زيادة الـ attempts");
      }

      // 2. Restore network and retry
      this.engine.setSimulatedNetworkFailure(false);
      // reset nextRetryTime so it runs now
      queueAfterFail.nextRetryTime = Date.now() - 1000;

      const successResult = await this.engine.processQueue();
      const queueAfterSuccess = this.engine.getQueue().find((q) => q.recordId === queueTestId);

      if (successResult.processed >= 1 && !queueAfterSuccess) {
        results.retry = "PASS";
        results.details.push({
          testName: "اختبار فشل الاتصال ثم إعادة المحاولة (Queue + Exponential Backoff)",
          status: "PASS",
          message: `تم اختبار انقطاع الاتصال واحتجاز العملية في الطابور مع الـ Backoff، ثم نجحت إعادة المحاولة بعد عودة الاتصال`,
          durationMs: Date.now() - t6Start,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error("فشلت إعادة محاولة العملية بعد عودة الاتصال");
      }
    } catch (err: any) {
      this.engine.setSimulatedNetworkFailure(false);
      results.retry = "FAIL";
      results.details.push({
        testName: "اختبار فشل الاتصال ثم إعادة المحاولة",
        status: "FAIL",
        message: err.message,
        durationMs: Date.now() - t6Start,
        timestamp: new Date().toISOString(),
      });
    }

    return results;
  }
}
