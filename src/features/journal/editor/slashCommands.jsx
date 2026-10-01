import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { MENU_FONT } from "./journalUi";

// Typing "/" opens a vertical, filterable list of every editor command right
// at the cursor. Styled like the selection popup and the date picker (card,
// 1px border, 12px radius, soft shadow; the highlighted row gets the accent).
//
// ADDING A COMMAND = adding one object to SLASH_COMMANDS below:
//   id          unique string
//   group       section header it's listed under. Keep entries of the same
//               group next to each other — headers appear whenever the group
//               changes from one entry to the next.
//   label       main text
//   keywords    extra words the "/filter" text matches against
//   icon        a short string ("H1", "1.") or a small element (see SlashIcon)
//   run         (editor, range, ctx) => void — start with
//               editor.chain().focus().deleteRange(range) so the typed "/…"
//               is removed first. ctx = { openTagPicker } per-editor helpers.

const SlashIcon = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ICON_BULLETS = (
  <SlashIcon>
    <circle cx="5" cy="7" r="1" /><circle cx="5" cy="12" r="1" /><circle cx="5" cy="17" r="1" />
    <path d="M10 7h10M10 12h10M10 17h10" />
  </SlashIcon>
);

const ICON_TOGGLE = (
  <SlashIcon>
    <path d="M5 8l5 4-5 4z" fill="currentColor" />
    <path d="M13 8h7M13 12h7M13 16h7" />
  </SlashIcon>
);

const ICON_TABLE = (
  <SlashIcon>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M4 10h16M4 14.5h16M10 5v14" />
  </SlashIcon>
);

const ICON_IMAGE = (
  <SlashIcon>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.4" /><path d="M20 16l-4.5-4.5L7 19" />
  </SlashIcon>
);

const ICON_GALLERY = (
  <SlashIcon>
    <rect x="3" y="7" width="13" height="12" rx="2" />
    <path d="M8 7V6a2 2 0 012-2h9a2 2 0 012 2v8a2 2 0 01-2 2h-3" />
    <circle cx="7.5" cy="11" r="1.2" /><path d="M16 16l-3.5-3.5L5 19" />
  </SlashIcon>
);

const ICON_DIVIDER = (
  <SlashIcon>
    <path d="M3 12h18" />
    <path d="M8 6l4-3 4 3M8 18l4 3 4-3" />
  </SlashIcon>
);

const SLASH_COMMANDS = [
  {
    id: "heading1", group: "Text", icon: "H1",
    label: "Heading 1",
    keywords: ["heading", "title", "big", "h1"],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run();
    },
  },
  {
    id: "heading2", group: "Text", icon: "H2",
    label: "Heading 2",
    keywords: ["heading", "subtitle", "medium", "h2"],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
    },
  },
  {
    id: "heading3", group: "Text", icon: "H3",
    label: "Heading 3",
    keywords: ["heading", "small", "h3"],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run();
    },
  },
  {
    id: "bulletList", group: "Lists", icon: ICON_BULLETS,
    label: "Bullet list",
    keywords: ["bullet", "list", "unordered", "ul"],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "orderedList", group: "Lists", icon: "1.",
    label: "Numbered list",
    keywords: ["numbered", "number", "list", "ordered", "ol"],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: "toggleList", group: "Lists", icon: ICON_TOGGLE,
    label: "Toggle list",
    keywords: ["toggle", "collapse", "collapsible", "expand", "fold", "hide", "show", "dropdown", "accordion", "details"],
    // Inserts a summary line; press Enter in it to start the hidden/shown content.
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range)
        .insertContent({ type: "toggleList", attrs: { open: true }, content: [{ type: "toggleSummary" }] })
        .run();
    },
  },
  {
    id: "table", group: "Insert", icon: ICON_TABLE,
    label: "Table",
    keywords: ["table", "grid", "rows", "columns"],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run();
    },
  },
  {
    id: "image", group: "Insert", icon: ICON_IMAGE,
    label: "Image",
    keywords: ["image", "picture", "photo", "screenshot", "upload", "single"],
    // Opens the file chooser; the chosen picture is uploaded and inserted at
    // the cursor as a single image (see the hidden file input in JournalEditor).
    run: (editor, range, ctx) => {
      editor.chain().focus().deleteRange(range).run();
      ctx.openImagePicker?.();
    },
  },
  {
    id: "imageGallery", group: "Insert", icon: ICON_GALLERY,
    label: "Image gallery",
    keywords: ["image", "images", "picture", "photo", "screenshot", "gallery", "upload"],
    // Inserts an empty gallery; you add the images from the block itself
    // (click or drop) — the upload runs inside the block (ImageGalleryBlock.jsx).
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertContent({ type: "imageGallery" }).run();
    },
  },
  {
    id: "tag", group: "Insert", icon: "#",
    label: "Tag",
    keywords: ["tag", "tags", "label", "hashtag", "category"],
    // Doesn't insert anything itself — opens the tag popup at the cursor
    // (see TagPicker.jsx), which inserts the chosen/created tag.
    run: (editor, range, ctx) => {
      editor.chain().focus().deleteRange(range).run();
      ctx.openTagPicker?.();
    },
  },
  {
    id: "divider", group: "Insert", icon: ICON_DIVIDER,
    label: "Divider",
    keywords: ["divider", "line", "rule", "hr", "separator", "section", "break"],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

function filterSlashCommands(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(q) ||
    c.group.toLowerCase().includes(q) ||
    c.keywords.some(k => k.includes(q))
  );
}

