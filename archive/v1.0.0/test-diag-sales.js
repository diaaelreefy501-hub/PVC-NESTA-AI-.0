import fs from 'fs';

// Look into initialData to see contracts
const content = fs.readFileSync('src/data/initialData.ts', 'utf8');
const lines = content.split('\n');

let inSales = false;
let currentSale = "";
for (let line of lines) {
    if (line.includes('export const initialSales: Sale[] = [')) {
        inSales = true;
    }
    
    if (inSales) {
        currentSale += line + '\n';
        if (line.trim() === '];') {
            break;
        }
    }
}
console.log("--- initialSales ---");
console.log(currentSale);

