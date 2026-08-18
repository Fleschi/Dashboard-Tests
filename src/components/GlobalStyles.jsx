export function GlobalStyles({ design: D }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      body { background: ${D.bg}; margin: 0; padding: 0; }

      /* ── Sidebar (desktop) — floating pill, expands on hover ─────────── */

      .side-pill {
        position: fixed;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 30;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: 52px;
        padding: 10px 0;
        border-radius: 26px;
        background: ${D.sidebar}f2;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid ${D.border};
        overflow: hidden;
        transition: width 0.28s cubic-bezier(0.4,0,0.2,1), border-radius 0.28s cubic-bezier(0.4,0,0.2,1);
      }
      .side-pill:hover {
        width: 190px;
        border-radius: 20px;
      }

      .side-pill-group {
        display: flex;
        flex-direction: column;
        padding: 4px 8px;
        gap: 2px;
      }
      .side-pill-divider {
        height: 1px;
        background: ${D.border};
        margin: 6px 14px;
        flex-shrink: 0;
      }

      .side-item {
        position: relative;
        display: flex; align-items: center; gap: 14px;
        height: 36px;
        padding: 0 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: ${D.textMuted};
        border: none;
        background: none;
        text-align: left;
        width: 100%;
        border-radius: 10px;
        white-space: nowrap;
        flex-shrink: 0;
        transition: color 0.12s ease, background 0.12s ease;
      }
      .side-item svg { flex-shrink: 0; margin-left: 1px; }
      .side-item:hover { color: ${D.text}; background: ${D.text}0a; }
      .side-item.active { color: ${D.text}; font-weight: 600; background: ${D.text}12; }

      .side-item-label {
        opacity: 0;
        transition: opacity 0.15s ease 0s;
      }
      .side-pill:hover .side-item-label { opacity: 1; transition-delay: 0.08s; }

      .side-logo-row {
        display: flex; align-items: center; gap: 14px;
        padding: 4px 16px 12px;
        flex-shrink: 0;
      }

      .side-mark {
        width: 16px; height: 16px;
        border: 1.5px solid ${D.text};
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        flex-shrink: 0;
        margin-left: 2px;
      }
      .side-mark span { border: 0.5px solid ${D.text}; }
      .side-mark span:nth-child(1), .side-mark span:nth-child(4) { background: ${D.text}; }

      .side-logo-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.14em;
        color: ${D.text};
        opacity: 0;
        transition: opacity 0.15s ease;
        white-space: nowrap;
      }
      .side-pill:hover .side-logo-label { opacity: 1; transition-delay: 0.08s; }

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
        border-radius: ${D.radiusSm ?? 6}px; margin: 2px 8px; width: calc(100% - 16px);
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
