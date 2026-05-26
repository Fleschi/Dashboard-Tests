import * as XLSX from "xlsx";

export function parseExcelFile(file, sheetIndex = 1) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[sheetIndex]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const parsed = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const pnl = row[2];
          if (pnl === undefined || pnl === null || pnl === "") continue;

          const pnlNum = parseFloat(String(pnl).replace(",", "."));
          if (isNaN(pnlNum)) continue;

          let wrNum = parseFloat(String(row[1]).replace("%", "").replace(",", "."));
          if (wrNum > 1) wrNum = wrNum / 100;

          parsed.push({
            week: row[0] ? String(row[0]) : `Woche ${i}`,
            wr: isNaN(wrNum) ? 0 : wrNum,
            pnl: pnlNum,
            trades: parseInt(row[3]) || 0,
            beTrades: parseInt(row[4]) || 0,
            beWon: parseInt(row[5]) || 0,
          });
        }

        if (parsed.length === 0) {
          reject("Keine gültigen Daten gefunden. Prüfe ob Spalte C (PnL) Zahlen enthält.");
          return;
        }
        resolve(parsed);
      } catch (err) {
        reject("Fehler beim Lesen der Datei: " + err.message);
      }
    };
    reader.onerror = () => reject("Datei konnte nicht gelesen werden.");
    reader.readAsBinaryString(file);
  });
}