const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const oldUpdateCustomer = `  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    let finalCustomer: Customer | null = null;
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          finalCustomer = {
            ...c,
            ...updates,
            area: updates.area !== undefined ? (updates.area.trim() ? normalizeArea(updates.area) : "") : c.area,
            lastContactDate: updates.lastContactDate !== undefined ? updates.lastContactDate : c.lastContactDate,
            updatedAt: new Date().toISOString(),
          };
          return finalCustomer;
        }
        return c;
      })
    );`;

const newUpdateCustomer = `  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    const oldCust = customers.find((c) => c.id === id);
    if (!oldCust) return;
    const finalCustomer = {
      ...oldCust,
      ...updates,
      area: updates.area !== undefined ? (updates.area.trim() ? normalizeArea(updates.area) : "") : oldCust.area,
      lastContactDate: updates.lastContactDate !== undefined ? updates.lastContactDate : oldCust.lastContactDate,
      updatedAt: new Date().toISOString(),
    };
    
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? finalCustomer : c))
    );`;

if(content.includes(oldUpdateCustomer)) {
    content = content.replace(oldUpdateCustomer, newUpdateCustomer);
    
    // Also we need to fix the reference to `oldCust` lower down because we already defined it
    const oldIfFinal = `    if (finalCustomer) {
      const oldCust = customers.find((c) => c.id === id);`;
    const newIfFinal = `    if (finalCustomer) {`;
    content = content.replace(oldIfFinal, newIfFinal);
    
    fs.writeFileSync('src/context/AppContext.tsx', content);
    console.log("Patched updateCustomer successfully!");
} else {
    console.log("Failed to find updateCustomer pattern");
}
