const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'Files', 'Week Ending 1.2.25.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const referrals = data.filter(r => r.Type && r.Type.toLowerCase().includes('referral'));
console.log(JSON.stringify(referrals.slice(0, 10), null, 2));
console.log('Total Rows:', data.length);
console.log('Referral Rows:', referrals.length);
