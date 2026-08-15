import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'C:\\Users\\Admin\\Downloads\\ទិន្នន័យសាលា.xlsx';

try {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  
  console.log(`Found ${sheetNames.length} sheets in ${filePath}`);
  
  sheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(JSON.stringify(data, null, 2));
  });
} catch (e) {
  console.error("Error reading excel file:", e);
}
