import fs from 'fs';

// Look into initialData to see contracts
const content = fs.readFileSync('src/data/initialData.ts', 'utf8');
const lines = content.split('\n');

let inContracts = false;
let currentContract = "";
for (let line of lines) {
    if (line.includes('export const initialContracts: Contract[] = [')) {
        inContracts = true;
    }
    
    if (inContracts) {
        currentContract += line + '\n';
        if (line.trim() === '];') {
            break;
        }
    }
}
console.log("--- initialContracts ---");
console.log(currentContract);

