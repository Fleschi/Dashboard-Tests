export function GlobalStyles({ design: D }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

      * { box-sizing: border-box; }
      body {
        background: ${D.bg};
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      button, input, select, textarea { font-family: inherit; }

      :focus-visible {
        outline: 2px solid ${D.blue}80;
        outline-offset: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* ── Top nav pill ───────────────────────────────────────────────── */

      .lg-shell {
        position: relative;
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 5px;
        border-radius: 999px;
        background: ${D.card}c0;
        backdrop-filter: blur(20px) saturate(160%);
        -webkit-backdrop-filter: blur(20px) saturate(160%);
        border: 1px solid ${D.border};
        box-shadow: 0 8px 24px ${D.bg}50;
      }

      /* ── Individual pill buttons ────────────────────────────────────── */

      .lg-btn {
        position: relative;
        display: flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 10px;
        border-radius: 999px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: ${D.textMuted};
        font-size: 12px;
        font-weight: 400;
        white-space: nowrap;
        flex-shrink: 0;
        transition: color 0.18s ease, background 0.18s ease, padding 0.22s cubic-bezier(0.4,0,0.2,1);
      }

      .lg-btn:hover {
        color: ${D.text};
        background: ${D.text}0d;
      }

      .lg-btn.active {
        color: ${D.bg};
        font-weight: 600;
        background: ${D.blue};
      }

      /* ── Divider ────────────────────────────────────────────────────── */

      .lg-divider {
        width: 1px;
        height: 16px;
        background: ${D.border};
        margin: 0 4px;
      }

      /* ── Scrollbar ──────────────────────────────────────────────────── */

      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${D.border}; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: ${D.textMuted}; }
    `}</style>
  );
}
