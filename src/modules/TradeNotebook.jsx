import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import {
  loadNotebookEntries, saveNotebookEntry, updateNotebookEntry,
  deleteNotebookEntry, uploadNotebookScreenshot,
} from "../utils/supabase";
import { fmt } from "../utils/calculations";

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Every value here (day, time, pnl, notes, ...) is entered directly on this
// journal form — none of it is derived from the (backtesting) trades table.

function entryTimestamp(e) {
  if (!e.day) return 0;
  const d = new Date(`${e.day}T${e.time_entered || "00:00"}`);
  return isNaN(d) ? 0 : d.getTime();
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => entryTimestamp(b) - entryTimestamp(a));
}

// "faded" = journaled but no trade taken that day, so pnl is null.
function outcomeLabel(pnl) {
  if (pnl === null || pnl === undefined) return "FADED";
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BE";
}

function outcomeMeta(pnl, D) {
  const label = outcomeLabel(pnl);
  const color = label === "WIN" ? D.green : label === "LOSS" ? D.red : label === "BE" ? D.yellow : D.textMuted;
  return { label, color };
}

// Display formatting for the "day" (YYYY-MM-DD) + optional "time" (HH:MM) columns.
function fmtEntryDate(day, time) {
  if (!day) return "—";
  const [y, m, d] = day.split("-");
  if (!y || !m || !d) return day;
  const datePart = `${d}/${m}/${y.slice(2)}`;
  return time ? `${datePart} · ${time.slice(0, 5)}` : datePart;
}

const emptyForm = () => ({
  day:             "",   // "YYYY-MM-DD" — required
  time:            "",   // "HH:MM" — optional, my trade's entry time
  dailyBias:       "",   // "Bullish" | "Bearish"
  pnl:             "",   // optional — blank means no trade taken that day
  todTime:         "",   // "HH:MM" — optional, time of the Trade of the Day
  notes:           "",
  keyTakeaway:     "",
  fileDailyBias:   null,
  fileTOD:         null,
  fileMyTrade:     null,
  existingDailyBiasUrl: null,
  existingTODUrl:       null,
  existingMyTradeUrl:   null,
});

// ─── Small UI ─────────────────────────────────────────────────────────────────

function SelBtn({ label, active, color, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "7px 18px", borderRadius: 8,
      border: `1px solid ${active ? color : "transparent"}`,
      background: active ? `${color}18` : "transparent",
      color: active ? color : "#525252",
      fontSize: 14, cursor: "pointer", fontWeight: active ? 600 : 400,
      transition: "all 0.15s",
    }}>{label}</button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: "#525252", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, style = {}, placeholder, D, type = "text", disabled = false }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} style={{
      background: D.bg, border: `1px solid ${D.border}`,
      borderRadius: 8, color: D.text, padding: "7px 10px",
      // maxWidth is a ceiling only (width stays 100% of the field's own column),
      // so these stay full-size where the column is already narrow (mobile),
      // but stop stretching into oversized boxes on wide desktop layouts.
      fontSize: 13, outline: "none", width: "100%", maxWidth: 120, boxSizing: "border-box", ...style,
    }} />
  );
}

function Textarea({ value, onChange, D, rows = 4, minHeight, fontSize = 14, lineHeight = 1.5 }) {
  return (
    <textarea value={value} onChange={onChange} rows={rows} style={{
      background: D.bg, border: `1px solid ${D.border}`,
      borderRadius: 8, color: D.text, padding: "15px 17px",
      fontSize, lineHeight, fontFamily: "inherit", outline: "none", resize: "vertical",
      width: "100%", boxSizing: "border-box", minHeight,
    }} />
  );
}

function ImageLightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 48, cursor: "zoom-out",
      }}
    >
      <button
        onClick={onClose}
        title="Close"
        style={{
          position: "fixed", top: 20, right: 24, zIndex: 2001,
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)",
          color: "#fff", fontSize: 20, lineHeight: 1, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        ×
      </button>
      <img
        src={src}
        alt="Journal attachment"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: "90vw", maxHeight: "90vh",
          width: "auto", height: "auto",
          objectFit: "contain", borderRadius: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          cursor: "default", display: "block",
        }}
      />
    </div>
  );
}

