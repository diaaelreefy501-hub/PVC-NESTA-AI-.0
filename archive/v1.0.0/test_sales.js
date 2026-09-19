const fs = require('fs');

const initialDataStr = fs.readFileSync('src/data/initialData.ts', 'utf8');
const companiesMatch = initialDataStr.match(/initialCompanies: Company\[\] = \[\s*([\s\S]*?)\];/);
const salesMatch = initialDataStr.match(/initialSales: Sale\[\] = \[\s*([\s\S]*?)\];/);

console.log("Companies:", companiesMatch ? "found" : "not found");
console.log("Sales:", salesMatch ? "found" : "not found");
