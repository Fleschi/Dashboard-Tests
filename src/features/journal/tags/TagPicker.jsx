// The "/tag" popup. Left: type a name, pick a colour, press Enter to create the
// tag and put it in the note. Right: the whole library, organised in groups —
// clicking any tag inserts it. Groups are only for finding your way around;
// nothing about a group ever shows up in the note.

import { useMemo, useRef, useState } from "react";
import { MENU_FONT, popoverStyle, useOutsideClose, IconPlus, IconX, IconPencil, IconTrash, IconCheck, IconChevron } from "../editor/journalUi";
import { useTagLibrary, tagActions, tagColor, TAG_COLORS } from "./tagLibrary";
import ColorPicker from "../../../shared/components/ColorPicker/ColorPicker";

export const TAG_PICKER_WIDTH = 580;
const DEFAULT_GROUP_NAME = "General";

const iconBtn = (D) => ({ border: "none", background: "transparent", cursor: "pointer", color: D.textMuted, display: "flex", padding: 3 });
const inputStyle = (D) => ({
  width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 13, color: D.text,
  background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, fontFamily: MENU_FONT, outline: "none",
});

// A row's inline rename box (shared by tags and groups).
function RenameInput({ D, value, onSave, onCancel }) {
  const [v, setV] = useState(value);
  const done = () => { if (v.trim() && v.trim() !== value) onSave(v); else onCancel(); };
  return (
    <input autoFocus value={v} onChange={e => setV(e.target.value)} onBlur={done}
      onKeyDown={e => {
        if (e.key === "Enter") { e.preventDefault(); done(); }
        if (e.key === "Escape") { e.stopPropagation(); onCancel(); }
      }}
      style={{ ...inputStyle(D), padding: "4px 6px", flex: 1, minWidth: 0 }} />
  );
}

function ConfirmDelete({ D, label, onYes, onNo }) {
  return (
    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <button type="button" onClick={onYes} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 600, color: D.red || "#e5484d", fontFamily: MENU_FONT }}>{label}</button>
      <button type="button" title="Cancel" aria-label="Cancel" onClick={onNo} style={iconBtn(D)}><IconX size={13} /></button>
    </span>
  );
}

