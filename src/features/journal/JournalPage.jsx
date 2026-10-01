import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LegacyMigrationBanner, useLegacyMigration } from "./legacy/LegacyMigrationBanner";
import { deleteJournalEntry, loadJournalEntries, saveJournalEntry, updateJournalEntry } from "../../services/supabase/journal";
import { FullScreenEditor } from "./FullScreenEditor";
import { ImageLightbox } from "./ImageLightbox";
import { JournalCalendar } from "./JournalCalendar";
import { JournalList } from "./JournalList";
import { sortEntries, todayStr } from "./entryUtils";
import { exportToExcel } from "./exportToExcel";
import { withLegacyEntryTags } from "./legacy/legacyContent";

const emptyForm = () => ({
  day:      todayStr(), // "YYYY-MM-DD" — defaults to today so autosave has
                         // something valid the instant you start typing;
                         // change it freely for a past day's entry.
  time:     "",   // "HH:MM" — optional, my trade's entry time
  pnl:      "",   // optional — blank means no trade taken that day
  todTime:  "",   // "HH:MM" — optional, time of entry for the Trade of the Day
  content:  null, // jsonb — the free-form journal document (JournalEditor)
  tagIds:   [],   // uuid[] — ids of the inline tags in `content` (journal_entries.tag_ids)
});

