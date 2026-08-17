import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  loadNotebookEntries, saveNotebookEntry, updateNotebookEntry,
  deleteNotebookEntry, uploadNotebookScreenshot,
} from "../utils/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNotebookDate(str) {
  if (!str) return 0;
  const [datePart, timePart = "00:00"] = str.split(" ");
  const [dd, mm, yy] = datePart.split("/");
  const [hh, mn] = timePart.split(":");
  return new Date(`20${yy}-${mm}-${dd}T${hh}:${mn}`).getTime();
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => parseNotebookDate(b.time_entered) - parseNotebookDate(a.time_entered));
}

function formatBulletPoints(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    if (line.trim().startsWith("*")) {
      return (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <span style={{ flexShrink: 0 }}>•</span>
          <span>{line.trim().substring(1).trim()}</span>
        </div>
      );
    }
    return <div key={i} style={{ marginBottom: line.trim() ? 4 : 8 }}>{line}</div>;
  });
}

const emptyForm = () => ({
  datetime:        "",
  dailyBias:       "",   // "Bullish" | "Bearish"
  drawsOnLiquidity:"",
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

function SelBtn({ label, active, color, muted, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "6px 16px", borderRadius: 8,
      border: `1px solid ${active ? color : "transparent"}`,
      background: active ? `${color}18` : "transparent",
      color: active ? color : muted,
      fontSize: 13, cursor: "pointer", fontWeight: active ? 600 : 400,
      transition: "all 0.15s",
    }}>{label}</button>
  );
}

function Field({ label, muted, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, style = {}, placeholder, D }) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} style={{
      background: D.bg, border: `1px solid ${D.border}`,
      borderRadius: 8, color: D.text, padding: "8px 12px",
      fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", ...style,
    }} />
  );
}

function Textarea({ value, onChange, D, rows = 4 }) {
  return (
    <textarea value={value} onChange={onChange} rows={rows} style={{
      background: D.bg, border: `1px solid ${D.border}`,
      borderRadius: 8, color: D.text, padding: "8px 12px",
      fontSize: 13, outline: "none", resize: "vertical",
      width: "100%", boxSizing: "border-box",
    }} />
  );
}

