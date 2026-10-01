import { useEffect, useState } from "react";
import { isTextSelection } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import ColorPicker, { normalizeHex } from "../../../shared/components/ColorPicker/ColorPicker";
import { MENU_FONT } from "./journalUi";

// Appears above any selected text and toggles bold / italic / underline /
// strike. Visually it reuses the date picker's popover language (card
// background, 1px border, 12px radius, soft shadow, D.bg cells that turn
// D.blue when selected) rather than a stock toolbar.

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");

const MOD_KEY = IS_MAC ? "\u2318" : "Ctrl";

const FORMAT_BUTTONS = [
  { id: "bold",      label: "Bold",          keys: "B",       toggle: c => c.toggleBold(),      char: "B", glyph: { fontWeight: 700 } },
  { id: "italic",    label: "Italic",        keys: "I",       toggle: c => c.toggleItalic(),    char: "I", glyph: { fontStyle: "italic" } },
  { id: "underline", label: "Underline",     keys: "U",       toggle: c => c.toggleUnderline(), char: "U", glyph: { textDecoration: "underline", textUnderlineOffset: 2 } },
  { id: "strike",    label: "Strikethrough", keys: "Shift+S", toggle: c => c.toggleStrike(),    char: "S", glyph: { textDecoration: "line-through" } },
];

// A toggle's summary line isn't a `heading` node, so it stores its heading level
// on itself (see ToggleList.js). These two helpers hide that difference.
const inSummary = (editor) => {
  const { $from, $to } = editor.state.selection;
  return $from.parent.type.name === "toggleSummary" && $to.parent === $from.parent;
};

const headingActive = (editor, level) =>
  !!editor && (inSummary(editor)
    ? editor.state.selection.$from.parent.attrs.level === level
    : editor.isActive("heading", { level }));

const toggleHeadingLevel = (editor, level) => {
  if (!inSummary(editor)) return editor.chain().focus().toggleHeading({ level }).run();
  const next = editor.state.selection.$from.parent.attrs.level === level ? null : level;
  return editor.chain().focus().updateAttributes("toggleSummary", { level: next }).run();
};

const HEADING_BUTTONS = [1, 2, 3].map(level => ({
  id: `h${level}`, level, label: `Heading ${level}`, char: `H${level}`, glyph: { fontWeight: 700, fontSize: 13 },
}));

const AlignIcon = ({ lines }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    {lines.map(([x1, x2], i) => <path key={i} d={`M${x1} ${5 + i * 5}H${x2}`} />)}
  </svg>
);

const ALIGN_BUTTONS = [
  { id: "left",    label: "Align left",   icon: <AlignIcon lines={[[3, 21], [3, 14], [3, 18], [3, 12]]} /> },
  { id: "center",  label: "Align center", icon: <AlignIcon lines={[[3, 21], [7, 17], [5, 19], [8, 16]]} /> },
  { id: "right",   label: "Align right",  icon: <AlignIcon lines={[[3, 21], [10, 21], [6, 21], [12, 21]]} /> },
  { id: "justify", label: "Justify",      icon: <AlignIcon lines={[[3, 21], [3, 21], [3, 21], [3, 21]]} /> },
];

function FormatButton({ item, active, onClick, D }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={item.keys ? `${item.label} (${MOD_KEY}+${item.keys})` : item.label}
      aria-label={item.label}
      aria-pressed={active}
      // mousedown + preventDefault so clicking never steals focus (and with
      // it the text selection) from the editor.
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32, height: 32, padding: 0, border: "none", borderRadius: 8, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: MENU_FONT, fontSize: 14,
        background: active ? D.blue : hover ? D.border : D.bg,
        color: active ? "#fff" : D.text,
        transition: "background 0.12s",
      }}
    >
      {item.icon || <span style={item.glyph}>{item.char}</span>}
    </button>
  );
}

// Shown only for a real text selection that isn't inside the title line —
// not for a selected image, a table-cell selection, or an empty selection.
function shouldShowFormatMenu({ editor, element, view, state, from, to }) {
  const { doc, selection } = state;
  if (!editor.isEditable || !isTextSelection(selection) || selection.empty) return false;
  if (!doc.textBetween(from, to).length) return false;
  if (!(view.hasFocus() || element.contains(document.activeElement))) return false;
  return selection.$from.parent.type.name !== "title" && selection.$to.parent.type.name !== "title";
}

