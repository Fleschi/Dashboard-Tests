import { fmt } from "../../shared/utils/format";
import { getFirstImageSrc, getPreviewText, getTitleText } from "./editor/content";
import { fmtEntryDate, outcomeMeta } from "./entryUtils";

// Multi-image insertion (Daily Bias / My Trade / Trade of the Day and beyond,
// up to 100 images per entry, dropped anywhere in the document) lands in a
// later step — this fixed single-slot attach button belonged to the old
// 3-picture form and has been retired along with it. ImageLightbox above is
// kept: it'll go back to viewing full-size any image inserted into the new
// editor.

// Clicking a row opens the SAME entry editor used to create a new entry
// (see the "Form" block in the main component below), pre-filled with this
// entry's data — there is no separate read-only view.

export function JournalList({ entries, D, onOpen }) {
  if (!entries.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      {entries.map(e => {
        const meta = outcomeMeta(e.pnl, D);
        const hasPnl = e.pnl != null;
        // Prefer the first image found in the free-form document; fall back
        // to the old fixed "My Trade" screenshot for entries made before
        // this editor existed (and not yet migrated — see step 8), so
        // older cards don't suddenly go blank.
        const previewImage = getFirstImageSrc(e.content) || e.screenshot_my_trade_url || null;
        const previewText  = previewImage ? null : (getPreviewText(e.content, 140) || null);
        const title = getTitleText(e.content);
        return (
          <button
            key={e.id}
            onClick={() => onOpen(e)}
            style={{
              display: "flex", flexDirection: "column", padding: 0, width: "100%",
              background: D.card, border: `1px solid ${D.border}`, borderRadius: D.radius ?? 4,
              overflow: "hidden", cursor: "pointer", textAlign: "left", font: "inherit",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={ev => { ev.currentTarget.style.borderColor = D.textMuted; }}
            onMouseLeave={ev => { ev.currentTarget.style.borderColor = D.border; }}
          >
            {/* Compact metadata header — everything on one line instead of stacked rows */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              padding: "10px 14px", background: D.bg, borderBottom: `1px solid ${D.border}`,
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: D.textMuted, fontWeight: 500, whiteSpace: "nowrap" }}>
                {fmtEntryDate(e.day, e.time_entered)}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ ...pillStyle(D, meta.color), fontSize: 10, padding: "3px 8px" }}>{meta.label}</span>
                <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: hasPnl ? meta.color : D.textMuted }}>
                  {hasPnl ? fmt(e.pnl) : "—"}
                </span>
              </div>
            </div>

            {/* Title — the entry's title line from the editor */}
            <div style={{
              padding: "10px 14px", fontSize: 15, fontWeight: 700, lineHeight: 1.3,
              color: title ? D.text : D.textMuted, borderBottom: `1px solid ${D.border}`,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", boxSizing: "border-box",
            }}>
              {title || "Untitled"}
            </div>

            {/* Preview — the entry's first image if it has one, otherwise a
                text snippet, otherwise a plain placeholder. Fixed aspect
                ratio so the image never dictates card size. */}
            {previewImage ? (
              <div style={{ width: "100%", aspectRatio: "2273 / 1291", background: D.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={previewImage}
                  alt="Entry preview"
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              </div>
            ) : previewText ? (
              <div style={{ width: "100%", aspectRatio: "2273 / 1291", padding: "14px 16px", overflow: "hidden", color: D.textMuted, fontSize: 12.5, lineHeight: 1.5 }}>
                {previewText}
              </div>
            ) : (
              <div style={{ width: "100%", aspectRatio: "2273 / 1291", display: "flex", alignItems: "center", justifyContent: "center", color: D.textMuted, fontSize: 11 }}>
                No content yet
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

const pillStyle = (D, color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", background: `${color}15`, color, border: `1px solid ${color}30` });
