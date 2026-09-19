import * as fs from "fs";

// Read temp_reconcile_run.js
const fileContent = fs.readFileSync("temp_reconcile_run.js", "utf8");

// We need to evaluate or extract dbSales and dbInteractions from the file.
// Let's use a dynamic function execution or regex to extract them.
const dbSalesMatch = fileContent.match(/const dbSales = (\[[\s\S]*?\]);/);
const dbInteractionsMatch = fileContent.match(/const dbInteractions = (\[[\s\S]*?\]);/);

if (!dbSalesMatch || !dbInteractionsMatch) {
  console.error("Could not find dbSales or dbInteractions in temp_reconcile_run.js");
  process.exit(1);
}

const dbSales = JSON.parse(dbSalesMatch[1]);
const dbInteractions = JSON.parse(dbInteractionsMatch[1]);

console.log(`Loaded ${dbSales.length} sales from file.`);
console.log(`Loaded ${dbInteractions.length} interactions from file.`);

// Extract customers from sales
const customersFromSales = new Map<string, any>();
dbSales.forEach((s: any) => {
  if (s.customerId) {
    customersFromSales.set(s.customerId, {
      id: s.customerId,
      name: s.customerName,
      phone: s.customerPhone || "",
      area: s.area || "غير محدد",
      companyId: s.companyId,
      source: "sales",
    });
  }
});

// Extract customers from interactions (opportunity_sync)
const customersFromOpps = new Map<string, any>();
dbInteractions.forEach((i: any) => {
  if (i.type === "opportunity_sync" && i.notes) {
    try {
      const opp = JSON.parse(i.notes);
      if (opp.customerId) {
        customersFromOpps.set(opp.customerId, {
          id: opp.customerId,
          name: opp.customerName,
          phone: opp.customerPhone || "",
          area: opp.area || "غير محدد",
          companyId: opp.companyId,
          source: "interactions",
        });
      }
    } catch (e) {
      // ignore
    }
  }
});

console.log(`Unique Customers in Sales: ${customersFromSales.size}`);
console.log(`Unique Customers in Interactions: ${customersFromOpps.size}`);

// Merge them
const allCustomers = new Map<string, any>();
customersFromSales.forEach((c, id) => allCustomers.set(id, c));
customersFromOpps.forEach((c, id) => {
  if (allCustomers.has(id)) {
    const existing = allCustomers.get(id);
    allCustomers.set(id, { ...existing, ...c, source: "both" });
  } else {
    allCustomers.set(id, c);
  }
});

console.log(`Total Unique Customers extracted: ${allCustomers.size}`);

// Check intersection of names
const salesNames = new Set(Array.from(customersFromSales.values()).map(c => c.name.trim().toLowerCase()));
const oppsNames = new Set(Array.from(customersFromOpps.values()).map(c => c.name.trim().toLowerCase()));
const nameIntersection = [...salesNames].filter(name => oppsNames.has(name));
console.log(`Overlap of customer names between Sales and Interactions: ${nameIntersection.length} names.`);
if (nameIntersection.length > 0) {
  console.log("Sample overlapping names:", nameIntersection.slice(0, 10));
}