export default function TagPicker({ D, onPick, onClose, style }) {
  const lib = useTagLibrary();
  const wrapRef = useRef(null);
  useOutsideClose(wrapRef, true, onClose);

  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]);
  const [groupId, setGroupId] = useState("");
  const [collapsed, setCollapsed] = useState({});       // groupId -> true
  const [editing, setEditing] = useState(null);         // tag/group id being renamed
  const [confirm, setConfirm] = useState(null);         // tag/group id awaiting delete confirm
  const [newGroup, setNewGroup] = useState("");
  const [busy, setBusy] = useState(false);

  const ready = lib.status === "ready";
  // Which group a newly created tag goes into: the dropdown's choice, else the first group.
  const targetGroupId = lib.groups.some(g => g.id === groupId) ? groupId : (lib.groups[0]?.id || "");

  const query = name.trim().toLowerCase();
  const sections = useMemo(() => lib.groups.map(g => ({
    group: g,
    all: lib.tags.filter(t => t.groupId === g.id),
    shown: lib.tags.filter(t => t.groupId === g.id && (!query || t.name.toLowerCase().includes(query))),
  })).filter(s => !query || s.shown.length > 0), [lib.groups, lib.tags, query]);

  const pick = (tag) => onPick({ ...tag, color: tagColor(tag, lib.groups, D.blue) });

  const submit = async () => {
    const clean = name.trim();
    if (!clean || !ready || busy) return;
    const exact = lib.tags.find(t => t.name.toLowerCase() === clean.toLowerCase());
    if (exact) { pick(exact); return; }
    setBusy(true);
    try {
      let gid = targetGroupId;
      if (!gid) { const g = await tagActions.createGroup(DEFAULT_GROUP_NAME); gid = g?.id; }
      const tag = gid ? await tagActions.createTag(gid, clean, color) : null;
      if (tag) onPick({ ...tag, color: tag.color || color });
    } finally { setBusy(false); }
  };

  const addGroup = async () => {
    const clean = newGroup.trim();
    if (!clean) return;
    const g = await tagActions.createGroup(clean);
    setNewGroup("");
    if (g) setGroupId(g.id);
  };

  let right;
  if (lib.status === "idle" || lib.status === "loading") {
    right = <div style={{ padding: 12, fontSize: 13, color: D.textMuted }}>Loading tags…</div>;
  } else if (lib.status === "error") {
    right = (
      <div style={{ padding: 12, fontSize: 13, color: D.red || "#e5484d" }}>
        {lib.error}
        <div><button type="button" onClick={tagActions.reload} style={{ ...iconBtn(D), marginTop: 8, fontWeight: 600, fontSize: 13 }}>Retry</button></div>
      </div>
    );
  } else {
    right = (
      <>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {sections.length === 0 && (
            <div style={{ padding: 12, fontSize: 12, color: D.textMuted }}>
              {query ? "No saved tag matches — press Enter to create it." : "No tags yet — type a name on the left and press Enter."}
            </div>
          )}
          {sections.map(({ group, all, shown }) => {
            const open = query ? true : !collapsed[group.id];
            return (
              <div key={group.id} style={{ marginBottom: 4 }}>
                <div className="journal-row" style={{ display: "flex", alignItems: "center", gap: 2, padding: "2px 4px", borderRadius: 8 }}>
                  <button type="button" aria-label={`${open ? "Collapse" : "Expand"} ${group.name}`}
                    onClick={() => setCollapsed(c => ({ ...c, [group.id]: !c[group.id] }))}
                    style={{ ...iconBtn(D), transform: open ? "none" : "rotate(-90deg)" }}><IconChevron size={13} /></button>
                  {editing === group.id ? (
                    <RenameInput D={D} value={group.name} onCancel={() => setEditing(null)}
                      onSave={async v => { await tagActions.renameGroup(group.id, v); setEditing(null); }} />
                  ) : (
                    <button type="button" onClick={() => setGroupId(group.id)} title="Create new tags in this group" style={{
                      flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "transparent", cursor: "pointer",
                      fontFamily: MENU_FONT, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                      color: group.id === targetGroupId ? D.blue : D.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{group.name} <span style={{ fontWeight: 500 }}>· {all.length}</span></button>
                  )}
                  {editing !== group.id && (confirm === group.id ? (
                    <ConfirmDelete D={D} label="Delete group & tags?" onNo={() => setConfirm(null)}
                      onYes={() => { setConfirm(null); tagActions.deleteGroup(group.id); }} />
                  ) : (
                    <span className="journal-row-actions" style={{ display: "flex" }}>
                      <button type="button" title="Rename group" aria-label={`Rename ${group.name}`} onClick={() => setEditing(group.id)} style={iconBtn(D)}><IconPencil size={12} /></button>
                      <button type="button" title="Delete group" aria-label={`Delete ${group.name}`} onClick={() => setConfirm(group.id)} style={iconBtn(D)}><IconTrash size={12} /></button>
                    </span>
                  ))}
                </div>

                {open && shown.map(t => {
                  const c = tagColor(t, lib.groups, D.blue);
                  return (
                    <div key={t.id} className="journal-row" style={{ display: "flex", alignItems: "center", gap: 4, padding: "1px 4px 1px 22px", borderRadius: 8 }}>
                      {/* Saved only when the choice is finished (not on every drag step), since it's a DB write. */}
                      <ColorPicker D={D} variant="dot" size={12} title={`Change colour of ${t.name}`} value={c} swatches={TAG_COLORS}
                        onChangeEnd={hex => tagActions.setTagColor(t.id, hex)} />
                      {editing === t.id ? (
                        <RenameInput D={D} value={t.name} onCancel={() => setEditing(null)}
                          onSave={async v => { await tagActions.renameTag(t.id, v); setEditing(null); }} />
                      ) : (
                        <button type="button" onClick={() => pick(t)} style={{
                          flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "transparent", cursor: "pointer", padding: "4px 2px",
                          fontFamily: MENU_FONT, fontSize: 13, color: D.text,
                        }}>
                          <span style={{ background: `${c}40`, padding: "1px 7px", borderRadius: 6, fontWeight: 600, whiteSpace: "nowrap" }}>#{t.name}</span>
                        </button>
                      )}
                      {editing !== t.id && (confirm === t.id ? (
                        <ConfirmDelete D={D} label="Delete?" onNo={() => setConfirm(null)}
                          onYes={() => { setConfirm(null); tagActions.deleteTag(t.id); }} />
                      ) : (
                        <span className="journal-row-actions" style={{ display: "flex" }}>
                          <button type="button" title="Rename" aria-label={`Rename ${t.name}`} onClick={() => setEditing(t.id)} style={iconBtn(D)}><IconPencil size={12} /></button>
                          <button type="button" title="Delete" aria-label={`Delete ${t.name}`} onClick={() => setConfirm(t.id)} style={iconBtn(D)}><IconTrash size={12} /></button>
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 6, paddingTop: 8, borderTop: `1px solid ${D.border}`, marginTop: 6 }}>
          <input value={newGroup} placeholder="New group…" onChange={e => setNewGroup(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addGroup(); } }}
            style={{ ...inputStyle(D), padding: "6px 8px", fontSize: 12 }} />
          <button type="button" aria-label="Add group" title="Add group" onClick={addGroup} style={{ ...iconBtn(D), border: `1px solid ${D.border}`, borderRadius: 8, padding: "0 8px" }}><IconPlus size={14} /></button>
        </div>
      </>
    );
  }

  const preview = name.trim();
  return (
    <div ref={wrapRef} role="dialog" aria-label="Insert tag" style={{
      ...popoverStyle(D), ...style, width: TAG_PICKER_WIDTH, maxWidth: "calc(100vw - 16px)", boxSizing: "border-box",
      display: "flex", gap: 6, height: 340, zIndex: 2100,
    }}>
      {/* Create */}
      <div style={{ width: 240, flexShrink: 0, padding: 6, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: D.textMuted, marginBottom: 6 }}>New tag</div>
          <input autoFocus value={name} placeholder="Type a tag, press Enter…" aria-label="Tag name"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); submit(); }
              if (e.key === "Escape") { e.preventDefault(); onClose(); }
            }}
            style={inputStyle(D)} />
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: D.textMuted, marginBottom: 6 }}>Colour</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TAG_COLORS.map(c => (
              <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={c === color} onClick={() => setColor(c)}
                // mousedown must not move focus off the name box, so Enter still creates the tag after picking a colour.
                onMouseDown={e => e.preventDefault()} style={{
                width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer", padding: 0, color: "#fff",
                border: c === color ? `2px solid ${D.text}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{c === color && <IconCheck size={12} />}</button>
            ))}
            {/* Any other colour: the shared picker, opened straight on its Custom pane. */}
            <ColorPicker D={D} variant="dot" size={24} title="Custom colour" value={color}
              rainbow={TAG_COLORS.includes(color)} onChange={setColor} />
          </div>
        </div>

        {lib.groups.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: D.textMuted, marginBottom: 6 }}>Save in group</div>
            <select value={targetGroupId} onChange={e => setGroupId(e.target.value)} aria-label="Group for new tag" style={inputStyle(D)}>
              {lib.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginTop: "auto", fontSize: 12, color: D.textMuted }}>
          {preview ? (
            <>Preview: <span style={{ background: `${color}40`, color: D.text, padding: "1px 7px", borderRadius: 6, fontWeight: 600 }}>#{preview}</span></>
          ) : "Or pick a saved tag on the right."}
          {lib.actionError && <div style={{ color: D.red || "#e5484d", marginTop: 6 }}>{lib.actionError}</div>}
        </div>
      </div>

      {/* Library */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: 6, borderLeft: `1px solid ${D.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: D.textMuted, margin: "0 0 6px 4px" }}>Your tags</div>
        {right}
      </div>
    </div>
  );
}
