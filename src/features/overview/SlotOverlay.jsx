import { CELLS_WIDE, CELL_COLS, CELL_PX, GRID_COLUMNS, rectsOverlap } from "./overviewModel";
import { getWidgetCells } from "./widgetCells";

// Returns the total number of grid rows to render for a group: exactly the
// rows its widgets actually occupy, plus exactly one spare row — never a
// fixed extra chunk of space — so there's always somewhere to drag a widget
// one row further down. While dragging within this group, the currently-
// hovered target folds into the same count, so that one spare row follows
// the drag down as it goes deeper instead of stopping at a fixed buffer.
// Shared by the actual grid container and SlotOverlay so the two always
// agree on exactly how many rows are showing.
export function computeGroupRows(group, dragMeta, dragVisual) {
  const draggedId = dragMeta?.widgetId;
  const maxWidgetY = group.widgets.reduce((m, w) => {
    if (w.id === draggedId) return m; // picked up — its old slot no longer counts
    const { h } = getWidgetCells(w.type, w.size);
    return Math.max(m, w.y + h);
  }, 0);
  const hover = dragMeta && dragVisual?.hover?.groupId === group.id ? dragVisual.hover : null;
  const maxHoverY = hover ? hover.y + dragMeta.h : 0;
  return Math.max(maxWidgetY, maxHoverY) + 1;
}

// Renders every slot in a group's grid as an outline while a drag is in
// progress: free slots get a faint dashed border, slots another widget
// already occupies are filled in, and whichever slot(s) the dragged widget
// is currently over are highlighted green (would land there — a normal move
// or, if it exactly coincides with another widget's own footprint, a swap)
// or red (that slot's taken/out of bounds) — this is the "see the available
// slots" layer, purely visual (pointer-events: none) and only mounted while
// dragMeta is set, so it disappears the instant the drag ends.
export function SlotOverlay({ D, group, dragMeta, dragVisual }) {
  const rects = group.widgets
    .filter(w => w.id !== dragMeta.widgetId)
    .map(w => ({ x: w.x, y: w.y, ...getWidgetCells(w.type, w.size) }));

  const hover = dragVisual?.hover?.groupId === group.id ? dragVisual.hover : null;
  const hoverRect = hover ? { x: hover.x, y: hover.y, w: dragMeta.w, h: dragMeta.h } : null;

  const rows = computeGroupRows(group, dragMeta, dragVisual);

  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < CELLS_WIDE; x++) {
      const occupied = rects.some(r => rectsOverlap({ x, y, w: 1, h: 1 }, r));
      const inHover  = hoverRect && rectsOverlap({ x, y, w: 1, h: 1 }, hoverRect);
      let border = D.border, borderStyle = "dashed", background = "transparent";
      if (occupied) { borderStyle = "solid"; background = `${D.text}0a`; }
      if (inHover) {
        borderStyle = "solid";
        border = hover.valid ? D.green : D.red;
        background = hover.valid ? `${D.green}22` : `${D.red}22`;
      }
      cells.push(
        <div
          key={`${x}_${y}`}
          style={{
            gridColumn: `${x * CELL_COLS + 1} / span ${CELL_COLS}`,
            gridRow: `${y + 1} / span 1`,
            border: `1.5px ${borderStyle} ${border}`,
            background, borderRadius: 6,
            transition: "background 0.06s, border-color 0.06s",
          }}
        />
      );
    }
  }

  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
        gridAutoRows: `${CELL_PX}px`,
        gap: 12,
      }}
    >
      {cells}
    </div>
  );
}
