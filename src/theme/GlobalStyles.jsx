import { FONT_FAMILY } from "./fonts";

export function GlobalStyles({ design: D }) {
  // Both the sidebar's logo block and the top bar derive their height from this
  // single value, so their bottom borders always land on the same line — one
  // continuous, aligned frame instead of two independently-set 64px values
  // that could drift apart.
  const HEADER_H = 72;
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      body { background: ${D.bg}; margin: 0; padding: 0; font-size: 15px; font-family: ${FONT_FAMILY}; }

      /* ── Sidebar (desktop) ─────────────────────────────────────────── */

      .side-rail {
        display: flex;
        flex-direction: column;
        background: ${D.sidebar};
        border-right: 1px solid ${D.border};
      }

      .side-logo {
        display: flex;
        align-items: center;
        gap: 12px;
        height: ${HEADER_H}px;
        padding: 0 22px;
        border-bottom: 1px solid ${D.border};
        flex-shrink: 0;
      }

      .side-mark {
        width: 20px; height: 20px;
        border: 1.5px solid ${D.text};
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        flex-shrink: 0;
      }
      .side-mark span { border: 0.5px solid ${D.text}; }
      .side-mark span:nth-child(1), .side-mark span:nth-child(4) { background: ${D.text}; }

      .side-nav {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px 0;
        flex: 1;
      }

      .side-item {
              position: relative;
              display: flex; align-items: center;
              padding: 0 12px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              color: ${D.textMuted};
              border: none;
              background: none;
              text-align: left;
              width: 100%;
              transition: color 0.12s ease;
            }
            .side-item:hover { color: ${D.text}; }
            .side-item.active { color: ${D.text}; font-weight: 600; }

            /* Spans the full row so hover/active highlighting has symmetric
               space on both sides, rather than hugging just the icon + label. */
            .side-item-pill {
              display: flex; align-items: center; gap: 13px;
              width: 100%;
              padding: 10px 14px;
              border-radius: 10px;
              transition: background 0.12s ease;
            }
            .side-item:hover .side-item-pill { background: ${D.text}20; }
            .side-item.active .side-item-pill { background: ${D.text}30; }

            /* Small accent-tinted tile behind every tab's icon, so icons read as
               distinct marks rather than flat monochrome glyphs; it deepens on
               hover/active to reinforce the current selection. */
            .side-icon-badge {
              display: flex; align-items: center; justify-content: center;
              width: 30px; height: 30px;
              border-radius: 5px;
              background: ${D.blue};
              color: #000;
              flex-shrink: 0;
              transition: background 0.12s ease;
            }
            .side-item:hover .side-icon-badge { background: ${D.blue}; }
            .side-item.active .side-icon-badge { background: ${D.blue}; }

            .side-foot {
              border-top: 1px solid ${D.border};
              flex-shrink: 0;
              padding: 8px 0;
            }

      /* ── Top bar (desktop content header) ──────────────────────────── */

      .top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 40px;
        height: ${HEADER_H}px;
        background: ${D.sidebar};
        border-bottom: 1px solid ${D.border};
        flex-shrink: 0;
      }

      .top-bar-title {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: ${D.text};
      }

      .top-bar-crumb {
        font-size: 13px;
        color: ${D.textMuted};
      }

      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${D.border}; }

      /* ── Journal tab — blank-page editor ───────────────────────────── */

      .journal-editor .ProseMirror {
        min-height: 420px;
        outline: none;
        font-size: 20px;
        line-height: 1.7;
        color: ${D.text};
      }
      .journal-editor .ProseMirror p { margin: 0 0 0.6em 0; }
      .journal-editor .ProseMirror p:last-child { margin-bottom: 0; }
      .journal-editor .ProseMirror h1 {
        font-size: 1.7em;
        font-weight: 700;
        line-height: 1.3;
        margin: 0.2em 0 0.5em 0;
      }
      .journal-editor .ProseMirror h2 {
        font-size: 1.4em;
        font-weight: 700;
        line-height: 1.35;
        margin: 0.2em 0 0.45em 0;
      }
      .journal-editor .ProseMirror h3 {
        font-size: 1.15em;
        font-weight: 700;
        line-height: 1.4;
        margin: 0.2em 0 0.4em 0;
      }

      /* The title line every entry starts with — bigger than any heading. */
      .journal-editor .ProseMirror h1.journal-title {
        font-size: 2.4em;
        font-weight: 700;
        line-height: 1.2;
        margin: 0 0 0.45em 0;
      }

      /* Per-node placeholder text (Placeholder extension) — shown via a
         data-placeholder attribute + .is-empty class on genuinely empty
         top-level blocks only, so it never bleeds into table cells the way
         an absolutely-positioned overlay would. */
      .journal-editor .ProseMirror .is-empty::before {
        content: attr(data-placeholder);
        float: left;
        height: 0;
        color: ${D.textMuted};
        pointer-events: none;
      }

      .journal-editor .ProseMirror ul,
      .journal-editor .ProseMirror ol {
        margin: 0 0 0.6em 0;
        padding-left: 1.4em;
      }
      .journal-editor .ProseMirror ul { list-style-type: disc; }
      .journal-editor .ProseMirror ol { list-style-type: decimal; }
      .journal-editor .ProseMirror ul ul { list-style-type: circle; }
      .journal-editor .ProseMirror li { margin: 0.15em 0; }
      .journal-editor .ProseMirror li p { margin: 0; }

      .journal-editor .ProseMirror .tableWrapper { overflow-x: auto; margin: 0.5em 0; }
      .journal-editor .ProseMirror table {
        border-collapse: collapse;
        table-layout: fixed;
        width: 100%;
      }
      .journal-editor .ProseMirror td,
      .journal-editor .ProseMirror th {
        border: 1px solid ${D.border};
        padding: 7px 10px;
        vertical-align: top;
        position: relative;
        min-width: 60px;
      }
      .journal-editor .ProseMirror th {
        font-weight: 700;
        text-align: left;
        background: ${D.bg};
      }
      .journal-editor .ProseMirror .selectedCell::after {
        content: "";
        position: absolute; inset: 0;
        background: ${D.text}1f;
        pointer-events: none;
      }

      .journal-editor .ProseMirror img.journal-image {
        max-width: 100%;
        border-radius: 10px;
        border: 1px solid ${D.border};
        display: block;
        margin: 0.5em 0;
        cursor: zoom-in;
      }
      .journal-editor .ProseMirror img.journal-image.ProseMirror-selectednode {
        outline: 2px solid ${D.text};
        outline-offset: 2px;
      }

      /* Toggle list ("/toggle") */
      .journal-editor .ProseMirror .toggle-list {
        position: relative;
        margin: 0 0 0.6em 0;
        padding-left: 1.7em;
      }
      .journal-editor .ProseMirror .toggle-chevron {
        position: absolute;
        left: 0; top: 0.3em;
        width: 1.4em; height: 1.4em;
        display: flex; align-items: center; justify-content: center;
        padding: 0; border: none; border-radius: 4px;
        background: transparent; color: ${D.textMuted};
        cursor: pointer;
      }
      .journal-editor .ProseMirror .toggle-chevron:hover { background: ${D.border}; color: ${D.text}; }
      .journal-editor .ProseMirror .toggle-chevron svg { width: 0.8em; height: 0.8em; transition: transform 0.15s ease; }
      .journal-editor .ProseMirror .toggle-list[data-open="true"] > .toggle-chevron svg { transform: rotate(90deg); }
      .journal-editor .ProseMirror .toggle-summary { margin: 0; }
      .journal-editor .ProseMirror .toggle-summary-h1 { font-size: 1.7em; font-weight: 700; line-height: 1.3; }
      .journal-editor .ProseMirror .toggle-summary-h2 { font-size: 1.4em; font-weight: 700; line-height: 1.35; }
      .journal-editor .ProseMirror .toggle-summary-h3 { font-size: 1.15em; font-weight: 700; line-height: 1.4; }
      .journal-editor .ProseMirror .toggle-list:has(> .toggle-body > .toggle-summary-h1) > .toggle-chevron { top: 0.55em; }
      .journal-editor .ProseMirror .toggle-list:has(> .toggle-body > .toggle-summary-h2) > .toggle-chevron { top: 0.4em; }
      .journal-editor .ProseMirror .toggle-list:has(> .toggle-body > .toggle-summary-h3) > .toggle-chevron { top: 0.3em; }
      .journal-editor .ProseMirror .toggle-summary.is-empty::before {
        content: "Toggle";
        color: ${D.textMuted}; opacity: 0.6; float: left; height: 0; pointer-events: none;
      }
      .journal-editor .ProseMirror .toggle-list[data-open="false"] > .toggle-body > :not(.toggle-summary) { display: none; }

      /* Divider ("/divider" or "---") */
      .journal-editor .ProseMirror hr {
        border: none;
        border-top: 1px solid ${D.border};
        margin: 1.4em 0;
      }
      .journal-editor .ProseMirror hr.ProseMirror-selectednode { border-top-color: ${D.blue}; }

      /* Custom blocks (image gallery, tags) */
      .journal-block-input {
        font-family: inherit; box-sizing: border-box;
        background: transparent; border: 1px solid transparent; border-radius: 8px;
        padding: 6px 8px; outline: none;
      }
      .journal-block-input::placeholder { color: ${D.textMuted}; }
      .journal-block-input:focus { background: ${D.bg}; border-color: ${D.border}; }
      .journal-menu-item:hover { background: ${D.text}12 !important; }
      .journal-tile-remove {
        position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; padding: 0;
        display: flex; align-items: center; justify-content: center;
        border-radius: 999px; cursor: pointer; opacity: 0; transition: opacity 0.12s;
      }
      .journal-gallery-tile:hover .journal-tile-remove,
      .journal-tile-remove:focus-visible { opacity: 1; }
      .journal-row-actions { opacity: 0; transition: opacity 0.12s; }
      .journal-row:hover .journal-row-actions,
      .journal-row:focus-within .journal-row-actions { opacity: 1; }
    `}</style>
  );
}