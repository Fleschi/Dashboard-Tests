export function GlobalStyles({ design: D }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      body { background: ${D.bg}; margin: 0; padding: 0; }

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
        gap: 10px;
        padding: 22px 20px;
        border-bottom: 1px solid ${D.border};
        flex-shrink: 0;
      }

      .side-mark {
        width: 18px; height: 18px;
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
        padding: 8px 0;
        flex: 1;
      }

      .side-item {
        position: relative;
        display: flex; align-items: center; gap: 12px;
        padding: 11px 20px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: ${D.textMuted};
        border: none;
        background: none;
        text-align: left;
        width: 100%;
        border-left: 2px solid transparent;
        transition: color 0.12s ease, background 0.12s ease, border-color 0.12s ease;
      }
      .side-item:hover { color: ${D.text}; background: ${D.text}08; }
      .side-item.active {
        color: ${D.text};
        font-weight: 600;
        background: ${D.text}0c;
        border-left: 2px solid ${D.text};
      }

      .side-foot {
        border-top: 1px solid ${D.border};
        flex-shrink: 0;
      }

      /* ── Top bar (desktop content header) ──────────────────────────── */

      .top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 32px;
        height: 56px;
        border-bottom: 1px solid ${D.border};
        flex-shrink: 0;
      }

      .top-bar-title {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: ${D.text};
      }

      .top-bar-crumb {
        font-size: 12px;
        color: ${D.textMuted};
      }

      /* ── Divider ────────────────────────────────────────────────────── */

      .grid-divider { width: 1px; height: 16px; background: ${D.border}; margin: 0 4px; }

      /* ── Nav items (mobile bottom bar) ─────────────────────────────── */

      .nav-item {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 18px; cursor: pointer; font-size: 13px; font-weight: 500;
        border: none; background: none; text-align: left; color: ${D.textMuted};
        border-radius: 2px; margin: 2px 8px; width: calc(100% - 16px);
        transition: color 0.15s ease, background 0.15s ease; white-space: nowrap; overflow: hidden;
      }
      .nav-item:hover { background: ${D.text}08; color: ${D.text}; }
      .nav-item.active-back { background: ${D.text}0c; color: ${D.text}; }
      .nav-item.active-fwd  { background: ${D.green}14; color: ${D.green}; }
      .nav-item.active-settings { background: ${D.text}0c; color: ${D.text}; }

      .nav-label { transition: opacity 0.1s ease; }
      .nav-label.hidden { opacity: 0; pointer-events: none; width: 0; }

      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${D.border}; }
    `}</style>
  );
}
