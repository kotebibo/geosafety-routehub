const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Analyze specific contracts file
const contractFile = 'C:/Users/HP/Downloads/_1762605430.xlsx';

console.log('=== CONTRACTS FILE ANALYSIS ===\n');

const workbook = XLSX.readFile(contractFile);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Sheet Name:', sheetName);
console.log('Total rows:', data.length);

// Find the header row (should have "Name" in first column)
for (let i = 0; i < Math.min(10, data.length); i++) {
  const row = data[i];
  if (row && row.length > 0) {
    if (row[0] === 'Name') {
      console.log('\nHeaders found at row', i, ':');
      console.log(JSON.stringify(row, null, 2));

      // Show 2 sample data rows
      if (data[i+1]) {
        console.log('\nSample row 1:', JSON.stringify(data[i+1], null, 2));
      }
      if (data[i+2]) {
        console.log('\nSample row 2:', JSON.stringify(data[i+2], null, 2));
      }
      break;
    } else {
      console.log(`Row ${i}: ${String(row[0]).substring(0, 50)}`);
    }
  }
}

// Now check inspector files for comparison
console.log('\n\n=== INSPECTOR FILES COMPARISON ===\n');

const inspectorFiles = [
  'C:/Users/HP/Downloads/_1762778421.xlsx',
  'C:/Users/HP/Downloads/_1762778517.xlsx',
];

inspectorFiles.forEach(file => {
  const wb = XLSX.readFile(file);
  const sn = wb.SheetNames[0];
  const sh = wb.Sheets[sn];
  const d = XLSX.utils.sheet_to_json(sh, { header: 1 });

  console.log('\nFile:', path.basename(file), '- Sheet:', sn);

  for (let i = 0; i < Math.min(10, d.length); i++) {
    const row = d[i];
    if (row && row[0] === 'Name') {
      console.log('Headers:', row.slice(0, 12).join(' | '));
      break;
    }
  }
});
