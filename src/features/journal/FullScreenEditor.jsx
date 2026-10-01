import { FONT_FAMILY } from "../../theme/fonts";
import { fmt } from "../../shared/utils/format";
import JournalEditor from "./editor/JournalEditor";
import { fmtEntryDate, outcomeMeta } from "./entryUtils";
import { DateField } from "./fields/DateField";
import { FloatingField } from "./fields/FloatingField";
import { TimeField } from "./fields/TimeField";
import { collectTagIds } from "./tags/tagDoc";

// Reading mode's replacement for the four input fields: one highlighted bar
// with the key facts (date, time, outcome + P&L, Trade-of-the-Day time).
function ReadSummaryBar({ D, form }) {
  const hasPnl = form.pnl !== "" && form.pnl !== null && form.pnl !== undefined && !isNaN(Number(form.pnl));
  const pnl = hasPnl ? Number(form.pnl) : null;
  const { label, color } = outcomeMeta(pnl, D);
  const item = (title, value) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: D.textMuted }}>{title}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: D.text }}>{value}</span>
    </div>
  );
  const divider = <span aria-hidden="true" style={{ width: 1, alignSelf: "stretch", background: D.border }} />;
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, padding: "14px 20px",
      background: `${D.blue}10`, border: `1px solid ${D.border}`, borderLeft: `3px solid ${color}`, borderRadius: 12,
    }}>
      {item("Date", form.day ? fmtEntryDate(form.day) : "—")}
      {divider}
      {item("Time", form.time ? form.time.slice(0, 5) : "—")}
      {divider}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: D.textMuted }}>Result</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color, background: `${color}20`, borderRadius: 6, padding: "2px 8px" }}>{label}</span>
          {hasPnl && <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color }}>{fmt(pnl)}</span>}
        </span>
      </div>
      {form.todTime && (<>{divider}{item("Trade of the Day", form.todTime.slice(0, 5))}</>)}
    </div>
  );
}

// The editor, full-screen: covers the entire viewport (portaled to <body> by
// the caller) instead of sitting in a card inside the tab's own content
// column. The 4 parameter fields sit in a header strip above the canvas,
// Notion-page-style, rather than in a separate "form" above a "notes" box.
export function FullScreenEditor({ D, form, set, editingId, formVersion, saveStatus, deletingEntry, readOnly, onSetReadOnly, onClose, onDelete, onImageClick }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1500, background: D.card,
      display: "flex", flexDirection: "column", fontFamily: FONT_FAMILY,
    }}>
      {/* Header — close control, save status, delete. Stays put while the
          canvas below scrolls. */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 16,
        padding: "16px 28px", borderBottom: `1px solid ${D.border}`,
      }}>
        <button
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", gap: 8, background: "transparent",
            border: `1px solid ${D.border}`, borderRadius: 10, color: D.text,
            fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "9px 18px",
          }}
        >
          Done
        </button>

        {/* Mode switch — Edit (type, insert, change) or Read (view only). */}
        <div role="group" aria-label="View mode" style={{ display: "flex", gap: 4, padding: 3, border: `1px solid ${D.border}`, borderRadius: 10, background: D.bg }}>
          {[["edit", "Edit", false], ["read", "Read", true]].map(([id, label, ro]) => {
            const active = readOnly === ro;
            return (
              <button key={id} type="button" aria-pressed={active} onClick={() => onSetReadOnly(ro)} style={{
                border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: active ? D.blue : "transparent", color: active ? "#fff" : D.textMuted, fontFamily: FONT_FAMILY,
              }}>{label}</button>
            );
          })}
        </div>

        <span style={{ fontSize: 13, color: D.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
          {saveStatus === "saving"  && "Saving…"}
          {saveStatus === "saved"   && "Saved"}
          {saveStatus === "pending" && "Editing…"}
        </span>

        {/* Editing an existing entry (opened from the list/calendar) also
            offers Delete right here — there is no separate view screen
            where deletion used to live. */}
        {editingId && !readOnly && (
          <button
            onClick={onDelete}
            disabled={deletingEntry}
            style={{
              marginLeft: "auto", background: "transparent", border: `1px solid ${D.red}30`,
              borderRadius: 10, color: D.red, cursor: deletingEntry ? "default" : "pointer",
              fontSize: 13, padding: "9px 18px", fontWeight: 600, opacity: deletingEntry ? 0.5 : 1,
            }}
          >
            {deletingEntry ? "Deleting…" : "Delete Entry"}
          </button>
        )}
      </div>

      {/* Canvas — a centered, readable column; the header stays fixed above it. */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ width: "66%", minWidth: 480, maxWidth: 1100, margin: "0 auto", padding: "40px 32px 120px", display: "flex", flexDirection: "column", gap: 22 }}>

          {/* The 4 parameter columns — everything else below is free-form. */}
          {/* Reading mode shows a compact summary bar instead of the input fields. */}
          {readOnly ? (
            <ReadSummaryBar D={D} form={form} />
          ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
            <DateField label="Date" value={form.day} onChange={v => set("day", v)} D={D} />
            <TimeField label="Time of Entry" value={form.time} onChange={v => set("time", v)} D={D} />
            <FloatingField
              label="P&L" type="number" value={form.pnl}
              onChange={e => set("pnl", e.target.value)}
              D={D} style={{ fontFamily: "monospace" }}
            />
            <TimeField label="Time of Entry Trade of the Day" value={form.todTime} onChange={v => set("todTime", v)} D={D} />
          </div>
          )}

          <div style={{ borderTop: `1px solid ${D.border}` }} />

          <JournalEditor
            entryKey={editingId ? `edit-${editingId}` : `new-${formVersion}`}
            content={form.content}
            onUpdate={json => {
              // Tags live in the text (inline "#tag" nodes, inserted with
              // "/tag"); `tag_ids` is just their ids, kept for querying.
              set({ content: json, tagIds: collectTagIds(json) });
            }}
            onImageClick={onImageClick}
            editable={!readOnly}
            D={D}
          />
        </div>
      </div>
    </div>
  );
}
