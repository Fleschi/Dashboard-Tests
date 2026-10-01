// "Image gallery" block: a titled grid of one or more images, each with its own
// caption. Size (Small / Medium / Large), adding images and deleting the block
// live in the "Gallery" popup menu. (Single images come from the separate
// "/image" command — plain `image` nodes, see BASE_EXTENSIONS in JournalEditor.jsx.)

import { useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { uploadJournalScreenshot } from "../../../../services/supabase/journal";
import { useJournal, MENU_FONT, popoverStyle, IconX, IconTrash, IconImages, IconCheck, IconChevron } from "../journalUi";

// No single entry can hold more than this many images — mainly so the
// editor can't be used to quietly run up unbounded Supabase Storage usage.
export const MAX_IMAGES_PER_ENTRY = 100;

// Recursively counts images anywhere in the document — legacy `image` nodes
// and every image inside a gallery — so the cap can't be dodged by tucking
// images away in a table.
export function countImages(json) {
  if (!json || typeof json !== "object") return 0;
  let count = json.type === "image" ? 1 : 0;
  if (json.type === "imageGallery") count += Array.isArray(json.attrs?.images) ? json.attrs.images.length : 0;
  if (Array.isArray(json.content)) {
    for (const child of json.content) count += countImages(child);
  }
  return count;
}

// Minimum tile width per size; the grid fits as many columns as that allows.
const GALLERY_SIZES = [
  { id: "small",  label: "Small",  min: 130 },
  { id: "medium", label: "Medium", min: 240 },
  { id: "large",  label: "Large",  min: 420 },
];

function ImageGalleryView({ node, editor, updateAttributes, deleteNode, selected }) {
  const { D, editable } = useJournal();
  const { title, size, images } = node.attrs;
  const list = Array.isArray(images) ? images : [];
  const sizeDef = GALLERY_SIZES.find(s => s.id === size) || GALLERY_SIZES[1];

  // Uploads finish asynchronously, so always append to the *latest* list.
  const imagesRef = useRef(list);
  imagesRef.current = list;
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null); // null | {type:'uploading',done,total} | {type:'error',message}
  const [dragOver, setDragOver] = useState(false);

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(f => f.type?.startsWith("image/"));
    if (files.length === 0) return;

    const remaining = MAX_IMAGES_PER_ENTRY - countImages(editor.getJSON());
    if (remaining <= 0) {
      setStatus({ type: "error", message: "This entry can't hold any more images." });
      return;
    }
    const toUpload = files.slice(0, remaining);
    const skipped = files.length - toUpload.length;
    let done = 0, failed = 0;
    setStatus({ type: "uploading", done, total: toUpload.length });

    for (const file of toUpload) {
      try {
        const src = await uploadJournalScreenshot(file, "inline");
        const next = [...imagesRef.current, { src, alt: file.name }];
        imagesRef.current = next;
        updateAttributes({ images: next });
      } catch (e) {
        failed += 1;
      }
      done += 1;
      setStatus({ type: "uploading", done, total: toUpload.length });
    }

    if (failed > 0 || skipped > 0) {
      const parts = [];
      if (failed > 0)  parts.push(`${failed} image${failed > 1 ? "s" : ""} failed to upload`);
      if (skipped > 0) parts.push(`${skipped} skipped — this entry can't hold any more images`);
      setStatus({ type: "error", message: parts.join("; ") + "." });
    } else {
      setStatus(null);
    }
  };

  const removeImage = (index) => updateAttributes({ images: list.filter((_, i) => i !== index) });

  const dropHandlers = {
    onDragOver: (e) => { if (e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); setDragOver(true); } },
    onDragLeave: () => setDragOver(false),
    onDrop: (e) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault(); setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
  };

  const setCaption = (index, text) => updateAttributes({
    images: list.map((im, i) => (i === index ? { ...im, caption: text } : im)),
  });

  return (
    <NodeViewWrapper className="journal-block" contentEditable={false} style={{ margin: "14px 0", fontFamily: MENU_FONT }}>
      <div {...(editable ? dropHandlers : {})} style={{ position: "relative" }}>
        {/* Header: title + the gallery menu (size, add images, delete) */}
        {(editable || title) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <input
              className="journal-block-input"
              value={title || ""}
              placeholder={editable ? "Gallery title, e.g. My Trades:" : ""}
              readOnly={!editable}
              onChange={e => updateAttributes({ title: e.target.value })}
              style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: D.text }}
            />
            {editable && (
              <BlockMenu
                D={D} size={sizeDef.id}
                onSize={id => updateAttributes({ size: id })}
                onAdd={() => fileRef.current?.click()}
                onDelete={deleteNode}
              />
            )}
          </div>
        )}
        {/* Body: placeholder when empty, otherwise the grid */}
        {list.length === 0 && !editable ? (
          <div style={{ padding: "12px 4px", fontSize: 13, color: D.textMuted }}>No images</div>
        ) : list.length === 0 ? (
          <button
            type="button" onClick={() => fileRef.current?.click()}
            style={{
              width: "100%", padding: "28px 16px", borderRadius: 10, cursor: "pointer",
              border: `1.5px dashed ${dragOver ? D.blue : D.border}`, background: D.bg, color: D.textMuted,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              fontFamily: MENU_FONT,
            }}
          >
            <IconImages size={26} />
            <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>Add images</span>
            <span style={{ fontSize: 12 }}>Click to choose one or more, or drop them here</span>
          </button>
        ) : (
          <div style={{
            display: "grid", gap: 14, alignItems: "start",
            gridTemplateColumns: `repeat(auto-fill, minmax(${sizeDef.min}px, 1fr))`,
            outline: dragOver ? `2px dashed ${D.blue}` : "none", outlineOffset: 4, borderRadius: 8,
          }}>
            {list.map((img, i) => (
              <div key={`${img.src}-${i}`} className="journal-gallery-tile">
                <div style={{ position: "relative" }}>
                  <img
                    className="journal-image" src={img.src} alt={img.alt || ""} draggable={false}
                    style={{
                      width: "100%", height: "auto", display: "block", margin: 0,
                      borderRadius: 8, border: `1px solid ${D.border}`, cursor: "zoom-in",
                    }}
                  />
                  {editable && <button type="button" className="journal-tile-remove" title="Remove image" aria-label="Remove image"
                    onClick={() => removeImage(i)}
                    style={{ background: D.card, border: `1px solid ${D.border}`, color: D.text }}>
                    <IconX size={12} />
                  </button>}
                </div>
                {/* One caption per image */}
                {(editable || img.caption) && (
                  <input
                    className="journal-block-input"
                    value={img.caption || ""}
                    placeholder={editable ? "Add a caption…" : ""}
                    readOnly={!editable}
                    aria-label={`Caption for image ${i + 1}`}
                    onChange={e => setCaption(i, e.target.value)}
                    style={{ width: "100%", marginTop: 4, fontSize: 13, color: D.textMuted }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {status?.type === "uploading" && (
          <div style={{ fontSize: 12, color: D.textMuted, marginTop: 10 }}>
            Uploading image {Math.min(status.done + 1, status.total)} of {status.total}…
          </div>
        )}
        {status?.type === "error" && (
          <div style={{ fontSize: 12, color: D.red || "#e5484d", marginTop: 10 }}>{status.message}</div>
        )}
      </div>

      <input
        ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={e => { addFiles(e.target.files); e.target.value = ""; }}
      />
    </NodeViewWrapper>
  );
}

// The gallery's popup menu — same look as the "/" list: Size, Images, Gallery.
// `label` is the button text and the heading of the delete group; `onAdd` is
// optional (only the gallery can add more images).
export function BlockMenu({ D, size, onSize, onAdd, onDelete, label = "Gallery", deleteLabel = "Delete gallery" }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // Outside press / Escape closes it. The button counts as inside: it toggles
  // the menu itself, and this listener attaches during the mousedown that opened it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc, true);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onEsc, true); };
  }, [open]);

  const red = D.red || "#e5484d";
  const items = [
    ...GALLERY_SIZES.map(sz => ({ group: "Size", id: sz.id, label: sz.label, icon: sz.label[0], active: sz.id === size, run: () => onSize(sz.id), keepOpen: true })),
    ...(onAdd ? [{ group: "Images", id: "add", label: "Add images", icon: <IconImages size={18} />, run: onAdd }] : []),
    { group: label, id: "delete", label: deleteLabel, icon: <IconTrash size={18} />, run: onDelete, danger: true },
  ];

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button ref={btnRef} type="button" title={`${label} options`} aria-label={`${label} options`} aria-haspopup="menu" aria-expanded={open}
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        style={{
          height: 28, padding: "0 10px", border: `1px solid ${open ? D.blue : D.border}`, borderRadius: 8, cursor: "pointer",
          background: open ? D.blue : D.card, color: open ? "#fff" : D.text, fontFamily: MENU_FONT, fontSize: 12, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 4,
        }}>
        {label} <IconChevron size={12} />
      </button>

      {open && (
        <div ref={menuRef} role="menu" style={{
          ...popoverStyle(D), position: "absolute", right: 0, top: "calc(100% + 6px)", width: 230, zIndex: 50, boxSizing: "border-box",
        }}>
          {items.map((it, i) => {
            const header = i === 0 || items[i - 1].group !== it.group;
            const accent = it.danger ? red : D.blue;
            return (
              <div key={it.id}>
                {header && (
                  <div style={{ padding: i === 0 ? "4px 10px 6px" : "12px 10px 6px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: D.textMuted }}>{it.group}</div>
                )}
                <button type="button" role="menuitem" className="journal-menu-item"
                  onMouseDown={e => { e.preventDefault(); it.run(); if (!it.keepOpen) setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "6px 8px", borderRadius: 8, border: "none", textAlign: "left",
                    background: "transparent", color: it.danger ? red : D.text, cursor: "pointer", font: "inherit", fontFamily: MENU_FONT,
                  }}>
                  <span style={{
                    width: 32, height: 32, flexShrink: 0, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    border: `1px solid ${it.active ? accent : D.border}`, background: it.active ? accent : D.bg, color: it.active ? "#fff" : "inherit",
                  }}>{it.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{it.label}</span>
                  {it.active && <IconCheck size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const readJson = (el, name) => {
  try { const v = JSON.parse(el.getAttribute(name) || "[]"); return Array.isArray(v) ? v : []; }
  catch { return []; }
};

export const ImageGallery = Node.create({
  name: "imageGallery",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      title:   { default: "",       parseHTML: el => el.getAttribute("data-title") || "",        renderHTML: a => ({ "data-title": a.title || "" }) },
      caption: { default: "",       parseHTML: el => el.getAttribute("data-caption") || "",      renderHTML: a => ({ "data-caption": a.caption || "" }) },
      size:    { default: "medium", parseHTML: el => el.getAttribute("data-size") || "medium",    renderHTML: a => ({ "data-size": a.size || "medium" }) },
      images:  { default: [],       parseHTML: el => readJson(el, "data-images"),                renderHTML: a => ({ "data-images": JSON.stringify(a.images || []) }) },
    };
  },

  parseHTML() { return [{ tag: 'div[data-type="image-gallery"]' }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes, { "data-type": "image-gallery" })]; },
  addNodeView() { return ReactNodeViewRenderer(ImageGalleryView); },
});
