export function GlobalStyles({ design: D }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

      * { box-sizing: border-box; }
      body {
        background: ${D.bg};
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
      }

      button, input, select, textarea { font-family: inherit; }

      :focus-visible {
        outline: 2px solid ${D.text}80;
        outline-offset: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* ── Top nav ────────────────────────────────────────────────────── */

      .nav-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 34px;
        padding: 0 12px;
        border-radius: 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: ${D.textMuted};
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        transition: color 0.15s ease, background 0.15s ease;
      }

      .nav-btn:hover { color: ${D.text}; background: ${D.text}0d; }

      .nav-btn.active {
        color: ${D.text};
        background: ${D.text}14;
        font-weight: 600;
      }

      /* ── Scrollbar ──────────────────────────────────────────────────── */

      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${D.border}; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: ${D.textMuted}; }
    `}</style>
  );
}
