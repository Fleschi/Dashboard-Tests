// Table controls: while the cursor is inside a table, a small "Table" button
// sits on the table's top-right corner; it opens a popup list (same look as the
// "/" menu) with everything for changing that table — rows, columns, header
// row, delete. Replaces the button strip that used to sit above the editor.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MENU_FONT, popoverStyle, Icon, IconChevron } from "./journalUi";

const ICON_ROW_ABOVE = <Icon size={18}><rect x="4" y="11" width="16" height="8" rx="1.5" /><path d="M12 3v5M9.5 5.5h5" /></Icon>;
const ICON_ROW_BELOW = <Icon size={18}><rect x="4" y="5" width="16" height="8" rx="1.5" /><path d="M12 16v5M9.5 18.5h5" /></Icon>;
const ICON_COL_LEFT  = <Icon size={18}><rect x="11" y="4" width="8" height="16" rx="1.5" /><path d="M3 12h5M5.5 9.5v5" /></Icon>;
const ICON_COL_RIGHT = <Icon size={18}><rect x="5" y="4" width="8" height="16" rx="1.5" /><path d="M16 12h5M18.5 9.5v5" /></Icon>;
const ICON_DEL_ROW   = <Icon size={18}><rect x="4" y="9" width="16" height="6" rx="1.5" /><path d="M9 4l6 4M15 4L9 8M9 16l6 4M15 16l-6 4" opacity="0" /><path d="M8 12h8" /></Icon>;
const ICON_DEL_COL   = <Icon size={18}><rect x="9" y="4" width="6" height="16" rx="1.5" /><path d="M12 8v8" /></Icon>;
const ICON_HEADER    = <Icon size={18}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16" strokeWidth="3" /></Icon>;
const ICON_DEL_TABLE = <Icon size={18}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" /></Icon>;

const ACTIONS = [
  { group: "Rows", id: "rowAbove", label: "Insert row above", icon: ICON_ROW_ABOVE, run: c => c.addRowBefore() },
  { group: "Rows", id: "rowBelow", label: "Insert row below", icon: ICON_ROW_BELOW, run: c => c.addRowAfter() },
  { group: "Rows", id: "delRow", label: "Delete row", icon: ICON_DEL_ROW, run: c => c.deleteRow(), danger: true },
  { group: "Columns", id: "colLeft", label: "Insert column left", icon: ICON_COL_LEFT, run: c => c.addColumnBefore() },
  { group: "Columns", id: "colRight", label: "Insert column right", icon: ICON_COL_RIGHT, run: c => c.addColumnAfter() },
  { group: "Columns", id: "delCol", label: "Delete column", icon: ICON_DEL_COL, run: c => c.deleteColumn(), danger: true },
  { group: "Table", id: "header", label: "Toggle header row", icon: ICON_HEADER, run: c => c.toggleHeaderRow() },
  { group: "Table", id: "delTable", label: "Delete table", icon: ICON_DEL_TABLE, run: c => c.deleteTable(), danger: true },
];

const MENU_W = 240;

export default function TableMenu({ editor, D }) {
  const [anchor, setAnchor] = useState(null);   // { left, top, bottom } of the table's top-right, viewport coords
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  const measure = useCallback(() => {
    if (!editor || editor.isDestroyed || !editor.isActive("table")) { setAnchor(null); setOpen(false); return; }
    try {
      const { node } = editor.view.domAtPos(editor.state.selection.from);
      const el = node.nodeType === 1 ? node : node.parentElement;
      const table = el?.closest?.("table");
      if (!table) { setAnchor(null); return; }
      const r = table.getBoundingClientRect();
      setAnchor({ right: r.right, top: r.top, bottom: r.bottom });
    } catch { setAnchor(null); }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    measure();
    editor.on("selectionUpdate", measure);
    editor.on("transaction", measure);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      editor.off("selectionUpdate", measure);
      editor.off("transaction", measure);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [editor, measure]);

  // Close on an outside press or Escape. The "Table" button counts as inside —
  // it toggles the menu itself (and this listener is attached during the very
  // mousedown that opened it).
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onEsc); };
  }, [open]);

  const run = (a) => {
    a.run(editor.chain().focus()).run();
    setOpen(false);
  };

  // Arrow keys / Enter while the popup is open, like the "/" list.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(i => (i + 1) % ACTIONS.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(i => (i - 1 + ACTIONS.length) % ACTIONS.length); }
      else if (e.key === "Enter") { e.preventDefault(); run(ACTIONS[selected]); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected]);

  if (!anchor) return null;
  // Button sits just above the table's top-right corner (below it if there's no room).
  const btnTop = anchor.top - 34 >= 8 ? anchor.top - 34 : anchor.top + 6;
  const btnRight = Math.min(anchor.right, window.innerWidth - 8);
  const menuLeft = Math.max(8, btnRight - MENU_W);
  const menuTop = btnTop + 34;

  return createPortal(
    <>
      <button ref={btnRef} type="button" aria-haspopup="menu" aria-expanded={open}
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); setSelected(0); }}
        style={{
          position: "fixed", left: btnRight - 76, top: btnTop, width: 76, height: 28, zIndex: 2100, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          background: open ? D.blue : D.card, color: open ? "#fff" : D.text,
          border: `1px solid ${open ? D.blue : D.border}`, borderRadius: 8,
          fontFamily: MENU_FONT, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
        }}>
        Table <IconChevron size={12} />
      </button>

      {open && (
        <div ref={menuRef} role="menu" style={{
          ...popoverStyle(D), position: "fixed", left: menuLeft, top: menuTop, width: MENU_W, zIndex: 2100,
          boxSizing: "border-box", maxHeight: "calc(100vh - 16px)", overflowY: "auto",
        }}>
          {ACTIONS.map((a, i) => {
            const isSel = i === selected;
            const header = i === 0 || ACTIONS[i - 1].group !== a.group;
            return (
              <div key={a.id}>
                {header && (
                  <div style={{ padding: i === 0 ? "4px 10px 6px" : "12px 10px 6px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: D.textMuted }}>{a.group}</div>
                )}
                <button type="button" role="menuitem"
                  onMouseMove={() => { if (!isSel) setSelected(i); }}
                  onMouseDown={e => { e.preventDefault(); run(a); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "6px 8px", borderRadius: 8, border: "none", textAlign: "left",
                    background: isSel ? `${a.danger ? (D.red || "#e5484d") : D.blue}18` : "transparent",
                    color: a.danger ? (D.red || "#e5484d") : D.text, cursor: "pointer", font: "inherit", fontFamily: MENU_FONT,
                  }}>
                  <span style={{
                    width: 32, height: 32, flexShrink: 0, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1px solid ${isSel ? (a.danger ? (D.red || "#e5484d") : D.blue) : D.border}`,
                    background: isSel ? (a.danger ? (D.red || "#e5484d") : D.blue) : D.bg, color: isSel ? "#fff" : "inherit",
                  }}>{a.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>,
    document.body,
  );
}