function AttachButton({ label, file, existingUrl, onFile, onClear, D, uploading }) {
  const ref = useRef();
  const localPreview = file ? URL.createObjectURL(file) : null;
  const displaySrc   = localPreview || existingUrl || null;
  const isLocal      = !!localPreview;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {!displaySrc ? (
        <button type="button" onClick={() => ref.current.click()} style={{
          padding: "7px 16px", borderRadius: 8, border: `1px solid ${D.border}`,
          background: "transparent", color: D.textMuted, fontSize: 12, cursor: "pointer",
          width: "fit-content",
        }}>
          {label}
        </button>
      ) : (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img src={displaySrc} alt={label}
            style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, border: `1px solid ${D.border}`, display: "block", cursor: "pointer", objectFit: "contain" }}
            onClick={() => window.open(displaySrc, "_blank")}
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

// ─── EntryCard ────────────────────────────────────────────────────────────────

function EntryCard({ entry, D, onDelete, onEdit }) {
  const [deleting, setDeleting] = useState(false);
  const bias = entry.daily_bias;
  const biasColor = bias === "Bullish" ? D.green : bias === "Bearish" ? D.red : D.textMuted;

  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, paddingBottom: 16, borderBottom: `1px solid ${D.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: D.text, fontFamily: "monospace", fontWeight: 600 }}>{entry.time_entered}</span>
          {bias && (
            <span style={{ fontSize: 12, fontWeight: 700, color: biasColor }}>{bias}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onEdit(entry)} style={{ background: "transparent", border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, cursor: "pointer", fontSize: 12, padding: "6px 14px", fontWeight: 500 }}>Edit</button>
          <button onClick={async () => { setDeleting(true); await onDelete(entry.id); }} disabled={deleting} style={{ background: "transparent", border: `1px solid ${D.red}30`, borderRadius: 8, color: D.red, cursor: "pointer", fontSize: 12, padding: "6px 14px", opacity: deleting ? 0.5 : 1, fontWeight: 500 }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Draws on Liquidity */}
      {entry.draws_on_liquidity && (
        <div>
          <div style={{ fontSize: 11, color: D.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Draws on Liquidity</div>
          <div style={{ fontSize: 13, color: D.text, lineHeight: 1.6 }}>{formatBulletPoints(entry.draws_on_liquidity)}</div>
        </div>
      )}

      {/* Screenshots: Daily Bias + TOD */}
      {(entry.screenshot_htf_url || entry.screenshot_tod_url) && (
        <div style={{ display: "grid", gridTemplateColumns: entry.screenshot_htf_url && entry.screenshot_tod_url ? "1fr 1fr" : "1fr", gap: 16 }}>
          {entry.screenshot_htf_url && (
            <div>
              <div style={{ fontSize: 11, color: D.textMuted, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Daily Bias</div>
              <img src={entry.screenshot_htf_url} alt="Daily Bias"
                style={{ width: "100%", borderRadius: 16, border: `1px solid ${D.border}`, cursor: "pointer", display: "block" }}
                onClick={() => window.open(entry.screenshot_htf_url, "_blank")}
                onError={e => { e.target.style.display = "none"; }} />
            </div>
          )}
          {entry.screenshot_tod_url && (
            <div>
              <div style={{ fontSize: 11, color: D.textMuted, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Trade of the Day</div>
              <img src={entry.screenshot_tod_url} alt="TOD"
                style={{ width: "100%", borderRadius: 16, border: `1px solid ${D.border}`, cursor: "pointer", display: "block" }}
                onClick={() => window.open(entry.screenshot_tod_url, "_blank")}
                onError={e => { e.target.style.display = "none"; }} />
            </div>
          )}
        </div>
      )}

      {/* Screenshot: My Trade */}
      {entry.screenshot_my_trade_url && (
        <div>
          <div style={{ fontSize: 11, color: D.textMuted, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>My Trade</div>
          <img src={entry.screenshot_my_trade_url} alt="My Trade"
            style={{ width: "100%", borderRadius: 16, border: `1px solid ${D.border}`, cursor: "pointer", display: "block" }}
            onClick={() => window.open(entry.screenshot_my_trade_url, "_blank")}
            onError={e => { e.target.style.display = "none"; }} />
        </div>
      )}

      {/* Notes */}
      {entry.went_good && (
        <div>
          <div style={{ fontSize: 11, color: D.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Notes</div>
          <div style={{ fontSize: 13, color: D.text, lineHeight: 1.6 }}>{formatBulletPoints(entry.went_good)}</div>
        </div>
      )}

      {/* Key Takeaway */}
      {entry.key_takeaway && (
        <div style={{ background: `${D.blue}08`, border: `1px solid ${D.blue}25`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 11, color: D.blue, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Key Takeaway</div>
          <div style={{ fontSize: 14, color: D.text, lineHeight: 1.6, fontWeight: 500 }}>{formatBulletPoints(entry.key_takeaway)}</div>
        </div>
      )}
    </div>
  );
}

// ─── Export to Excel ──────────────────────────────────────────────────────────

function exportToExcel(entries) {
  const rows = entries.map(e => ({
    "Date":               e.time_entered || "",
    "Daily Bias":         e.daily_bias || "",
    "Draws on Liquidity": e.draws_on_liquidity || "",
    "Daily Bias Image":   e.screenshot_htf_url || "",
    "Trade of the Day":   e.screenshot_tod_url || "",
    "My Trade":           e.screenshot_my_trade_url || "",
    "Notes":              e.went_good || "",
    "Key Takeaway":       e.key_takeaway || "",
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

export default function TradeNotebook({ design: D }) {
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

  useEffect(() => {
    loadNotebookEntries()
      .then(data => { setEntries(sortEntries(data)); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const startEdit = (entry) => {
    setForm({
      datetime:             entry.time_entered || "",
      dailyBias:            entry.daily_bias || "",
      drawsOnLiquidity:     entry.draws_on_liquidity || "",
      notes:                entry.went_good || "",
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
  };

  const handleDatetime = (e) => {
    let raw = e.target.value.replace(/[^\d]/g, "");
    let out = "";
    if (raw.length > 0) out = raw.slice(0, 2);
    if (raw.length > 2) out += "/" + raw.slice(2, 4);
    if (raw.length > 4) out += "/" + raw.slice(4, 6);
    if (raw.length > 6) out += " " + raw.slice(6, 8);
    if (raw.length > 8) out += ":" + raw.slice(8, 10);
    set("datetime", out);
  };

  const submit = async () => {
    if (!form.datetime) return;
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
        time_entered:            form.datetime,
        daily_bias:              form.dailyBias,
        draws_on_liquidity:      form.drawsOnLiquidity,
        went_good:               form.notes,
        key_takeaway:            form.keyTakeaway,
        screenshot_htf_url:      dailyBiasUrl,
        screenshot_tod_url:      todUrl,
        screenshot_my_trade_url: myTradeUrl,
        // keep old fields empty for compat
        type: "", along_htf: "", outcome: null, went_wrong: "",
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

  if (loading) return <div style={{ padding: 48, textAlign: "center", color: D.textMuted, fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Undo */}
      {deletedEntry && (
        <div style={{ position: "fixed", top: 20, left: 20, zIndex: 1000, background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <span style={{ fontSize: 13, color: D.text }}>Entry deleted</span>
          <button onClick={handleUndo} style={{ background: D.blue, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Undo</button>
          <button onClick={() => { if (undoTimeout) clearTimeout(undoTimeout); setDeletedEntry(null); }} style={{ background: "transparent", color: D.textMuted, border: "none", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: D.textMuted }}>{entries.length} entries</span>
          {entries.length > 0 && (
            <button onClick={() => exportToExcel(entries)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${D.border}`, background: "transparent", color: D.textMuted, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              Export Excel
            </button>
          )}
        </div>
        <button
          onClick={() => { setShowForm(s => !s); if (showForm) { setEditingId(null); setForm(emptyForm()); } setError(null); }}
          style={{ padding: "9px 20px", borderRadius: 10, border: `1px solid ${D.border}`, background: "transparent", color: showForm ? D.textMuted : D.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {showForm ? "Cancel" : "+ New Entry"}
        </button>
      </div>

      {error && (
        <div style={{ background: `${D.red}12`, border: `1px solid ${D.red}30`, borderRadius: 10, padding: "10px 16px", fontSize: 12, color: D.red }}>{error}</div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Date */}
          <Field label="Date & Time" muted={D.textMuted}>
            <TextInput value={form.datetime} onChange={handleDatetime} D={D} placeholder="DD/MM/YY HH:MM" style={{ maxWidth: 180, fontFamily: "monospace" }} />
          </Field>

          {/* Daily Bias */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Daily Bias" muted={D.textMuted}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {["Bullish", "Bearish"].map(t => (
                  <SelBtn key={t} label={t} active={form.dailyBias === t} color={t === "Bullish" ? D.green : D.red} muted={D.textMuted} onClick={() => set("dailyBias", t)} />
                ))}
              </div>
              <AttachButton label="Attach chart" file={form.fileDailyBias} existingUrl={form.existingDailyBiasUrl}
                onFile={f => set("fileDailyBias", f)} onClear={() => { set("fileDailyBias", null); set("existingDailyBiasUrl", null); }}
                uploading={uploadingSlot === "Daily Bias"} D={D} />
            </Field>

            {/* Trade of the Day */}
            <Field label="Trade of the Day" muted={D.textMuted}>
              <AttachButton label="Attach chart" file={form.fileTOD} existingUrl={form.existingTODUrl}
                onFile={f => set("fileTOD", f)} onClear={() => { set("fileTOD", null); set("existingTODUrl", null); }}
                uploading={uploadingSlot === "Trade of the Day"} D={D} />
            </Field>
          </div>

          {/* Draws on Liquidity */}
          <Field label="Draws on Liquidity" muted={D.textMuted}>
            <Textarea value={form.drawsOnLiquidity} onChange={e => set("drawsOnLiquidity", e.target.value)} D={D} rows={3} />
          </Field>

          {/* My Trade */}
          <Field label="My Trade (Execution)" muted={D.textMuted}>
            <AttachButton label="Attach chart" file={form.fileMyTrade} existingUrl={form.existingMyTradeUrl}
              onFile={f => set("fileMyTrade", f)} onClear={() => { set("fileMyTrade", null); set("existingMyTradeUrl", null); }}
              uploading={uploadingSlot === "My Trade"} D={D} />
          </Field>

          {/* Notes */}
          <Field label="Notes" muted={D.textMuted}>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} D={D} rows={4} />
          </Field>

          {/* Key Takeaway (optional) */}
          <Field label="Key Takeaway / Learning (optional)" muted={D.textMuted}>
            <Textarea value={form.keyTakeaway} onChange={e => set("keyTakeaway", e.target.value)} D={D} rows={3} />
          </Field>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={submit} disabled={!form.datetime || saving} style={{
              padding: "10px 28px", borderRadius: 10, border: `1px solid ${D.border}`,
              background: form.datetime && !saving ? D.text : "transparent",
              color: form.datetime && !saving ? D.bg : D.textMuted,
              fontSize: 14, fontWeight: 600, cursor: form.datetime && !saving ? "pointer" : "default",
            }}>
              {saving ? "Saving…" : editingId ? "Update Entry" : "Save Entry"}
            </button>
            {saving && uploadingSlot && (
              <span style={{ fontSize: 12, color: D.textMuted }}>Uploading {uploadingSlot}…</span>
            )}
          </div>
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: D.textMuted, fontSize: 13 }}>No entries yet.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {entries.map(e => (
          <EntryCard key={e.id} entry={e} D={D} onEdit={startEdit} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}