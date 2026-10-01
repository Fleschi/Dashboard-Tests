import * as XLSX from "xlsx";
import { contentToPlainText, getAllImageSrcs } from "./editor/content";
import { outcomeLabel } from "./entryUtils";

export function exportToExcel(entries) {
  const rows = entries.map(e => {
    // Entries written under the new editor carry everything in `content`.
    // Entries from before this editor existed (and not yet migrated — see
    // step 8) have nothing there yet, so fall back to their legacy columns
    // for this export specifically, so nothing already journaled disappears
    // from the spreadsheet just because it hasn't been migrated.
    const journalText = contentToPlainText(e.content) || [e.daily_bias, e.notes, e.key_takeaway].filter(Boolean).join("\n\n");
    const images = getAllImageSrcs(e.content);
    const imageUrls = images.length
      ? images.join("\n")
      : [e.screenshot_htf_url, e.screenshot_tod_url, e.screenshot_my_trade_url].filter(Boolean).join("\n");

    return {
      "Date":                e.day || "",
      "Time of Entry":       e.time_entered || "",
      "Outcome":             outcomeLabel(e.pnl),
      "P&L":                 e.pnl != null ? e.pnl : "",
      "ToD Entry Time":      e.tod_time || "",
      "Journal":             journalText,
      "Images":              imageUrls,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto column width
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String(r[key] || "").length).slice(0, 20)),
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Journal");
  XLSX.writeFile(wb, "trading-journal.xlsx");
}
