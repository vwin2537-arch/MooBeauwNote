/**
 * บันทึกของหมูบิว - Backend Script (Full Suite + Supervisor)
 * Version: 3.2.0
 * 
 * Features:
 * - แยกเก็บ Raw Data (JSON)
 * - แยกเก็บ Transactions, Categories, Budget, Settings (Columns)
 * - Supervisor Agent: ระบบตรวจสอบความถูกต้องอัตโนมัติ
 */

// ==================== CONFIG ====================
const DRIVE_FOLDER_ID = '191nzQNk3fA9sMkCYeVRzBo-h9w0qoMDe';
const SPREADSHEET_NAME = 'MuBew_Database';
const RAW_SHEET_NAME = 'Raw_Data';
const TX_SHEET_NAME = 'Transactions';
const CAT_SHEET_NAME = 'Categories';
const BUDGET_SHEET_NAME = 'Budget';
const SETTINGS_SHEET_NAME = 'Settings';

// ==================== MAIN FUNCTIONS ====================

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const data = postData.data;

    if (action === 'push') {
      saveToSheet(data);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('doPost Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback;

    if (action === 'pull') {
      const data = getFromStructuredSheets(); // ⭐ Pull from structured sheets instead of raw
      if (!callback) {
         return ContentService.createTextOutput(JSON.stringify(data))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(`${callback}(${JSON.stringify(data)})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ready', message: 'MuBew Backend v3.2.0 (Full Suite)' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('doGet Error: ' + error.toString());
    const errorMsg = JSON.stringify({ error: error.toString() });
    if (e.parameter && e.parameter.callback) {
      return ContentService.createTextOutput(`${e.parameter.callback}(${errorMsg})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(errorMsg)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== HELPER FUNCTIONS ====================

function getOrCreateSpreadsheet() {
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const files = folder.getFilesByName(SPREADSHEET_NAME);
    if (files.hasNext()) return SpreadsheetApp.openById(files.next().getId());
    
    const newSpreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
    const ssFile = DriveApp.getFileById(newSpreadsheet.getId());
    folder.addFile(ssFile);
    DriveApp.getRootFolder().removeFile(ssFile);
    return newSpreadsheet;
  } catch (e) {
    Logger.log('Error accessing folder: ' + e.toString());
    const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
    if (files.hasNext()) return SpreadsheetApp.openById(files.next().getId());
    return SpreadsheetApp.create(SPREADSHEET_NAME);
  }
}

function getOrCreateSheet(sheetName, providedSS = null) {
  const ss = providedSS || getOrCreateSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  return sheet;
}

/**
 * Main Save Function
 */
function saveToSheet(data) {
  // 1. Raw Data (The Source of Truth for App)
  saveRawData(data);
  
  // 2. Structured Sheets (The Source of Truth for Humans/Dashboards)
  if (data.transactions && Array.isArray(data.transactions)) {
    saveTransactionsAsColumns(data.transactions);
  }
  
  if (data.categories) {
    saveCategoriesAsColumns(data.categories);
  }

  if (data.budget) {
    saveBudgetAsColumns(data.budget);
  }

  if (data.settings) {
    saveSettingsAsColumns(data.settings);
  }
}

function saveRawData(data) {
  const sheet = getOrCreateSheet(RAW_SHEET_NAME);
  sheet.clear();
  const jsonString = JSON.stringify(data);
  const CHUNK_SIZE = 45000;
  const chunks = [];
  for (let i = 0; i < jsonString.length; i += CHUNK_SIZE) {
    chunks.push([jsonString.slice(i, i + CHUNK_SIZE)]);
  }
  if (chunks.length > 0) sheet.getRange(1, 1, chunks.length, 1).setValues(chunks);
  sheet.getRange(1, 2).setValue(new Date());
}

function saveTransactionsAsColumns(transactions) {
  const sheet = getOrCreateSheet(TX_SHEET_NAME);
  sheet.clear();
  const headers = ['Date', 'Time', 'Type', 'Category', 'Description', 'Amount', 'Note', 'ID'];
  const rows = transactions.map(t => {
    let dateStr = t.date;
    let timeStr = '';
    if (t.createdAt) {
      const d = new Date(t.createdAt);
      timeStr = d.toLocaleTimeString('th-TH');
    }
    return [
      dateStr, timeStr, t.type, t.category, t.description,
      parseFloat(t.amount), t.note || '', t.id
    ];
  });
  
  if (rows.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.getRange(2, 6, rows.length, 1).setNumberFormat('#,##0.00');
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function saveCategoriesAsColumns(categories) {
  const sheet = getOrCreateSheet(CAT_SHEET_NAME);
  sheet.clear();
  const headers = ['Type', 'Name', 'Icon', 'ID'];
  const rows = [];
  
  if (categories.income) categories.income.forEach(c => rows.push(['income', c.name, c.icon, c.id]));
  if (categories.expense) categories.expense.forEach(c => rows.push(['expense', c.name, c.icon, c.id]));
  
  if (rows.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.getRange(2, 3, rows.length, 1).setHorizontalAlignment('center');
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function saveBudgetAsColumns(budget) {
  const sheet = getOrCreateSheet(BUDGET_SHEET_NAME);
  sheet.clear();
  const headers = ['Monthly Budget', 'Alert Threshold (%)', 'Calculated Daily', 'Last Updated'];
  
  const daily = budget.monthlyBudget ? (budget.monthlyBudget / 30).toFixed(2) : 0;
  
  const row = [
    budget.monthlyBudget || 0,
    budget.alertThreshold || 80,
    daily,
    new Date()
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.getRange(2, 1, 1, headers.length).setValues([row]);
  sheet.getRange(2, 1, 1, 1).setNumberFormat('#,##0.00'); // Format Budget
  sheet.getRange(2, 3, 1, 1).setNumberFormat('#,##0.00'); // Format Daily
}

function saveSettingsAsColumns(settings) {
  const sheet = getOrCreateSheet(SETTINGS_SHEET_NAME);
  sheet.clear();
  const headers = ['Dark Mode', 'Notifications', 'Gas URL', 'Last Updated'];
  
  const row = [
    settings.darkMode ? 'ON' : 'OFF',
    settings.notifications ? 'ON' : 'OFF',
    settings.gasUrl || '-',
    new Date()
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.getRange(2, 1, 1, headers.length).setValues([row]);
}

function getFromSheet() {
  const sheet = getOrCreateSheet(RAW_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return {};
  const values = sheet.getRange(1, 1, lastRow, 1).getValues();
  let jsonString = '';
  values.forEach(row => { if (row[0]) jsonString += row[0]; });
  if (!jsonString) return {};
  try { return JSON.parse(jsonString); } catch (e) { return { error: 'Data corrupted' }; }
}

// ==================== READ FROM STRUCTURED SHEETS ====================

function getFromStructuredSheets() {
  const ss = getOrCreateSpreadsheet(); // ⭐ Open once!
  const data = {};
  
  // 1. Transactions
  data.transactions = getTransactionsFromSheet(ss);
  
  // 2. Categories
  data.categories = getCategoriesFromSheet(ss);
  
  // 3. Budget
  data.budget = getBudgetFromSheet(ss);
  
  // 4. Settings
  data.settings = getSettingsFromSheet(ss);
  
  return data;
}

function getTransactionsFromSheet(ss) {
  const sheet = getOrCreateSheet(TX_SHEET_NAME, ss);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues(); // A-H columns
  
  return values.map(row => {
    // row[0] = Date object from sheet
    // row[1] = Time string (HH:mm:ss) OR Date object
    let dateTime = row[0];
    if (row[0] instanceof Date) {
       let hours = 0, minutes = 0, seconds = 0;
       
       if (row[1] instanceof Date) {
         // Case 1: Time is a Date object (Google Sheets default for Time format)
         hours = row[1].getHours();
         minutes = row[1].getMinutes();
         seconds = row[1].getSeconds();
       } else if (typeof row[1] === 'string' && row[1].includes(':')) {
         // Case 2: Time is a string "HH:mm:ss"
         const timeParts = row[1].split(':');
         if (timeParts.length >= 2) {
           hours = parseInt(timeParts[0]);
           minutes = parseInt(timeParts[1]);
           seconds = parseInt(timeParts[2] || 0);
         }
       }
       
       // Set time to the date object
       if (hours || minutes || seconds) {
          dateTime.setHours(hours, minutes, seconds);
       }
    } else if (typeof row[0] === 'string') {
       dateTime = row[0]; // Fallback for string dates
    }

    return {
      date: convertDateToISO(row[0]), // Keep date as YYYY-MM-DD
      createdAt: dateTime, // Full timestamp
      type: row[2],
      category: row[3],
      description: row[4],
      amount: parseFloat(row[5]),
      note: row[6],
      id: row[7]
    };
  }).filter(t => t.id); // Filter out empty rows
}

function getCategoriesFromSheet(ss) {
  const sheet = getOrCreateSheet(CAT_SHEET_NAME, ss);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { expense: [], income: [] };
  
  const values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const categories = { expense: [], income: [] };
  
  values.forEach(row => {
    const type = row[0]; // income/expense
    const cat = {
      name: row[1],
      icon: row[2],
      id: row[3]
    };
    if (type === 'income') categories.income.push(cat);
    else if (type === 'expense') categories.expense.push(cat);
  });
  
  return categories;
}

function getBudgetFromSheet(ss) {
  const sheet = getOrCreateSheet(BUDGET_SHEET_NAME, ss);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  
  const values = sheet.getRange(2, 1, 1, 2).getValues();
  return {
    monthlyBudget: values[0][0],
    alertThreshold: values[0][1]
  };
}

function getSettingsFromSheet(ss) {
  const sheet = getOrCreateSheet(SETTINGS_SHEET_NAME, ss);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  
  const values = sheet.getRange(2, 1, 1, 3).getValues();
  return {
    darkMode: values[0][0] === 'ON',
    notifications: values[0][1] === 'ON',
    gasUrl: values[0][2] === '-' ? '' : values[0][2]
  };
}

function convertDateToISO(dateObj) {
  if (dateObj instanceof Date) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return dateObj; // Return as is if string
}

// ==================== SUPERVISOR AGENT ====================

/**
 * 🕵️‍♀️ Supervisor Agent Check
 * รันฟังก์ชันนี้เพื่อตรวจสอบความสมบูรณ์ของระบบ
 */
function runSupervisorCheck() {
  const ss = getOrCreateSpreadsheet();
  Logger.log('🕵️‍♀️ Supervisor Agent: Starting System Check...');
  
  // 1. Mock Data Test (ครบทุกประเภท: รายรับ + รายจ่าย)
  const mockData = {
    transactions: [
      { id: 'TEST-EXP-01', date: '2026-02-01', type: 'expense', category: 'Test Food', amount: 100, description: 'Test Expense' },
      { id: 'TEST-INC-01', date: '2026-02-01', type: 'income', category: 'Test Salary', amount: 50000, description: 'Test Income' }
    ],
    categories: { 
      expense: [{ id: 'TEST-C1', name: 'Test Food', icon: '🧪' }],
      income: [{ id: 'TEST-C2', name: 'Test Salary', icon: '💰' }]
    },
    budget: { monthlyBudget: 5000, alertThreshold: 90 },
    settings: { darkMode: true, notifications: false }
  };
  
  Logger.log('🔹 Step 1: Saving Mock Data (Income & Expense)...');
  saveToSheet(mockData);
  
  // 2. Verify Raw Data
  Logger.log('🔹 Step 2: Verifying Raw Data Integrity...');
  const loadedData = getFromSheet();
  if (JSON.stringify(loadedData) === JSON.stringify(mockData)) {
    Logger.log('✅ Raw Data Integrity: 100% Match');
  } else {
    Logger.log('❌ Raw Data Mismatch!');
  }
  
  // 3. Verify Sheets Existence & Headers
  const checks = [
    { name: RAW_SHEET_NAME, minRows: 1 },
    { name: TX_SHEET_NAME, minRows: 3 }, // Header + 2 Rows (Expense + Income)
    { name: CAT_SHEET_NAME, minRows: 3 }, // Header + 2 Rows (Expense + Income)
    { name: BUDGET_SHEET_NAME, minRows: 2 },
    { name: SETTINGS_SHEET_NAME, minRows: 2 }
  ];
  
  checks.forEach(check => {
    const sheet = ss.getSheetByName(check.name);
    if (!sheet) {
      Logger.log(`❌ Missing Sheet: ${check.name}`);
    } else {
      const rows = sheet.getLastRow();
      // Allow >= because manual runs might append or structure might vary slightly
      if (rows >= check.minRows) {
        Logger.log(`✅ Sheet '${check.name}' OK (${rows} rows)`);
      } else {
        Logger.log(`⚠️ Sheet '${check.name}' incomplete (Rows: ${rows}, Expected: ${check.minRows})`);
      }
    }
  });
  
  Logger.log('🏁 Supervisor Check Complete. Check logs for details.');
}
