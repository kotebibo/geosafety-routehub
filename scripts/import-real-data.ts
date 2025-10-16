/**
 * Real Data Import Script - Part 1: Core Functions
 * Imports actual company data from Excel files into the database
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Types matching your actual data structure
export interface CompanyData {
  name: string;
  person: string;
  identificationNumber: string;
  category: string;
  activity: string;
  generalStatus: string;
  monthlyReport?: string;
  lastVisit?: Date | null;
  startDate?: Date | null;
  firstMeetingDate?: Date | null;
  policyDocStatus?: string;
  director?: string;
  contact?: string;
  email?: string;
  address?: string;
  city?: string;
  salesRep?: string;
}

// Parse date strings from Excel
export function parseExcelDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  if (typeof dateValue === 'number') {
    // Excel serial date
    return new Date((dateValue - 25569) * 86400 * 1000);
  }
  
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

// Extract Georgian addresses and normalize them
export function parseAddress(address: string): { street: string; city: string } {
  if (!address) return { street: '', city: 'თბილისი' };
  
  // Check if Batumi or Tbilisi
  const isBatumi = address.toLowerCase().includes('ბათუმი');
  const city = isBatumi ? 'ბათუმი' : 'თბილისი';
  
  // Extract street information
  let street = address
    .replace(/ქ\.\s*თბილისი,?/gi, '')
    .replace(/ქ\.\s*ბათუმი,?/gi, '')
    .trim();
  
  return { street, city };
}
// Part 2: Import Functions

// Import data from main contact file
export async function importMainContactData(filePath: string): Promise<CompanyData[]> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header row
  const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Skip header rows and map data
  const companies: CompanyData[] = data.slice(3).filter(row => row[0]).map(row => {
    const addressData = parseAddress(row[9] || '');
    
    return {
      name: row[0] || '',
      person: row[1] || '',
      identificationNumber: row[2]?.toString() || '',
      category: row[3] || '',
      activity: row[4] || '',
      generalStatus: row[5] || '',
      director: row[6] || '',
      contact: row[7] || '',
      email: row[8] || '',
      address: addressData.street,
      city: addressData.city,
    };
  });
  
  return companies;
}

// Import individual sales representative data
export async function importSalesRepData(filePath: string, repName: string): Promise<CompanyData[]> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const companies = data.slice(3).filter(row => row[0]).map(row => {
    const addressData = parseAddress(row[20] || '');
    
    return {
      name: row[0] || '',
      person: row[1] || '',
      identificationNumber: row[2]?.toString() || '',
      category: row[3] || '',
      activity: row[4] || '',
      generalStatus: row[5] || '',
      monthlyReport: row[6] || '',
      lastVisit: parseExcelDate(row[7]) || undefined,
      startDate: parseExcelDate(row[8]) || undefined,
      firstMeetingDate: parseExcelDate(row[9]) || undefined,
      policyDocStatus: row[10] || '',
      director: row[17] || '',
      contact: row[18] || '',
      email: row[19] || '',
      address: addressData.street,
      city: addressData.city,
      salesRep: repName,
    };
  });
  
  return companies;
}
// Part 3: Data Generator & Main Function

// Generate seed data with statistics
export function generateCompanySeeds(companies: CompanyData[]) {
  // Calculate statistics
  const byCategory = companies.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byCity = companies.reduce((acc, c) => {
    const city = c.city || 'თბილისი';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byActivity = companies.reduce((acc, c) => {
    acc[c.activity] = (acc[c.activity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    companies,
    stats: {
      total: companies.length,
      byCategory,
      byCity,
      byActivity,
      withEmail: companies.filter(c => c.email).length,
      withPhone: companies.filter(c => c.contact).length,
    }
  };
}

// Main execution function
export async function main() {
  const sourceDir = 'C:\\Users\\HP\\Downloads';
  const outputDir = 'D:\\geosafety-routehub\\data\\seeds';
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('🚀 Starting data import from Excel files...\n');
  
  // Import main contact file
  const mainContactFile = path.join(sourceDir, 'პერსონალური მონაცემები საკონტაქტოები  მისმართები.xlsx');
  const mainContacts = await importMainContactData(mainContactFile);
  console.log(`✅ Imported ${mainContacts.length} companies from main contact file`);
  
  // Import sales rep files
  const salesReps = [
    { name: 'ამირან ჯაფარიძე', file: 'ამირან ჯაფარიძე- პრემიუმი.xlsx' },
    { name: 'ანამარია ბაგალიშვილი', file: 'ანამარია ბაგალიშვილი პრემიუმი.xlsx' },
    { name: 'გიორგი გამხიტაშვილი', file: 'გიორგი გამხიტაშვილი პრემიუმი.xlsx' },
    { name: 'გიორგი კაკუბავა', file: 'გიორგი კაკუბავა პრემიუმი.xlsx' },
    { name: 'ლაშა უსტიაშვილი', file: 'ლაშა უსტიაშვილი პრემიუმი.xlsx' },
    { name: 'მარიამ ინასარიძე', file: 'მარიამ ინასარიძე პრემიუმი.xlsx' },
    { name: 'სალომე სულხანიშვილი', file: 'სალომე სულხანიშვილი პრემიუმი.xlsx' },
  ];
  
  let allCompanies: CompanyData[] = [...mainContacts];
  
  for (const rep of salesReps) {
    try {
      const filePath = path.join(sourceDir, rep.file);
      if (fs.existsSync(filePath)) {
        const repCompanies = await importSalesRepData(filePath, rep.name);
        allCompanies.push(...repCompanies);
        console.log(`✅ Imported ${repCompanies.length} companies from ${rep.name}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not import ${rep.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Generate seed data with stats
  const seedData = generateCompanySeeds(allCompanies);
  
  // Write to JSON file
  const outputPath = path.join(outputDir, 'real-company-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(seedData, null, 2), 'utf-8');
  
  console.log(`\n📊 DATA IMPORT COMPLETE!\n`);
  console.log(`Total Companies: ${seedData.stats.total}`);
  console.log(`\nBy Category:`);
  Object.entries(seedData.stats.byCategory).forEach(([cat, count]) => {
    console.log(`  - ${cat}: ${count}`);
  });
  console.log(`\nBy City:`);
  Object.entries(seedData.stats.byCity).forEach(([city, count]) => {
    console.log(`  - ${city}: ${count}`);
  });
  console.log(`\nContact Info:`);
  console.log(`  - With Email: ${seedData.stats.withEmail}`);
  console.log(`  - With Phone: ${seedData.stats.withPhone}`);
  console.log(`\n📁 Data saved to: ${outputPath}`);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
