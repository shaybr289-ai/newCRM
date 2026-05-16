import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 */
export function exportToCSV(data, keys, headers, filename) {
  if (!data || data.length === 0) {
    alert('אין נתונים ליצוא');
    return;
  }

  const wsData = [headers];
  data.forEach(item => {
    wsData.push(keys.map(key => item[key] ?? ''));
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Import Excel/CSV data
 * Returns { headers, rows } where rows is array of objects keyed by header name
 */
export function importCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!jsonData.length) {
          reject(new Error('הקובץ ריק'));
          return;
        }

        const headers = Object.keys(jsonData[0]);
        console.log('[Import] Headers detected:', headers);
        console.log('[Import] First row:', jsonData[0]);
        console.log('[Import] Total rows:', jsonData.length);

        resolve({ headers, rows: jsonData });
      } catch (err) {
        reject(new Error('שגיאה בקריאת הקובץ: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Find a value in a row by trying multiple possible header names
 */
export function findColumn(row, possibleNames) {
  for (const name of possibleNames) {
    // Exact match
    if (row[name] !== undefined && row[name] !== '') return String(row[name]);
    // Case-insensitive match
    const key = Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase());
    if (key && row[key] !== undefined && row[key] !== '') return String(row[key]);
  }
  // Try partial match
  for (const name of possibleNames) {
    const key = Object.keys(row).find(k => k.includes(name) || name.includes(k));
    if (key && row[key] !== undefined && row[key] !== '') return String(row[key]);
  }
  return '';
}