export default function JournalPage({ design: D, topBarSlot }) {
  const [entries,       setEntries]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  // Reading-only vs editor mode for the open entry: a new entry opens in the
  // editor, an existing one (opened from the list/calendar) in reading mode;
  // the header's Edit/Read switch changes it either way.
  const [readOnly,      setReadOnly]      = useState(false);
  const [form,          setForm]          = useState(emptyForm());
  // idle: nothing to save (fresh/never-touched form)
  // pending: a change is waiting out the debounce window before it's sent
  // saving: the request is in flight
  // saved: last save succeeded, nothing changed since
  const [saveStatus,    setSaveStatus]    = useState("idle");
  const [editingId,     setEditingId]     = useState(null);
  // Bumped every time a fresh "+ New Entry" form is started, purely so
  // JournalEditor gets a new `entryKey` and knows to reset to a blank
  // document instead of reusing whatever the previous new-entry session left
  // in its ProseMirror state.
  const [formVersion,   setFormVersion]   = useState(0);
  const [error,         setError]         = useState(null);
  const [deletedEntry,  setDeletedEntry]  = useState(null);
  const [undoTimeout,   setUndoTimeout]   = useState(null);
  const [viewMode,      setViewMode]      = useState("list"); // "list" | "calendar"
  const [deletingEntry, setDeletingEntry] = useState(false);
  const [lightboxSrc,   setLightboxSrc]   = useState(null);
  const legacyMigration = useLegacyMigration(entries, setEntries);

  useEffect(() => {
    loadJournalEntries()
      .then(data => { setEntries(sortEntries(data)); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Warn on closing/refreshing the tab while a change is still waiting out
  // its debounce window — everything else (switching entries, tabs, Cancel)
  // is already covered by flushPendingSave, but a real tab close can't be
  // intercepted with an async save, only warned about.
  useEffect(() => {
    const handler = (e) => {
      if (saveTimerRef.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Refs mirroring the latest form/editingId so the debounced autosave
  // callback (scheduled once, fired later by setTimeout) always reads
  // current values instead of whatever they were at schedule time.
  const formRef = useRef(form);
  formRef.current = form;
  const editingIdRef = useRef(editingId);
  editingIdRef.current = editingId;
  const saveTimerRef = useRef(null);

  // set("day", v) for one field, or set({ content, tagIds }) for several at once.
  const set = (key, val) => {
    const patch = key !== null && typeof key === "object" ? key : { [key]: val };
    setForm(f => ({ ...f, ...patch }));
    scheduleAutosave();
  };

  const scheduleAutosave = () => {
    setSaveStatus("pending");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(runAutosave, 1500);
  };

  // Cancels any outstanding debounce timer and saves right now instead —
  // used whenever the form is about to disappear (Cancel, switching to a
  // different entry, deleting) so a change made in the last second-and-a-half
  // is never silently lost.
  const flushPendingSave = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      await runAutosave();
    }
  };

  const runAutosave = async () => {
    saveTimerRef.current = null;
    const current = formRef.current;
    // No date yet means there's nowhere to save this to (day is required) —
    // this shouldn't normally happen since the form defaults to today, but
    // stay safe if the date field is ever cleared out entirely.
    if (!current.day) { setSaveStatus("idle"); return; }

    setSaveStatus("saving");
    try {
      const payload = {
        day:          current.day,
        time_entered: current.time || null,
        // Blank PnL means no trade was taken that day — outcome ("faded")
        // is derived from this being null, never stored separately.
        pnl:          current.pnl === "" ? null : parseFloat(current.pnl),
        tod_time:     current.todTime || null,
        content:      current.content ?? {},
        tag_ids:      current.tagIds ?? [],
      };

      if (editingIdRef.current) {
        const updated = await updateJournalEntry(editingIdRef.current, payload);
        setEntries(prev => sortEntries(prev.map(e => e.id === editingIdRef.current ? updated : e)));
      } else {
        // First autosave of a brand-new entry — from this point on it's a
        // real row, so every subsequent autosave becomes an update instead.
        const saved = await saveJournalEntry(payload);
        editingIdRef.current = saved.id;
        setEditingId(saved.id);
        setEntries(prev => sortEntries([saved, ...prev]));
      }
      setError(null);
      setSaveStatus("saved");
    } catch (e) {
      setError(e.message);
      setSaveStatus("idle");
    }
  };

  const startEdit = async (entry) => {
    await flushPendingSave();
    setForm({
      day:      entry.day || "",
      time:     entry.time_entered ? entry.time_entered.slice(0, 5) : "",
      pnl:      entry.pnl != null ? String(entry.pnl) : "",
      todTime:  entry.tod_time ? entry.tod_time.slice(0, 5) : "",
      // NOTE: until the migration step (#8) runs, entries created under the
      // old form won't have anything in `content` yet — their notes/takeaway/
      // bias/screenshots still exist untouched in the legacy columns, they
      // just won't appear in this editor until they're migrated across.
      content:  withLegacyEntryTags(entry),
      tagIds:   entry.tag_ids || [],
    });
    setEditingId(entry.id);
    setReadOnly(true);
    setSaveStatus("idle");
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (id) => {
    try {
      const entryToDelete = entries.find(x => x.id === id);
      if (!entryToDelete) return;
      setEntries(prev => prev.filter(x => x.id !== id));
      setDeletedEntry(entryToDelete);
      if (undoTimeout) clearTimeout(undoTimeout);
      const timeout = setTimeout(async () => {
        await deleteJournalEntry(id);
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

  // Shared close path for the full-screen editor — flushes any pending
  // change first (same as switching entries), then resets the form so the
  // next "+ New Entry" starts from a clean slate.
  const closeForm = async () => {
    await flushPendingSave();
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormVersion(v => v + 1);
    setSaveStatus("idle");
    setError(null);
  };

  // Escape closes the full-screen editor, same as clicking Done — but not
  // while the browser's own native color/date picker or similar is up
  // (those also use Escape; without the isContentEditable/tag check this
  // would fight with them). This only ever attaches while the editor is open.
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e) => { if (e.key === "Escape") closeForm(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

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

      {/* Top-bar actions: Export + New Entry — hidden while the full-screen
          editor is open (its own header has the close control instead). */}
      {(() => {
        const topBarControls = showForm ? null : (
          <>
            {entries.length > 0 && (
              <button onClick={() => exportToExcel(entries)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${D.border}`, background: "transparent", color: D.textMuted, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
                Export Excel
              </button>
            )}
            <button
              onClick={() => { setReadOnly(false); setShowForm(true); setError(null); }}
              style={{ padding: "12px 26px", borderRadius: 10, border: `1px solid ${D.border}`, background: "transparent", color: D.text, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              + New Entry
            </button>
          </>
        );
        return topBarSlot
          ? createPortal(topBarControls, topBarSlot)
          : (!showForm && <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>{topBarControls}</div>);
      })()}

      {!showForm && (
      <>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: D.textMuted }}>{entries.length} entries</span>
          {entries.length > 0 && (
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

      <LegacyMigrationBanner D={D} migration={legacyMigration} />

      {/* Form */}

      {entries.length === 0 && !showForm && (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: D.textMuted, fontSize: 14 }}>No entries yet.</div>
      )}

      {entries.length > 0 && (
        viewMode === "list"
          ? <JournalList entries={entries} D={D} onOpen={startEdit} />
          : <JournalCalendar entries={entries} D={D} onOpen={startEdit} />
      )}

      </>
      )}

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* The editor itself is portaled straight to <body> and covers the
          entire viewport — sidebar included — rather than living inside
          this tab's own padded content column. A plain `position: fixed`
          element nested in the normal tree wouldn't actually reach over the
          sidebar: the sidebar sits in its own stacking context with a higher
          z-index, so short of a real portal it would still render on top. */}
      {showForm && createPortal(
        <FullScreenEditor
          D={D}
          form={form} set={set}
          editingId={editingId} formVersion={formVersion}
          saveStatus={saveStatus}
          deletingEntry={deletingEntry}
          readOnly={readOnly} onSetReadOnly={setReadOnly}
          onClose={closeForm}
          onImageClick={setLightboxSrc}
          onDelete={async () => {
            const id = editingId;
            // A delete makes any not-yet-saved change moot — drop the
            // pending autosave instead of flushing it, so we don't write one
            // last update to a row we're about to remove.
            if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
            setDeletingEntry(true);
            setShowForm(false);
            setEditingId(null);
            setForm(emptyForm());
            setFormVersion(v => v + 1);
            setSaveStatus("idle");
            await handleDelete(id);
            setDeletingEntry(false);
          }}
        />,
        document.body
      )}
    </div>
  );
}
