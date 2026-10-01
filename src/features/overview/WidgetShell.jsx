import { WIDGET_DEFS } from "./widgetRegistry";

// The Calendar widget is the one exception to "every widget shows the
// selected range": it has its own month-by-month navigation and doubles as
// the entry point for inspecting any individual day's trades in Data, so
// gating it by the global range would hide (and make unclickable) real
// trade days that just happen to fall outside whatever range is selected —
// exactly the problem the Data-tab temporary day-view was built to avoid.
// It gets the full, unfiltered trade list for that. It still *opens* to the
// latest trade within the selected range rather than the latest trade of
// all time though, so it also gets the range-filtered list separately, just
// to pick its default month (see CalendarView's `rangeTrades` prop).
const ALWAYS_UNFILTERED = new Set(["calendar"]);

export default function WidgetShell({ widget, stats, trades, rawTrades, D, editMode, onRemove, onGrabPointerDown, onGoToDataDate, height }) {
  const def = WIDGET_DEFS[widget.type];
  if (!def) return null;
  const Render = def.Render;
  const isAlwaysUnfiltered = ALWAYS_UNFILTERED.has(widget.type);
  const widgetTrades = isAlwaysUnfiltered && rawTrades ? rawTrades : trades;
  const rangeTrades   = isAlwaysUnfiltered ? trades : undefined;

  return (
    <div
      // The entire card is the grab handle — there's no separate header
      // strip anymore, just this outer element. pointerdown anywhere on it
      // (other than the remove button below, which stops its own
      // propagation) picks the widget up. With the content wrapper below
      // going pointer-events:none in edit mode, a pointerdown over the body
      // "passes through" it (browsers skip hit-testing on pointer-events:
      // none elements entirely) straight to here, so grabbing anywhere on
      // the card works identically. pointerdown (not native HTML5 drag-and-
      // drop) is what lets the dragged widget render at full size while
      // held, rather than the browser's own faded drag-ghost image.
      onPointerDown={editMode ? onGrabPointerDown : undefined}
      style={{
        position: "relative",
        background: D.card, border: `1px solid ${D.border}`, borderRadius: D.radius ?? 4,
        overflow: "hidden", height: height ?? "100%", width: "100%",
        cursor: editMode && onGrabPointerDown ? "grab" : "default",
        // touchAction:"none" stops touch gestures (scroll, pinch) from
        // hijacking a drag on touch devices — it has no effect on how text
        // renders. A `userSelect: "none"` used to sit here too, but some
        // browsers render text through a visibly different antialiasing
        // pass under user-select:none, which is what read as the widget's
        // font "changing" the moment it was grabbed — so it's removed
        // entirely rather than just toned down.
        touchAction: editMode ? "none" : "auto",
      }}
    >
      <div
        style={{
          height: "100%",
          // Edit mode disables interaction with the widget's own content —
          // buttons, clickable calendar days, and so on — without touching
          // how any of it renders: every widget keeps showing its real,
          // live values while being customized, it just doesn't *react* to
          // anything (clicks, hovers) until you're done rearranging. This
          // also doubles as what lets a pointerdown anywhere over the body
          // reach the drag handle above instead of being intercepted by
          // whatever widget-specific control happens to sit under the cursor.
          pointerEvents: editMode ? "none" : "auto",
        }}
      >
        <Render stats={stats} trades={widgetTrades} rangeTrades={rangeTrades} D={D} size={widget.size} onGoToDataDate={onGoToDataDate} />
      </div>

      {/* Only the remove control remains as edit-mode chrome — no header
          bar, no grab-handle indicator, since the whole card is now
          grabbable and doesn't need one pointed out. */}
      {editMode && (
        <button
          onClick={onRemove}
          onPointerDown={e => e.stopPropagation()}
          title="Remove widget"
          style={{
            position: "absolute", top: 8, right: 8, zIndex: 2,
            width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
            background: `${D.bg}cc`, border: `1px solid ${D.border}`, borderRadius: 6,
            color: D.textMuted, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0,
          }}
        >×</button>
      )}
    </div>
  );
}