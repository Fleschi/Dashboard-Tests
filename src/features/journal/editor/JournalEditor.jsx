import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { createPortal } from "react-dom";
import { uploadJournalScreenshot } from "../../../services/supabase/journal";
import TagPicker, { TAG_PICKER_WIDTH } from "../tags/TagPicker";
import { useTagLibrary } from "../tags/tagLibrary";
import { FormatBubbleMenu } from "./FormatBubbleMenu";
import TableMenu from "./TableMenu";
import { MAX_IMAGES_PER_ENTRY, countImages } from "./blocks/ImageGalleryBlock";
import { normalizeContent } from "./content";
import { BASE_EXTENSIONS } from "./extensions";
import { JournalContext } from "./journalUi";
import { createSlashCommandExtension } from "./slashCommands";

// `entryKey` identifies which entry this editor instance represents (e.g.
// `edit-<id>` or `new-<n>`). It's the only thing that should ever force the
// editor's document to be replaced wholesale — everyday typing must never
// get clobbered by the `content` prop bouncing back down from parent state.
// `editable` false = reading-only mode: same rendering, but nothing can be typed,
// inserted or changed (blocks hide their editing controls, see useJournal()).
export default function JournalEditor({ entryKey, content, onUpdate, onImageClick, D, editable = true }) {
  const designRef = useRef(D);
  designRef.current = D;

  // Built once per component instance (empty deps, same as the editor
  // itself below) — the slash extension reads designRef for anything that
  // can change after that, rather than closing over stale values from this
  // first render.
  const openTagPickerRef = useRef(null);
  const openImagePickerRef = useRef(null);
  const extensions = useMemo(() => [
    ...BASE_EXTENSIONS,
    createSlashCommandExtension({ designRef, openTagPickerRef, openImagePickerRef }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const editor = useEditor({
    extensions,
    content: normalizeContent(content),
    editable,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getJSON());
    },
  }, []);

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  // Swap the whole document only when we've moved to a different entry
  // (opening another one, or starting a fresh "+ New Entry"), never on the
  // entry's own keystrokes.
  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(normalizeContent(content), { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, entryKey]);

  // ── "/image": pick one file, upload it, insert it as a single image ───────
  const imageInputRef = useRef(null);
  const imagePosRef = useRef(0);
  const [imageStatus, setImageStatus] = useState(null);   // null | { type: "uploading" | "error", message }
  openImagePickerRef.current = () => {
    if (!editor) return;
    imagePosRef.current = editor.state.selection.from;
    imageInputRef.current?.click();
  };
  const insertPickedImage = async (file) => {
    if (!file || !file.type?.startsWith("image/")) return;
    if (countImages(editor.getJSON()) >= MAX_IMAGES_PER_ENTRY) {
      setImageStatus({ type: "error", message: "This entry can't hold any more images." });
      return;
    }
    setImageStatus({ type: "uploading", message: "Uploading image…" });
    try {
      const src = await uploadJournalScreenshot(file, "inline");
      editor.chain().focus().insertContentAt(imagePosRef.current, { type: "image", attrs: { src, alt: file.name, size: "medium" } }).run();
      setImageStatus(null);
    } catch (e) {
      setImageStatus({ type: "error", message: e?.message || "The image failed to upload." });
    }
  };

  // ── "/tag" popup ──────────────────────────────────────────────────────────
  // Opened by the slash command with the cursor where the "/tag" was typed;
  // the chosen tag is inserted there as an inline node, followed by a space.
  const [tagPicker, setTagPicker] = useState(null);   // { pos, left, top } | null
  openTagPickerRef.current = () => {
    if (!editor) return;
    const pos = editor.state.selection.from;
    const c = editor.view.coordsAtPos(pos);
    const H = 340 + 8;
    let top = c.bottom + 8;
    if (top + H > window.innerHeight) top = Math.max(8, c.top - H);
    const left = Math.max(8, Math.min(c.left, window.innerWidth - TAG_PICKER_WIDTH - 8));
    setTagPicker({ pos, left, top });
  };
  const closeTagPicker = useCallback(() => {
    setTagPicker(null);
    editor?.commands.focus();
  }, [editor]);
  const insertTag = (tag) => {
    const pos = tagPicker?.pos ?? editor.state.selection.from;
    setTagPicker(null);
    editor.chain().focus().insertContentAt(pos, [
      { type: "tag", attrs: { tagId: tag.id, name: tag.name, color: tag.color || null } },
      { type: "text", text: " " },
    ]).run();
  };
  // Switching entries must not carry an open popup over.
  useEffect(() => { setTagPicker(null); }, [entryKey]);

  // A tag deleted from the library (here or via its group) is removed from the
  // open note too, so autosave can't write its id back into `tag_ids`.
  const tagLib = useTagLibrary();
  useEffect(() => {
    if (!editor || tagLib.status !== "ready") return;
    const known = new Set(tagLib.tags.map(t => t.id));
    const stale = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "tag" && !known.has(node.attrs.tagId)) stale.push({ pos, size: node.nodeSize });
    });
    if (!stale.length) return;
    const tr = editor.state.tr;
    stale.reverse().forEach(({ pos, size }) => tr.delete(pos, pos + size));
    editor.view.dispatch(tr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, tagLib.status, tagLib.tags, entryKey]);

  return (
    <JournalContext.Provider value={{ D, editable }}>
    <div>
      <div
        style={{ position: "relative" }}
        // Delegated click handler so every inserted image opens the
        // full-size lightbox, without needing a custom Tiptap node view.
        onClick={e => {
          if (onImageClick && e.target.classList?.contains("journal-image")) {
            onImageClick(e.target.getAttribute("src"));
          }
        }}
      >
        <EditorContent editor={editor} className="journal-editor" />
        <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { insertPickedImage(e.target.files?.[0]); e.target.value = ""; }} />
        {imageStatus && (
          <div role="status" style={{ marginTop: 8, fontSize: 12, color: imageStatus.type === "error" ? (D.red || "#e5484d") : D.textMuted }}>
            {imageStatus.message}
            {imageStatus.type === "error" && (
              <button type="button" onClick={() => setImageStatus(null)} style={{ marginLeft: 8, border: "none", background: "transparent", cursor: "pointer", color: D.textMuted, textDecoration: "underline", fontSize: 12 }}>Dismiss</button>
            )}
          </div>
        )}
        {editor && <FormatBubbleMenu editor={editor} D={D} />}
        {editor && editable && <TableMenu editor={editor} D={D} />}
        {tagPicker && createPortal(
          <TagPicker D={D} onPick={insertTag} onClose={closeTagPicker}
            style={{ position: "fixed", left: tagPicker.left, top: tagPicker.top }} />,
          document.body,
        )}
      </div>
    </div>
    </JournalContext.Provider>
  );
}