function AttachButton({ label, file, existingUrl, onFile, onClear, onOpenLightbox, D, uploading }) {
  const ref = useRef();
  const localPreview = file ? URL.createObjectURL(file) : null;
  const displaySrc   = localPreview || existingUrl || null;
  const isLocal      = !!localPreview;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {!displaySrc ? (
        <button type="button" onClick={() => ref.current.click()} style={{
          padding: "8px 18px", borderRadius: 8, border: `1px solid ${D.border}`,
          background: "transparent", color: D.textMuted, fontSize: 13, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, width: "fit-content",
        }}>
          <span style={{ fontSize: 14 }}>📎</span> {label}
        </button>
      ) : (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img src={displaySrc} alt={label}
            style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, border: `1px solid ${D.border}`, display: "block", cursor: "pointer", objectFit: "contain" }}
            onClick={() => onOpenLightbox(displaySrc)}
          />
          <span style={{ position: "absolute", bottom: 6, left: 6, background: isLocal ? "rgba(255,180,0,0.85)" : "rgba(0,180,80,0.85)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>
            {isLocal ? "New (unsaved)" : "Saved"}
          </span>
          <button type="button" onClick={() => ref.current.click()} style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 10, padding: "3px 8px" }}>Replace</button>
          <button type="button" onClick={onClear} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.75)", border: "none", borderRadius: "50%", width: 24, height: 24, color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      )}
      {uploading && <span style={{ fontSize: 11, color: D.textMuted }}>Uploading…</span>}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ─── JournalList (compact overview — list view) ────────────────────────────────
// Clicking a row opens the SAME entry editor used to create a new entry
// (see the "Form" block in the main component below), pre-filled with this
// entry's data — there is no separate read-only view.