// Palette for the colour picker in the selection popup. "Default" removes the
// colour so the text follows the theme again.
const TEXT_COLORS = [
  ["Red", "#ef4444"], ["Orange", "#f97316"], ["Yellow", "#eab308"], ["Green", "#22c55e"],
  ["Cyan", "#06b6d4"], ["Blue", "#3b82f6"], ["Purple", "#a855f7"], ["Pink", "#ec4899"],
];

export function FormatBubbleMenu({ editor, D }) {
  const [colorOpen, setColorOpen] = useState(false);
  // Collapse the colour row whenever the selection goes away.
  useEffect(() => {
    const onSel = () => { if (editor.state.selection.empty) setColorOpen(false); };
    editor.on("selectionUpdate", onSel);
    return () => editor.off("selectionUpdate", onSel);
  }, [editor]);
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold:      !!editor?.isActive("bold"),
      italic:    !!editor?.isActive("italic"),
      underline: !!editor?.isActive("underline"),
      strike:    !!editor?.isActive("strike"),
      color:     editor?.getAttributes("textColor")?.color || null,
      h1: headingActive(editor, 1),
      h2: headingActive(editor, 2),
      h3: headingActive(editor, 3),
      align: editor?.state.selection.$from.parent.attrs?.textAlign || "left",
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={shouldShowFormatMenu}
      options={{ placement: "top", offset: 10 }}
    >
      <div style={{
        display: "flex", flexDirection: "column", gap: 6, padding: 6, zIndex: 30,
        background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
        boxShadow: "0 12px 32px rgba(0,0,0,0.28)", fontFamily: MENU_FONT,
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {FORMAT_BUTTONS.map(item => (
            <FormatButton
              key={item.id} item={item} D={D}
              active={active[item.id]}
              onClick={() => item.toggle(editor.chain().focus()).run()}
            />
          ))}
          {/* Text colour: the shared picker, rendered inline so this menu keeps focus while it's open
              (the selection menu hides if focus leaves it). Colours apply live to the selection. */}
          <ColorPicker
            D={D} portal={false} align="right" title="Text colour"
            open={colorOpen} onOpenChange={setColorOpen}
            value={normalizeHex(active.color) || normalizeHex(D.text) || "#ffffff"}
            swatches={TEXT_COLORS}
            onChange={hex => editor.chain().setMark("textColor", { color: hex }).run()}
            onReset={() => editor.chain().focus().unsetMark("textColor").run()}
            renderTrigger={({ open, toggle }) => (
              <button
                type="button" title="Text colour" aria-label="Text colour" aria-expanded={open}
                onMouseDown={e => { e.preventDefault(); toggle(); }}
                style={{
                  width: 32, height: 32, padding: 0, border: "none", borderRadius: 8, cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                  background: open ? D.border : D.bg, color: D.text, fontFamily: MENU_FONT, fontSize: 14,
                }}
              >
                <span style={{ fontWeight: 700, lineHeight: 1 }}>A</span>
                <span style={{ width: 16, height: 3, borderRadius: 2, background: active.color || D.textMuted }} />
              </button>
            )}
          />
        </div>
        {/* Second row: turn the selected block(s) into Heading 1–3, and align them. */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {HEADING_BUTTONS.map(item => (
            <FormatButton
              key={item.id} item={item} D={D} active={active[item.id]}
              onClick={() => toggleHeadingLevel(editor, item.level)}
            />
          ))}
          <span aria-hidden="true" style={{ width: 1, alignSelf: "stretch", margin: "4px 2px", background: D.border }} />
          {ALIGN_BUTTONS.map(item => (
            <FormatButton
              key={item.id} item={item} D={D} active={active.align === item.id}
              onClick={() => editor.chain().focus().setTextAlign(item.id).run()}
            />
          ))}
        </div>
      </div>
    </BubbleMenu>
  );
}