// The popup itself. Exposes onKeyDown via ref so the Suggestion plugin (which
// owns the actual keydown event from the editor) can forward arrow/enter
// presses into it, same pattern Tiptap's own mention-list examples use.
const SlashCommandList = forwardRef(function SlashCommandList({ items, onSelect, D }, ref) {
  const [selected, setSelected] = useState(0);
  const rowRefs = useRef([]);
  useEffect(() => { setSelected(0); }, [items]);

  // Keep the highlighted row visible when arrowing through a long list.
  useEffect(() => { rowRefs.current[selected]?.scrollIntoView({ block: "nearest" }); }, [selected]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") { setSelected(i => (i + 1) % items.length); return true; }
      if (event.key === "ArrowUp")   { setSelected(i => (i - 1 + items.length) % items.length); return true; }
      if (event.key === "Enter" || event.key === "Tab") { onSelect(items[selected]); return true; }
      return false;
    },
  }), [items, selected, onSelect]);

  return (
    <div style={{
      width: 300, maxHeight: "min(380px, 55vh)", overflowY: "auto", boxSizing: "border-box",
      background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
      padding: 6, boxShadow: "0 12px 32px rgba(0,0,0,0.28)", fontFamily: MENU_FONT,
    }}>
      {items.length === 0 && (
        <div style={{ padding: "10px 10px", fontSize: 13, color: D.textMuted }}>No matching commands</div>
      )}
      {items.map((item, i) => {
        const isSel = i === selected;
        const showHeader = i === 0 || items[i - 1].group !== item.group;
        return (
          <div key={item.id}>
            {showHeader && (
              <div style={{
                padding: i === 0 ? "4px 10px 6px" : "12px 10px 6px",
                fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                textTransform: "uppercase", color: D.textMuted,
              }}>
                {item.group}
              </div>
            )}
            <button
              ref={el => { rowRefs.current[i] = el; }}
              type="button"
              // mousemove (not mouseenter): scrolling with the arrow keys
              // moves rows under a still cursor, which must not steal the
              // highlight.
              onMouseMove={() => { if (!isSel) setSelected(i); }}
              // mousedown (not click) + preventDefault, same reason as every
              // other editor control: clicking must not steal focus/selection
              // away from the range this command is about to operate on.
              onMouseDown={e => { e.preventDefault(); onSelect(item); }}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "6px 8px", borderRadius: 8, border: "none", textAlign: "left",
                background: isSel ? `${D.blue}18` : "transparent",
                color: D.text, cursor: "pointer", font: "inherit", fontFamily: MENU_FONT,
              }}
            >
              <span style={{
                width: 32, height: 32, flexShrink: 0, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                border: `1px solid ${isSel ? D.blue : D.border}`,
                background: isSel ? D.blue : D.bg,
                color: isSel ? "#fff" : D.text,
              }}>
                {item.icon}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: isSel ? D.blue : D.text }}>{item.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
});

// `designRef` is a ref rather than a plain value so this extension — built
// once per editor instance via useMemo — always reads the *current* design
// tokens, not whatever they were the moment the editor was constructed.
export function createSlashCommandExtension({ designRef, openTagPickerRef, openImagePickerRef }) {
  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: "/",
          startOfLine: false,
          // The title line is plain text only — no menu there.
          allow: ({ state, range }) => state.doc.resolve(range.from).parent.type.name !== "title",
          items: ({ query }) => filterSlashCommands(query),
          offset: { mainAxis: 8 },
          command: ({ editor, range, props }) => {
            props.run(editor, range, {
              openTagPicker: () => openTagPickerRef.current?.(),
              openImagePicker: () => openImagePickerRef.current?.(),
            });
          },
          render: () => {
            let component;
            let unmount;
            const propsFor = (props) => ({
              items: props.items, onSelect: (item) => props.command(item), D: designRef.current,
            });
            return {
              onStart: (props) => {
                component = new ReactRenderer(SlashCommandList, { props: propsFor(props), editor: props.editor });
                // The plugin appends this to document.body, outside the
                // full-screen editor's stacking context (z-index 1500) —
                // without its own z-index the popup would render behind it.
                component.element.style.zIndex = "2100";
                unmount = props.mount?.(component.element);
              },
              // Mounted once in onStart; the plugin keeps it positioned.
              onUpdate(props) {
                component?.updateProps(propsFor(props));
              },
              onKeyDown(props) {
                // Escape is handled by the plugin itself (it closes the menu).
                if (props.event.key === "Escape") return true;
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit() {
                unmount?.();
                component?.destroy();
                component = null; unmount = null;
              },
            };
          },
        }),
      ];
    },
  });
}