function JournalList({ entries, D, onOpen }) {
  if (!entries.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      {entries.map(e => {
        const meta = outcomeMeta(e.pnl, D);
        const hasPnl = e.pnl != null;
        return (
          <button
            key={e.id}
            onClick={() => onOpen(e)}
            style={{
              display: "flex", flexDirection: "column", padding: 0, width: "100%",
              background: D.card, border: `1px solid ${D.border}`, borderRadius: D.radius ?? 4,
              overflow: "hidden", cursor: "pointer", textAlign: "left", font: "inherit",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={ev => { ev.currentTarget.style.borderColor = D.textMuted; }}
            onMouseLeave={ev => { ev.currentTarget.style.borderColor = D.border; }}
          >
            {/* Compact metadata header — everything on one line instead of stacked rows */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              padding: "10px 14px", background: D.bg, borderBottom: `1px solid ${D.border}`,
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: D.textMuted, fontWeight: 500, whiteSpace: "nowrap" }}>
                {fmtEntryDate(e.day, e.time_entered)}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ ...pillStyle(D, meta.color), fontSize: 10, padding: "3px 8px" }}>{meta.label}</span>
                <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: hasPnl ? meta.color : D.textMuted }}>
                  {hasPnl ? fmt(e.pnl) : "—"}
                </span>
              </div>
            </div>

            {/* Execution image — fixed presentation ratio; the image never dictates card size */}
            {e.screenshot_my_trade_url ? (
              <div style={{ width: "100%", aspectRatio: "2273 / 1291", background: D.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={e.screenshot_my_trade_url}
                  alt="Trade execution"
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              </div>
            ) : (
              <div style={{ width: "100%", aspectRatio: "2273 / 1291", display: "flex", alignItems: "center", justifyContent: "center", color: D.textMuted, fontSize: 11 }}>
                No execution image
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
const pillStyle = (D, color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", background: `${color}15`, color, border: `1px solid ${color}30` });
const groupStyle = (D) => ({ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column" });
const groupLabelStyle = (D) => ({ fontSize: 12, fontWeight: 600, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 });

// ─── JournalCalendar (compact overview — calendar view) ────────────────────────

function JournalCalendar({ entries, D, onOpen }) {
  const latestEntry = entries[0] || null; // entries are sorted newest-first
  const latestDate = latestEntry?.day ? new Date(`${latestEntry.day}T00:00:00`) : new Date();

  const [viewDate, setViewDate] = useState(isNaN(latestDate) ? new Date() : latestDate);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName   = viewDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayRaw = new Date(year, month, 1).getDay();
  const firstDay    = (firstDayRaw + 6) % 7; // Monday-first

  // One entry per calendar day — entries are newest-first, so the first one
  // seen for a given day-of-month is the one we keep.
  const byDay = {};
  for (const e of entries) {
    if (!e.day) continue;
    const d = new Date(`${e.day}T00:00:00`);
    if (isNaN(d) || d.getFullYear() !== year || d.getMonth() !== month) continue;
    if (!byDay[d.getDate()]) byDay[d.getDate()] = e;
  }

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();

  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: D.text }}>{monthName}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={calNavBtnStyle(D)}>←</button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={calNavBtnStyle(D)}>→</button>
        </div>
      </div>

      {/* Weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: D.textMuted, padding: "3px 0", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const entry = byDay[day];
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

          if (!entry) {
            return (
              <div key={day} style={{ border: `1px solid ${isToday ? D.blue : D.border}`, borderRadius: 6, padding: "6px 5px", minHeight: 68 }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? D.blue : D.textMuted }}>{day}</div>
              </div>
            );
          }

          const meta = outcomeMeta(entry.pnl, D);
          const hasPnl = entry.pnl != null;
          return (
            <button
              key={day}
              onClick={() => onOpen(entry)}
              title={fmtEntryDate(entry.day, entry.time_entered)}
              style={{
                background: `${meta.color}15`, border: `1px solid ${isToday ? D.blue : `${meta.color}35`}`,
                borderRadius: 6, padding: "6px 5px", minHeight: 68, cursor: "pointer", textAlign: "left",
                display: "flex", flexDirection: "column", font: "inherit",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? D.blue : D.textMuted, marginBottom: 3 }}>{day}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, lineHeight: 1.2 }}>{meta.label}</div>
              {hasPnl && (
                <div style={{ fontSize: 10, color: D.textMuted, marginTop: 1 }}>
                  {entry.pnl >= 0 ? "+" : ""}{Math.abs(entry.pnl) >= 1000 ? `${(entry.pnl / 1000).toFixed(1)}k` : entry.pnl.toFixed(0)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const calNavBtnStyle = (D) => ({
  padding: "5px 12px", background: "transparent",
  border: `1px solid ${D.border}`, borderRadius: 6,
  color: D.textMuted, cursor: "pointer", fontSize: 14,
});

function exportToExcel(entries) {
  const rows = entries.map(e => ({
    "Date":              e.day || "",
    "Time":              e.time_entered || "",
    "Outcome":           outcomeLabel(e.pnl),
    "PnL":               e.pnl != null ? e.pnl : "",
    "Daily Bias":        e.daily_bias || "",
    "Daily Bias Image":  e.screenshot_htf_url || "",
    "Trade of the Day":  e.screenshot_tod_url || "",
    "My Trade":          e.screenshot_my_trade_url || "",
    "Notes":             e.notes || "",
    "Key Takeaway":      e.key_takeaway || "",
  }));

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TradeNotebook({ design: D, topBarSlot }) {
  const [entries,       setEntries]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState(emptyForm());
  const [saving,        setSaving]        = useState(false);
  const [editingId,     setEditingId]     = useState(null);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [error,         setError]         = useState(null);
  const [deletedEntry,  setDeletedEntry]  = useState(null);
  const [undoTimeout,   setUndoTimeout]   = useState(null);
  const [viewMode,      setViewMode]      = useState("list"); // "list" | "calendar"
  const [deletingEntry, setDeletingEntry] = useState(false);
  const [lightboxSrc,   setLightboxSrc]   = useState(null);

  useEffect(() => {
    loadNotebookEntries()
      .then(data => { setEntries(sortEntries(data)); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const startEdit = (entry) => {
    setForm({
      day:                  entry.day || "",
      time:                 entry.time_entered ? entry.time_entered.slice(0, 5) : "",
      dailyBias:            entry.daily_bias || "",
      pnl:                  entry.pnl != null ? String(entry.pnl) : "",
      todTime:              entry.tod_time ? entry.tod_time.slice(0, 5) : "",
      notes:                entry.notes || "",
      keyTakeaway:          entry.key_takeaway || "",
      fileDailyBias:        null,
      fileTOD:              null,
      fileMyTrade:          null,
      existingDailyBiasUrl: entry.screenshot_htf_url || null,
      existingTODUrl:       entry.screenshot_tod_url || null,
      existingMyTradeUrl:   entry.screenshot_my_trade_url || null,
    });
    setEditingId(entry.id);
    setShowForm(true);
    setError(null);
  };

  const submit = async () => {
    if (!form.day) return;
    setSaving(true);
    setError(null);
    try {
      let dailyBiasUrl  = form.existingDailyBiasUrl;
      let todUrl        = form.existingTODUrl;
      let myTradeUrl    = form.existingMyTradeUrl;

      if (form.fileDailyBias) { setUploadingSlot("Daily Bias");        dailyBiasUrl = await uploadNotebookScreenshot(form.fileDailyBias, "bias"); }
      if (form.fileTOD)       { setUploadingSlot("Trade of the Day");  todUrl       = await uploadNotebookScreenshot(form.fileTOD,       "tod");  }
      if (form.fileMyTrade)   { setUploadingSlot("My Trade");          myTradeUrl   = await uploadNotebookScreenshot(form.fileMyTrade,   "mytrade"); }
      setUploadingSlot(null);

      const payload = {
        day:                     form.day,
        time_entered:            form.time || null,
        daily_bias:              form.dailyBias || null,
        // Blank PnL means no trade was taken that day — outcome ("faded")
        // is derived from this being null, never stored separately.
        pnl:                     form.pnl === "" ? null : parseFloat(form.pnl),
        tod_time:                form.todTime || null,
        notes:                   form.notes || null,
        key_takeaway:            form.keyTakeaway || null,
        screenshot_htf_url:      dailyBiasUrl,
        screenshot_tod_url:      todUrl,
        screenshot_my_trade_url: myTradeUrl,
      };

      if (editingId) {
        const updated = await updateNotebookEntry(editingId, payload);
        setEntries(prev => sortEntries(prev.map(e => e.id === editingId ? updated : e)));
      } else {
        const saved = await saveNotebookEntry(payload);
        setEntries(prev => sortEntries([saved, ...prev]));
      }

      setForm(emptyForm());
      setEditingId(null);
      setShowForm(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setUploadingSlot(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      const entryToDelete = entries.find(x => x.id === id);
      if (!entryToDelete) return;
      setEntries(prev => prev.filter(x => x.id !== id));
      setDeletedEntry(entryToDelete);
      if (undoTimeout) clearTimeout(undoTimeout);
      const timeout = setTimeout(async () => {
        await deleteNotebookEntry(id);
        setDeletedEntry(null);
      }, 5000);
      setUndoTimeout(timeout);
    } catch (e) { setError(e.message); }
  };

  const handleUndo = () => {
    if (undoTimeout) clearTimeout(undoTimeout);
    setEntries(prev => sortEntries([...prev, deletedEntry]));
    setDeletedEntry(null);
  };

  if (loading) return <div style={{ padding: 48, textAlign: "center", color: D.textMuted, fontSize: 14 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {deletedEntry && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 3000, background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.35)" }}>
          <span style={{ fontSize: 14, color: D.text }}>Entry deleted</span>
          <button onClick={handleUndo} style={{ background: D.blue, color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Undo</button>
          <button onClick={() => { if (undoTimeout) clearTimeout(undoTimeout); setDeletedEntry(null); }} style={{ background: "transparent", color: D.textMuted, border: "none", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
        </div>
      )}

      {/* Top-bar actions: Export + New Entry */}
      {(() => {
        const topBarControls = (
          <>
            {entries.length > 0 && (
              <button onClick={() => exportToExcel(entries)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${D.border}`, background: "transparent", color: D.textMuted, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
                Export Excel
              </button>
            )}
            <button
              onClick={() => { setShowForm(s => !s); if (showForm) { setEditingId(null); setForm(emptyForm()); } setError(null); }}
              style={{ padding: "12px 26px", borderRadius: 10, border: `1px solid ${D.border}`, background: "transparent", color: showForm ? D.textMuted : D.text, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              {showForm ? "Cancel" : "+ New Entry"}
            </button>
          </>
        );
        return topBarSlot
          ? createPortal(topBarControls, topBarSlot)
          : <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>{topBarControls}</div>;
      })()}

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: D.textMuted }}>{entries.length} entries</span>
          {!showForm && entries.length > 0 && (
            <div style={{ display: "flex", border: `1px solid ${D.border}`, borderRadius: 8, overflow: "hidden" }}>
              {[["list","List"],["calendar","Calendar"]].map(([id,label]) => (
                <button key={id} onClick={() => setViewMode(id)} style={{
                  padding: "7px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: viewMode === id ? D.text : "transparent",
                  color: viewMode === id ? D.bg : D.textMuted,
                }}>{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: `${D.red}12`, border: `1px solid ${D.red}30`, borderRadius: 10, padding: "11px 18px", fontSize: 13, color: D.red }}>{error}</div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Row 1: Date, time of entry, PnL — the three "trade" facts at a glance */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <Field label="Date">
              <TextInput type="date" value={form.day} onChange={e => set("day", e.target.value)} D={D} />
            </Field>
            <Field label="Time of Entry">
              <TextInput type="time" value={form.time} onChange={e => set("time", e.target.value)} D={D} />
            </Field>
            <Field label="PnL">
              <TextInput
                type="number"
                value={form.pnl}
                onChange={e => set("pnl", e.target.value)}
                D={D}
                placeholder="0"
                style={{ fontFamily: "monospace" }}
              />
            </Field>
          </div>

          <div style={{ borderTop: `1px solid ${D.border}` }} />

          {/* Row 2: the three picture groups — Daily Bias, My Trade, Trade of the Day */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div style={groupStyle(D)}>
              <div style={groupLabelStyle(D)}>Daily Bias</div>
              <AttachButton label="Attach chart" file={form.fileDailyBias} existingUrl={form.existingDailyBiasUrl}
                onFile={f => set("fileDailyBias", f)} onClear={() => { set("fileDailyBias", null); set("existingDailyBiasUrl", null); }}
                uploading={uploadingSlot === "Daily Bias"} onOpenLightbox={setLightboxSrc} D={D} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {["Bullish", "Bearish"].map(t => (
                  <SelBtn key={t} label={t} active={form.dailyBias === t} color={t === "Bullish" ? D.green : D.red} onClick={() => set("dailyBias", t)} />
                ))}
              </div>
            </div>

            <div style={groupStyle(D)}>
              <div style={groupLabelStyle(D)}>My Trade</div>
              <AttachButton label="Attach chart" file={form.fileMyTrade} existingUrl={form.existingMyTradeUrl}
                onFile={f => set("fileMyTrade", f)} onClear={() => { set("fileMyTrade", null); set("existingMyTradeUrl", null); }}
                uploading={uploadingSlot === "My Trade"} onOpenLightbox={setLightboxSrc} D={D} />
            </div>

            <div style={groupStyle(D)}>
              <div style={groupLabelStyle(D)}>Trade of the Day</div>
              <AttachButton label="Attach chart" file={form.fileTOD} existingUrl={form.existingTODUrl}
                onFile={f => set("fileTOD", f)} onClear={() => { set("fileTOD", null); set("existingTODUrl", null); }}
                uploading={uploadingSlot === "Trade of the Day"} onOpenLightbox={setLightboxSrc} D={D} />
              <TextInput type="time" value={form.todTime} onChange={e => set("todTime", e.target.value)} D={D}
                style={{ maxWidth: 130, marginTop: 12 }} />
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${D.border}` }} />

          {/* Row 3: just the two text fields — everything else lives in Notes */}
          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} D={D} rows={14} minHeight={420} fontSize={20} lineHeight={1.7} />
          </Field>

          <Field label="Takeaway of the Day">
            <Textarea value={form.keyTakeaway} onChange={e => set("keyTakeaway", e.target.value)} D={D} rows={3} minHeight={110} fontSize={20} lineHeight={1.7} />
          </Field>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {(() => {
              const canSubmit = form.day && !saving;
              return (
                <button onClick={submit} disabled={!canSubmit} style={{
                  padding: "10px 28px", borderRadius: 10, border: `1px solid ${D.border}`,
                  background: canSubmit ? D.text : "transparent",
                  color: canSubmit ? D.bg : D.textMuted,
                  fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "default",
                }}>
                  {saving ? "Saving…" : editingId ? "Update Entry" : "Save Entry"}
                </button>
              );
            })()}
            {saving && uploadingSlot && (
              <span style={{ fontSize: 12, color: D.textMuted }}>Uploading {uploadingSlot}…</span>
            )}
            {/* Editing an existing entry (opened from the list/calendar) also
                offers Delete right here — there is no separate view screen
                where deletion used to live. */}
            {editingId && (
              <button
                onClick={async () => {
                  const id = editingId;
                  setDeletingEntry(true);
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm());
                  await handleDelete(id);
                  setDeletingEntry(false);
                }}
                disabled={deletingEntry}
                style={{
                  marginLeft: "auto", background: "transparent", border: `1px solid ${D.red}30`,
                  borderRadius: 10, color: D.red, cursor: deletingEntry ? "default" : "pointer",
                  fontSize: 13, padding: "10px 20px", fontWeight: 600, opacity: deletingEntry ? 0.5 : 1,
                }}
              >
                {deletingEntry ? "Deleting…" : "Delete Entry"}
              </button>
            )}
          </div>
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: D.textMuted, fontSize: 14 }}>No entries yet.</div>
      )}

      {!showForm && entries.length > 0 && (
        viewMode === "list"
          ? <JournalList entries={entries} D={D} onOpen={startEdit} />
          : <JournalCalendar entries={entries} D={D} onOpen={startEdit} />
      )}

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}