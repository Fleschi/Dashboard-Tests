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
      body { background: ${D.bg}; margin: 0; padding: 0; font-size: 15px; }

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
    `}</style>
  );
}