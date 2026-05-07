import { useState, useEffect, useRef } from "react";
import {
  loadNotebookEntries, saveNotebookEntry, updateNotebookEntry,
  deleteNotebookEntry, uploadNotebookScreenshot,
} from "../utils/supabase";

function SelBtn({ label, active, color, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "6px 16px", borderRadius: 8,
      border: `1px solid ${active ? color : "transparent"}`,
      background: active ? `${color}18` : "transparent",
      color: active ? color : "#525252",
      fontSize: 13, cursor: "pointer", fontWeight: active ? 600 : 400,
      transition: "all 0.15s",
    }}>{label}</button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, color: "#525252", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>}
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

function Textarea({ value, onChange, D }) {
  return (
    <textarea value={value} onChange={onChange} rows={4} style={{
      background: D.bg, border: `1px solid ${D.border}`,
      borderRadius: 8, color: D.text, padding: "8px 12px",
      fontSize: 13, outline: "none", resize: "vertical",
      width: "100%", boxSizing: "border-box",
    }} />
  );
}

/**
 * AttachButton — shows either:
 *  1. A saved URL (existingUrl) as a persisted image with option to replace
 *  2. A newly selected local File object as a local preview
 *  3. An upload button if neither exists
 */
function AttachButton({ label, file, existingUrl, onFile, onClear, D, uploading }) {
  const ref = useRef();

  // Local blob preview takes priority over saved URL
  const localPreview = file ? URL.createObjectURL(file) : null;
  const displaySrc = localPreview || existingUrl || null;
  const isLocal = !!localPreview;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {!displaySrc ? (
        <button type="button" onClick={() => ref.current.click()} style={{
          padding: "7px 16px", borderRadius: 8, border: `1px solid ${D.border}`,
          background: "transparent", color: D.textMuted, fontSize: 12, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, width: "fit-content",
        }}>
          <span style={{ fontSize: 14 }}>📎</span> {label}
        </button>
      ) : (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={displaySrc}
            alt={label}
            style={{
              maxWidth: "100%", maxHeight: 220, borderRadius: 8,
              border: `1px solid ${D.border}`, display: "block",
              cursor: "pointer", objectFit: "contain",
            }}
            onClick={() => window.open(displaySrc, "_blank")}
          />
          {/* Badge: shows whether this is the saved version or a new file */}
          <span style={{
            position: "absolute", bottom: 6, left: 6,
            background: isLocal ? "rgba(255,180,0,0.85)" : "rgba(0,180,80,0.85)",
            color: "#fff", fontSize: 10, fontWeight: 700,
            padding: "2px 7px", borderRadius: 4,
          }}>
            {isLocal ? "New (unsaved)" : "Saved"}
          </span>
          {/* Replace button */}
          <button
            type="button"
            onClick={() => ref.current.click()}
            style={{
              position: "absolute", top: 6, left: 6,
              background: "rgba(0,0,0,0.65)", border: "none", borderRadius: 6,
              color: "#fff", cursor: "pointer", fontSize: 10, padding: "3px 8px",
            }}
          >
            Replace
          </button>
          {/* Clear button — only removes the local file; saved URL is preserved unless replaced */}
          <button
            type="button"
            onClick={onClear}
            style={{
              position: "absolute", top: 6, right: 6,
              background: "rgba(0,0,0,0.75)", border: "none", borderRadius: "50%",
              width: 24, height: 24, color: "#fff", cursor: "pointer",
              fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      )}
      {uploading && <span style={{ fontSize: 11, color: D.textMuted }}>Uploading…</span>}
      <input
        ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

function EntryCard({ entry, D, onDelete, onEdit }) {
  const [deleting, setDeleting] = useState(false);

  const typeColor = entry.type === "Continuation" ? D.green : D.yellow;
  const htfColor  = entry.along_htf === "Yes" ? D.green : D.red;
  const outcomeColor = entry.outcome === "Win" ? D.green : entry.outcome === "Loss" ? D.red : D.yellow;

  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header with metadata badges */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, paddingBottom: 16, borderBottom: `1px solid ${D.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: D.text, fontFamily: "monospace", fontWeight: 600 }}>{entry.time_entered}</span>
          {entry.type && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}30` }}>{entry.type}</span>
          )}
          {entry.outcome && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: `${outcomeColor}18`, color: outcomeColor, border: `1px solid ${outcomeColor}30` }}>{entry.outcome}</span>
          )}
          {entry.along_htf && (
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: `${htfColor}12`, color: htfColor, fontWeight: 600, border: `1px solid ${htfColor}25` }}>HTF {entry.along_htf}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onEdit(entry)} style={{ background: "transparent", border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, cursor: "pointer", fontSize: 12, padding: "6px 14px", fontWeight: 500 }}>Edit</button>
          <button onClick={async () => { setDeleting(true); await onDelete(entry.id); }} disabled={deleting} style={{ background: "transparent", border: `1px solid ${D.red}30`, borderRadius: 8, color: D.red, cursor: "pointer", fontSize: 12, padding: "6px 14px", opacity: deleting ? 0.5 : 1, fontWeight: 500 }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Screenshots section - prominently at top */}
      {(entry.screenshot_htf_url || entry.screenshot_exec_url) && (
        <div style={{ display: "grid", gridTemplateColumns: entry.screenshot_htf_url && entry.screenshot_exec_url ? "1fr 1fr" : "1fr", gap: 16 }}>
          {entry.screenshot_htf_url && (
            <div>
              <div style={{ fontSize: 11, color: D.textMuted, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Daily Bias</div>
              <img
                src={entry.screenshot_htf_url}
                alt="HTF"
                style={{ width: "100%", borderRadius: 12, border: `1px solid ${D.border}`, cursor: "pointer", display: "block" }}
                onClick={() => window.open(entry.screenshot_htf_url, "_blank")}
                onError={e => { e.target.style.display = "none"; }}
              />
            </div>
          )}
          {entry.screenshot_exec_url && (
            <div>
              <div style={{ fontSize: 11, color: D.textMuted, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Execution</div>
              <img
                src={entry.screenshot_exec_url}
                alt="Exec"
                style={{ width: "100%", borderRadius: 12, border: `1px solid ${D.border}`, cursor: "pointer", display: "block" }}
                onClick={() => window.open(entry.screenshot_exec_url, "_blank")}
                onError={e => { e.target.style.display = "none"; }}
              />
            </div>
          )}
        </div>
      )}

      {/* Analysis section - What went well / wrong */}
      {(entry.went_good || entry.went_wrong) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {entry.went_good && (
            <div style={{ background: `${D.green}08`, border: `1px solid ${D.green}20`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: D.green, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                <span>✓</span> What went well
              </div>
              <div style={{ fontSize: 13, color: D.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{entry.went_good}</div>
            </div>
          )}
          {entry.went_wrong && (
            <div style={{ background: `${D.red}08`, border: `1px solid ${D.red}20`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: D.red, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                <span>✗</span> What went wrong
              </div>
              <div style={{ fontSize: 13, color: D.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{entry.went_wrong}</div>
            </div>
          )}
        </div>
      )}

      {/* Key takeaway - highlighted */}
      {entry.key_takeaway && (
        <div style={{ background: `${D.blue}08`, border: `1px solid ${D.blue}25`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, color: D.blue, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
            <span>💡</span> Key Takeaway
          </div>
          <div style={{ fontSize: 14, color: D.text, lineHeight: 1.6, fontWeight: 500 }}>{entry.key_takeaway}</div>
        </div>
      )}
    </div>
  );
}

const emptyForm = () => ({
  datetime: "",
  type: "",
  alongHTF: "",
  outcome: "",        // Win or Loss
  wentGood: "",
  wentWrong: "",
  keyTakeaway: "",
  fileHTF: null,      // new File selected by user
  fileExec: null,     // new File selected by user
  existingHTFUrl: null,   // already saved URL from DB
  existingExecUrl: null,  // already saved URL from DB
});

export default function TradeNotebook({ design }) {
  const D = design;
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploadingHTF, setUploadingHTF] = useState(false);
  const [uploadingExec, setUploadingExec] = useState(false);
  const [error, setError] = useState(null);

  const startEdit = (entry) => {
    setForm({
      datetime: entry.time_entered || "",
      type: entry.type || "",
      alongHTF: entry.along_htf || "",
      outcome: entry.outcome || "",
      wentGood: entry.went_good || "",
      wentWrong: entry.went_wrong || "",
      keyTakeaway: entry.key_takeaway || "",
      fileHTF: null,
      fileExec: null,
      // Preserve existing saved URLs so they show as preview and aren't lost on save
      existingHTFUrl: entry.screenshot_htf_url || null,
      existingExecUrl: entry.screenshot_exec_url || null,
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  useEffect(() => {
    loadNotebookEntries()
      .then(data => { setEntries(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

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
      // Upload new files if selected — otherwise fall back to existing saved URLs
      let screenshotHTFUrl = form.existingHTFUrl;
      let screenshotExecUrl = form.existingExecUrl;

      if (form.fileHTF) {
        setUploadingHTF(true);
        screenshotHTFUrl = await uploadNotebookScreenshot(form.fileHTF, "htf");
        setUploadingHTF(false);
      }
      if (form.fileExec) {
        setUploadingExec(true);
        screenshotExecUrl = await uploadNotebookScreenshot(form.fileExec, "exec");
        setUploadingExec(false);
      }

      const payload = {
        time_entered: form.datetime,
        type: form.type,
        along_htf: form.alongHTF,
        outcome: form.outcome,
        went_good: form.wentGood,
        went_wrong: form.wentWrong,
        key_takeaway: form.keyTakeaway,
        // Only include screenshot fields that have a value so updateNotebookEntry
        // can skip them if undefined (preserves DB value unchanged)
        ...(screenshotHTFUrl !== undefined && { screenshot_htf_url: screenshotHTFUrl }),
        ...(screenshotExecUrl !== undefined && { screenshot_exec_url: screenshotExecUrl }),
      };

      if (editingId) {
        const updated = await updateNotebookEntry(editingId, payload);
        setEntries(prev => prev.map(e => e.id === editingId ? updated : e));
      } else {
        const saved = await saveNotebookEntry(payload);
        setEntries(prev => [saved, ...prev]);
      }

      setForm(emptyForm());
      setEditingId(null);
      setShowForm(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setUploadingHTF(false);
      setUploadingExec(false);
    }
  };

  if (loading) return <div style={{ padding: 48, textAlign: "center", color: D.textMuted, fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: D.textMuted }}>{entries.length} entries</div>
        <button
          onClick={() => { setShowForm(s => !s); if (showForm) { setEditingId(null); setForm(emptyForm()); } setError(null); }}
          style={{ padding: "9px 20px", borderRadius: 10, border: `1px solid ${D.border}`, background: "transparent", color: showForm ? D.textMuted : D.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {showForm ? "Cancel" : "+ New Entry"}
        </button>
      </div>

      {error && (
        <div style={{ background: `${D.red}12`, border: `1px solid ${D.red}30`, borderRadius: 10, padding: "10px 16px", fontSize: 12, color: D.red }}>
          {error}
        </div>
      )}

      {showForm && (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="Date & Time">
            <TextInput value={form.datetime} onChange={handleDatetime} D={D} placeholder="DD/MM/YY HH:MM" style={{ maxWidth: 180, fontFamily: "monospace" }} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Type">
              <div style={{ display: "flex", gap: 8 }}>
                {["Continuation", "Reversal"].map(t => (
                  <SelBtn key={t} label={t} active={form.type === t} color={t === "Continuation" ? D.green : D.yellow} onClick={() => set("type", t)} />
                ))}
              </div>
            </Field>
            <Field label="Outcome">
              <div style={{ display: "flex", gap: 8 }}>
                {["Win", "Break Even", "Loss"].map(t => (
                  <SelBtn key={t} label={t} active={form.outcome === t} color={t === "Win" ? D.green : t === "Loss" ? D.red : D.yellow} onClick={() => set("outcome", t)} />
                ))}
              </div>
            </Field>
            <Field label="Along HTF">
              <div style={{ display: "flex", gap: 8 }}>
                {["Yes", "No"].map(t => (
                  <SelBtn key={t} label={t} active={form.alongHTF === t} color={t === "Yes" ? D.green : D.red} onClick={() => set("alongHTF", t)} />
                ))}
              </div>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Daily Bias">
              <AttachButton
                label="Attach screenshot"
                file={form.fileHTF}
                existingUrl={form.existingHTFUrl}
                onFile={f => set("fileHTF", f)}
                onClear={() => set("fileHTF", null)}
                uploading={uploadingHTF}
                D={D}
              />
            </Field>
            <Field label="Execution">
              <AttachButton
                label="Attach screenshot"
                file={form.fileExec}
                existingUrl={form.existingExecUrl}
                onFile={f => set("fileExec", f)}
                onClear={() => set("fileExec", null)}
                uploading={uploadingExec}
                D={D}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="What went well"><Textarea value={form.wentGood} onChange={e => set("wentGood", e.target.value)} D={D} /></Field>
            <Field label="What went wrong"><Textarea value={form.wentWrong} onChange={e => set("wentWrong", e.target.value)} D={D} /></Field>
          </div>

          <Field label="Key Takeaway">
            <Textarea value={form.keyTakeaway} onChange={e => set("keyTakeaway", e.target.value)} D={D} />
          </Field>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={submit}
              disabled={!form.datetime || saving}
              style={{
                padding: "10px 28px", borderRadius: 10, border: `1px solid ${D.border}`,
                background: form.datetime && !saving ? D.text : "transparent",
                color: form.datetime && !saving ? D.bg : D.textMuted,
                fontSize: 14, fontWeight: 600,
                cursor: form.datetime && !saving ? "pointer" : "default",
              }}
            >
              {saving ? "Saving…" : editingId ? "Update Entry" : "Save Entry"}
            </button>
            {saving && (
              <span style={{ fontSize: 12, color: D.textMuted }}>
                {uploadingHTF ? "Uploading HTF…" : uploadingExec ? "Uploading execution…" : "Saving…"}
              </span>
            )}
          </div>
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: D.textMuted, fontSize: 13 }}>No entries yet.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {entries.map(e => (
          <EntryCard
            key={e.id}
            entry={e}
            D={D}
            onEdit={startEdit}
            onDelete={async (id) => {
              try { await deleteNotebookEntry(id); setEntries(prev => prev.filter(x => x.id !== id)); }
              catch (e) { setError(e.message); }
            }}
          />
        ))}
      </div>
    </div>
  );
}