export function GlobalStyles({ design: D }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      body { background: ${D.bg}; margin: 0; padding: 0; }

      /* ── Liquid Glass nav ───────────────────────────────────────────── */

      .lg-shell {
        position: relative;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 5px 8px;
        border-radius: 999px;

        /* Frosted glass base */
        background: ${D.bg}18;
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);

        /* Subtle border using two insets — top-left light, bottom-right dark */
        border: 1px solid ${D.border}60;
        box-shadow:
          inset 0 1px 0 ${D.text}14,
          inset 0 -1px 0 ${D.bg}30,
          0 4px 24px ${D.bg}40,
          0 1px 4px ${D.bg}20;
      }

      /* Specular highlight — top edge shimmer */
      .lg-shell::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(
          160deg,
          ${D.text}0f 0%,
          ${D.text}06 30%,
          transparent 60%
        );
        pointer-events: none;
        z-index: 0;
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
        border: 1px solid transparent;
        background: transparent;
        cursor: pointer;
        color: ${D.textMuted};
        font-size: 12px;
        font-weight: 400;
        white-space: nowrap;
        flex-shrink: 0;
        transition: color 0.18s, background 0.18s, border-color 0.18s, padding 0.22s cubic-bezier(0.4,0,0.2,1);
        z-index: 1;
      }

      .lg-btn:hover {
        color: ${D.text};
        background: ${D.text}0a;
        border-color: ${D.border}80;
      }

      .lg-btn.active {
        color: ${D.blue};
        font-weight: 600;
        background: ${D.blue}18;
        border-color: ${D.blue}50;
        box-shadow:
          inset 0 1px 0 ${D.blue}25,
          0 1px 3px ${D.blue}20;
      }

      /* ── Mode toggle inside shell ───────────────────────────────────── */

      .lg-mode {
        display: flex;
        border-radius: 999px;
        padding: 2px;
        gap: 1px;
        border: 1px solid ${D.border}50;
        background: ${D.bg}30;
      }

      .lg-mode-btn {
        padding: 3px 11px;
        border-radius: 999px;
        border: none;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        transition: all 0.15s;
        background: transparent;
        color: ${D.textMuted};
      }

      .lg-mode-btn.active {
        background: ${D.blue};
        color: #fff;
        box-shadow: 0 1px 4px ${D.blue}40;
      }

      /* ── Divider ────────────────────────────────────────────────────── */

      .lg-divider {
        width: 1px;
        height: 16px;
        background: ${D.border}80;
        margin: 0 4px;
        border-radius: 1px;
      }

      /* ── Nav items (mobile bottom bar) ─────────────────────────────── */

      .nav-item {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 18px; cursor: pointer; font-size: 13px; font-weight: 500;
        border: none; background: none; text-align: left; color: ${D.textMuted};
        border-radius: 10px; margin: 2px 8px; width: calc(100% - 16px);
        transition: all 0.15s ease; white-space: nowrap; overflow: hidden;
      }
      .nav-item:hover { background: ${D.blue}12; color: ${D.text}; }
      .nav-item.active-back { background: ${D.blue}20; color: ${D.blue}; box-shadow: inset 0 0 0 1px ${D.blue}30; }
      .nav-item.active-fwd  { background: ${D.green}18; color: ${D.green}; box-shadow: inset 0 0 0 1px ${D.green}30; }
      .nav-item.active-settings { background: ${D.blue}12; color: ${D.text}; box-shadow: inset 0 0 0 1px ${D.border}; }

      .nav-label { transition: opacity 0.1s ease; }
      .nav-label.hidden { opacity: 0; pointer-events: none; width: 0; }

      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${D.border}; border-radius: 4px; }
    `}</style>
  );
}