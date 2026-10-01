import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TimeRangePicker from "../../shared/components/TimeRangePicker";
import { filterTradesByRange } from "../../shared/utils/timeRange";
import { calcStats } from "../../shared/utils/tradeStats";
import AddWidgetPanel from "./AddWidgetPanel";
import { SlotOverlay, computeGroupRows } from "./SlotOverlay";
import WidgetShell from "./WidgetShell";
import { dangerBtn, ghostBtn, iconToggleBtn } from "./buttonStyles";
import { BUILT_IN_PRESETS, CELLS_WIDE, CELL_COLS, CELL_PX, GRID_COLUMNS, findBuiltInPreset, findFreeSpot, isRegionFree, loadOverviewState, makeGroup, makeWidget, rectsOverlap, saveOverviewState } from "./overviewModel";
import { getWidgetCells } from "./widgetCells";
import { WIDGET_DEFS, getWidgetHeight } from "./widgetRegistry";

// Older saved layouts (or custom presets saved before free positioning
// existed) may have widgets with no x/y at all. Fill those in with the first
// free spot in their group, scanning left-to-right/top-to-bottom — this never
// touches a widget that already has a real position.
function ensurePositions(groups) {
  return groups.map(g => {
    const placed = [];
    const widgets = g.widgets.map(w => {
      const { w: cw, h: ch } = getWidgetCells(w.type, w.size);
      if (typeof w.x === "number" && typeof w.y === "number") {
        placed.push({ x: w.x, y: w.y, w: cw, h: ch });
        return w;
      }
      const spot = findFreeSpot(placed, cw, ch);
      placed.push({ x: spot.x, y: spot.y, w: cw, h: ch });
      return { ...w, x: spot.x, y: spot.y };
    });
    return { ...g, widgets };
  });
}

// Mirrors the calendar icon's conventions (24x24 viewBox, 1.8 stroke, round caps/joins)
// so the two controls read as one visual group.
function PaintbrushIcon({ color, size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 3.5c1.2-1.2 3-1.2 4.2 0l.8.8c1.2 1.2 1.2 3 0 4.2L11 18l-5-5L15.5 3.5Z" />
      <path d="M9.5 15.5 4 21" />
      <path d="M3 21c1.5-1.2 2.5-2.7 2.7-4.2" />
    </svg>
  );
}

export default function OverviewPage({ stats, design, isMobile, topBarSlot, onGoToDataDate, timeRange, onTimeRangeChange }) {
  const D = design;
  const [state, setState] = useState(() => {
    const loaded = loadOverviewState();
    return { ...loaded, groups: ensurePositions(loaded.groups) };
  });
  const [editMode, setEditMode] = useState(false);
  const [addPanelFor, setAddPanelFor] = useState(null);

  // ─── Drag & drop (free positioning) ────────────────────────────────────────
  // Custom pointer-based drag-and-drop (not native HTML5 DnD) so the dragged
  // widget can be rendered full-size/full-opacity in a fixed-position overlay
  // that follows the cursor, and so hit-testing can use plain pixel math
  // against each slot's true boundaries instead of the browser's own (fuzzy,
  // center-weighted) drag-and-drop events.
  //
  // `dragMeta` is set once at pointerdown and only cleared at drop — static
  // for the lifetime of one drag, so the pointermove/up effect below only
  // needs to (re)subscribe twice per drag, not on every mouse movement.
  // `dragVisual` updates on every pointermove (cursor position + whichever
  // slot is currently hovered) and drives the floating ghost + slot outlines.
  const [dragMeta, setDragMeta] = useState(null);
  const [dragVisual, setDragVisual] = useState(null);
  const gridRefs = useRef({});
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Dims the page's own cursor/selection while a drag is in progress, for
  // that "picked up" — rather than merely hovering — feel.
  useEffect(() => {
    if (!dragMeta) return;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    return () => { document.body.style.cursor = ""; document.body.style.userSelect = ""; };
  }, [dragMeta]);

  const startDrag = (groupId, widget) => (e) => {
    if (e.button !== 0) return; // primary mouse button / touch only
    e.preventDefault();
    const wrapperEl = e.currentTarget.closest("[data-cellwrap]");
    if (!wrapperEl) return;
    const rect = wrapperEl.getBoundingClientRect();
    const { w, h } = getWidgetCells(widget.type, widget.size);
    setDragMeta({
      groupId, widgetId: widget.id, type: widget.type, size: widget.size, w, h,
      // Offset from the widget's own top-left corner to the point it was
      // grabbed at — keeps the floating copy tracking naturally under the
      // cursor instead of snapping its corner there.
      grabDX: e.clientX - rect.left, grabDY: e.clientY - rect.top,
      widthPx: rect.width, heightPx: rect.height,
    });
    setDragVisual({ pointerX: e.clientX, pointerY: e.clientY, hover: null });
  };

  // Where the widget's own center currently sits on screen — this, not the
  // raw cursor position, is what should determine the target slot. The
  // floating drag-preview already keeps the widget's rendered position
  // stable relative to wherever it was grabbed (via grabDX/grabDY below);
  // hit-testing off that same rendered box's center — rather than the
  // cursor itself — keeps the *target slot* just as stable. Otherwise,
  // grabbing a widget off-center (say, near its top-right corner) would hit-
  // test as if the cursor were the widget's top-left corner, making the
  // highlighted slot drift away from the widget's actual visual position —
  // the cursor effectively becoming the widget's pivot instead of the
  // widget's own footprint being what's being moved. For a rectangle being
  // dragged in whole-cell steps, the cell containing its center is also the
  // cell it overlaps most, so this doubles as "greatest overlap" targeting.
  const widgetCenter = (meta, clientX, clientY) => ({
    x: clientX - meta.grabDX + meta.widthPx / 2,
    y: clientY - meta.grabDY + meta.heightPx / 2,
  });

  // Which slot (cell) within the widget's *own* group the widget's current
  // center is over, whether the dragged widget could actually land there,
  // and — if that slot is occupied by exactly one other widget whose own
  // footprint exactly matches it — which widget it would swap places with.
  // Deliberately only ever tests meta.groupId's own grid element — never any
  // other group's — so a widget can never be dropped into (or even register
  // as hovering over) a different group; the only way to change a widget's
  // group is editing the layout some other way, not drag. Uses the widget
  // center's raw position within the slot (not center-of-slot-weighted) so
  // that *any* point inside the group's true pixel boundaries — edges
  // included — resolves to the right cell, rather than only a band near
  // each cell's center.
  const hitTestSlot = (meta, centerX, centerY) => {
    const el = gridRefs.current[meta.groupId];
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (centerX < rect.left || centerX > rect.right || centerY < rect.top) return null;
    const cellWidthPx  = (rect.width / GRID_COLUMNS) * CELL_COLS;
    const rowHeightPx  = CELL_PX + 12; // 12 = grid gap
    const rawX = Math.floor((centerX - rect.left) / cellWidthPx);
    const rawY = Math.floor(Math.max(0, centerY - rect.top) / rowHeightPx);
    const x = Math.max(0, Math.min(rawX, CELLS_WIDE - meta.w));
    const y = Math.max(0, rawY);
    const targetGroup = stateRef.current.groups.find(g => g.id === meta.groupId);
    const others = targetGroup ? targetGroup.widgets.filter(w => w.id !== meta.widgetId) : [];
    const rects  = others.map(w => ({ x: w.x, y: w.y, ...getWidgetCells(w.type, w.size) }));
    const free   = isRegionFree(rects, x, y, meta.w, meta.h);

    // Not free doesn't automatically mean invalid: if the target region is
    // occupied by exactly one other widget, and that widget's own footprint
    // exactly matches the region the dragged widget would land in (same
    // corner, same size), the two can simply trade places — a "clean" swap,
    // as opposed to a partial overlap with one or more widgets of mismatched
    // size/position, which stays invalid since there'd be no unambiguous way
    // to resolve it.
    let swapWidgetId = null;
    if (!free) {
      const target = { x, y, w: meta.w, h: meta.h };
      const overlapping = others.filter((w, i) => rectsOverlap(target, rects[i]));
      if (overlapping.length === 1) {
        const [ow] = overlapping;
        const owCells = getWidgetCells(ow.type, ow.size);
        if (ow.x === x && ow.y === y && owCells.w === meta.w && owCells.h === meta.h) {
          swapWidgetId = ow.id;
        }
      }
    }

    return { groupId: meta.groupId, x, y, valid: free || swapWidgetId !== null, swapWidgetId };
  };

  useEffect(() => {
    if (!dragMeta) return;

    const onMove = (e) => {
      const c = widgetCenter(dragMeta, e.clientX, e.clientY);
      setDragVisual({ pointerX: e.clientX, pointerY: e.clientY, hover: hitTestSlot(dragMeta, c.x, c.y) });
    };
    const onUp = (e) => {
      const c = widgetCenter(dragMeta, e.clientX, e.clientY);
      const hover = hitTestSlot(dragMeta, c.x, c.y);
      // Only a slot every one of the widget's cells is free (or a clean
      // one-for-one swap target) may accept the drop — anywhere else, the
      // widget simply stays put (its old slot was never touched, so there's
      // nothing to undo).
      if (hover?.valid) {
        if (hover.swapWidgetId) swapWidgets(dragMeta, hover.groupId, hover.swapWidgetId);
        else commitMove(dragMeta, hover.groupId, hover.x, hover.y);
      }
      setDragMeta(null);
      setDragVisual(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragMeta]);

  // The only mutation a normal (non-swap) drop performs: remove the widget
  // from its current group (freeing its old slot) and re-add it at the new,
  // already-validated (x, y) — never touching any other widget's position.
  // Because `hover.valid` was computed against every *other* widget's rect
  // just before this is called, the new slot can't already be occupied, so
  // the layout can never end up with two widgets sharing one slot.
  const commitMove = (meta, targetGroupId, x, y) => {
    setState(s => {
      let dragged = null;
      const groupsWithoutDragged = s.groups.map(g => {
        if (g.id !== meta.groupId) return g;
        const found = g.widgets.find(w => w.id === meta.widgetId);
        if (found) dragged = found;
        return { ...g, widgets: g.widgets.filter(w => w.id !== meta.widgetId) };
      });
      if (!dragged) return s;
      const moved = { ...dragged, x, y };
      const finalGroups = groupsWithoutDragged.map(g =>
        g.id === targetGroupId ? { ...g, widgets: [...g.widgets, moved] } : g
      );
      return { ...s, groups: finalGroups, presetId: "custom" };
    });
  };

  // Trades the dragged widget and the hovered-over widget's (x, y) — both
  // stay in the same group, both keep their own size, only their positions
  // change. Always same-group by construction, since hitTestSlot only ever
  // considers widgets within meta.groupId.
  const swapWidgets = (meta, groupId, otherWidgetId) => {
    setState(s => ({
      ...s,
      groups: s.groups.map(g => {
        if (g.id !== groupId) return g;
        const dragged = g.widgets.find(w => w.id === meta.widgetId);
        const other   = g.widgets.find(w => w.id === otherWidgetId);
        if (!dragged || !other) return g;
        return {
          ...g,
          widgets: g.widgets.map(w => {
            if (w.id === dragged.id) return { ...w, x: other.x, y: other.y };
            if (w.id === other.id)   return { ...w, x: dragged.x, y: dragged.y };
            return w;
          }),
        };
      }),
      presetId: "custom",
    }));
  };

  useEffect(() => { saveOverviewState(state); }, [state]);

  const rawTrades = useMemo(() => stats?.rawTrades || [], [stats]);

  // All Overview calculations/widgets are driven off this filtered set —
  // filtering never touches the underlying trade data, it only narrows what
  // calcStats sees for the currently-selected time range. `timeRange` is the
  // shared, App-level range (also used by the Data tab), so both tabs always
  // agree on what's currently selected.
  const filteredTrades = useMemo(() => filterTradesByRange(rawTrades, timeRange), [rawTrades, timeRange]);
  const filteredStats  = useMemo(() => (filteredTrades.length ? calcStats(filteredTrades) : null), [filteredTrades]);

  if (!stats) {
    return (
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: D.radius ?? 4, padding: 48, textAlign: "center", color: D.textMuted }}>
        No trades yet. Add trades in the Data tab.
      </div>
    );
  }

  // ─── Mutators ────────────────────────────────────────────────────────────

  const applyPreset = (presetId) => {
    const builtIn = findBuiltInPreset(presetId);
    if (builtIn) { setState(s => ({ ...s, groups: ensurePositions(builtIn.groups), presetId })); return; }
    const custom = state.customPresets.find(p => p.id === presetId);
    if (custom) setState(s => ({ ...s, groups: ensurePositions(custom.groups), presetId }));
  };

  const saveCurrentAsPreset = () => {
    const name = window.prompt("Name this preset:");
    if (!name) return;
    const preset = { id: `custom_${Date.now()}`, name, groups: state.groups };
    setState(s => ({ ...s, customPresets: [...s.customPresets, preset], presetId: preset.id }));
  };

  const addGroup = () => setState(s => ({
    ...s, groups: [...s.groups, makeGroup(`Group ${s.groups.length}`)], presetId: "custom",
  }));

  const removeGroup = (groupId) => setState(s => (
    s.groups.length <= 1 ? s : { ...s, groups: s.groups.filter(g => g.id !== groupId), presetId: "custom" }
  ));

  const renameGroup = (groupId, name) => setState(s => ({
    ...s, groups: s.groups.map(g => (g.id === groupId ? { ...g, name } : g)), presetId: "custom",
  }));

  // New widgets are placed at the first free cell in their group (so they
  // don't land on top of something else) — this is the only "automatic"
  // placement left, and it only ever positions the brand-new widget, never
  // moves anything that's already there.
  const addWidget = (groupId, type) => {
    const def = WIDGET_DEFS[type];
    setState(s => ({
      ...s,
      groups: s.groups.map(g => {
        if (g.id !== groupId) return g;
        const rects = g.widgets.map(w => ({ x: w.x, y: w.y, ...getWidgetCells(w.type, w.size) }));
        const { w: cw, h: ch } = getWidgetCells(type, def.defaultSize);
        const spot = findFreeSpot(rects, cw, ch);
        return { ...g, widgets: [...g.widgets, makeWidget(type, def.defaultSize, spot.x, spot.y)] };
      }),
      presetId: "custom",
    }));
    setAddPanelFor(null);
  };

  const removeWidget = (groupId, widgetId) => setState(s => ({
    ...s,
    groups: s.groups.map(g => (g.id === groupId ? { ...g, widgets: g.widgets.filter(w => w.id !== widgetId) } : g)),
    presetId: "custom",
  }));

  const allPresetOptions = [...BUILT_IN_PRESETS.map(b => b()), ...state.customPresets];

  const topBarControls = (
    <>
      <TimeRangePicker range={timeRange} onChange={onTimeRangeChange} trades={rawTrades} D={D} align="right" />
      <button onClick={() => setEditMode(e => !e)} title={editMode ? "Done customizing" : "Customize"} style={iconToggleBtn(D, editMode)}>
        <PaintbrushIcon color={D.text} />
      </button>
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {topBarSlot
        ? createPortal(topBarControls, topBarSlot)
        : <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>{topBarControls}</div>
      }

      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {editMode && (
            <>
              <button onClick={saveCurrentAsPreset} style={ghostBtn(D)}>Save Preset</button>
              <button onClick={addGroup} style={ghostBtn(D)}>+ Add Group</button>
            </>
          )}
        </div>
      </div>

      {/* Groups */}
      {state.groups.map(group => (
        <div key={group.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {editMode ? (
              <input
                value={group.name}
                onChange={e => renameGroup(group.id, e.target.value)}
                style={{ background: "transparent", border: "none", borderBottom: `1px dashed ${D.border}`, color: D.text, fontSize: 15, fontWeight: 700, padding: "2px 0", outline: "none", maxWidth: 240 }}
              />
            ) : (
              <div style={{ fontSize: 15, fontWeight: 700, color: D.text }}>{group.name}</div>
            )}
            {editMode && (
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => setAddPanelFor(group.id)} style={ghostBtn(D)}>+ Add Widget</button>
                {state.groups.length > 1 && <button onClick={() => removeGroup(group.id)} style={dangerBtn(D)}>Remove Group</button>}
              </div>
            )}
          </div>

          {group.widgets.length === 0 ? (
            <div
              ref={el => { gridRefs.current[group.id] = el; }}
              style={{
                position: "relative", minHeight: CELL_PX,
                border: `1px dashed ${dragMeta && dragVisual?.hover?.groupId === group.id ? (dragVisual.hover.valid ? D.green : D.red) : D.border}`,
                borderRadius: D.radius ?? 4, padding: 24, textAlign: "center", color: D.textMuted, fontSize: 13,
                transition: "border-color 0.1s",
              }}
            >
              Empty group{editMode ? " — click “+ Add Widget” above" : ""}
            </div>
          ) : isMobile ? (
            // Free positioning is a desktop drag-and-drop feature; on mobile
            // everything is one column anyway, so just read widgets back in
            // their natural top-to-bottom, left-to-right cell order.
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...group.widgets].sort((a, b) => a.y - b.y || a.x - b.x).map(widget => (
                <WidgetShell
                  key={widget.id}
                  widget={widget} stats={filteredStats} trades={filteredTrades} rawTrades={rawTrades} D={D}
                  editMode={editMode}
                  onRemove={() => removeWidget(group.id, widget.id)}
                  onGoToDataDate={onGoToDataDate}
                  height={getWidgetHeight(widget.type, widget.size)}
                />
              ))}
            </div>
          ) : (
            <div
              ref={el => { gridRefs.current[group.id] = el; }}
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
                // Exactly this group's own widgets' rows plus exactly one
                // spare row — not a fixed extra chunk of space — so there's
                // always somewhere to drag a widget one row further, but
                // never several rows of dead space. While dragging within
                // this group, the currently-hovered target folds into the
                // same count, so that one spare row follows you down as you
                // drag deeper instead of stopping at a fixed buffer; see
                // computeGroupRows (shared with SlotOverlay, so the actual
                // grid and its dashed-outline overlay always agree on how
                // many rows are showing).
                gridTemplateRows: editMode ? `repeat(${computeGroupRows(group, dragMeta, dragVisual)}, ${CELL_PX}px)` : undefined,
                gridAutoRows: editMode ? undefined : `${CELL_PX}px`,
                gap: 12,
                // A constant inset while editing (not tied to whether a drag
                // is actually in progress) so toggling a drag on/off never
                // shifts the grid's own content — only the border/background
                // below change on that, giving this group's grid a visible
                // "card" boundary distinct from any other group's, precisely
                // when every group is simultaneously showing its own dashed
                // slot overlay (see SlotOverlay) and could otherwise read as
                // one continuous grid running across the group boundary.
                padding: editMode ? 8 : 0,
                border: `1px dashed ${dragMeta ? D.border : "transparent"}`,
                background: dragMeta ? `${D.border}08` : "transparent",
                borderRadius: D.radius ?? 4,
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              {dragMeta && <SlotOverlay D={D} group={group} dragMeta={dragMeta} dragVisual={dragVisual} />}
              {group.widgets.map(widget => {
                const { w, h } = getWidgetCells(widget.type, widget.size);
                const isBeingDragged = dragMeta?.widgetId === widget.id;
                return (
                  <div
                    key={widget.id}
                    data-cellwrap
                    style={{
                      gridColumn: `${widget.x * CELL_COLS + 1} / span ${Math.min(w * CELL_COLS, GRID_COLUMNS)}`,
                      gridRow: `${widget.y + 1} / span ${h}`,
                      zIndex: 1,
                    }}
                  >
                    {isBeingDragged ? (
                      // The widget's own slot goes empty (rather than staying
                      // rendered) while a full-opacity copy of it follows the
                      // cursor in the floating overlay below — that's what
                      // makes the drag read as "picking it up" instead of
                      // duplicating it.
                      <div style={{ height: "100%", width: "100%", borderRadius: D.radius ?? 4, border: `2px dashed ${D.border}`, background: `${D.border}1a` }} />
                    ) : (
                      <WidgetShell
                        widget={widget} stats={filteredStats} trades={filteredTrades} rawTrades={rawTrades} D={D}
                        editMode={editMode}
                        onRemove={() => removeWidget(group.id, widget.id)}
                        onGrabPointerDown={editMode ? startDrag(group.id, widget) : undefined}
                        onGoToDataDate={onGoToDataDate}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <AddWidgetPanel
        open={!!addPanelFor}
        onClose={() => setAddPanelFor(null)}
        onSelectWidget={(type) => addWidget(addPanelFor, type)}
        presets={allPresetOptions}
        onApplyPreset={(presetId) => { applyPreset(presetId); setAddPanelFor(null); }}
        stats={filteredStats}
        trades={filteredTrades}
        D={D}
      />

      {/* Floating "in hand" copy of the widget being dragged — its normal
          on-screen dimensions (captured at grab time), following the cursor
          via fixed positioning, with a touch of transparency so whatever
          slot/widget is underneath stays visible while placing it. Rendered
          at the document root so it can float above every group/toolbar
          regardless of where the drag started. */}
      {dragMeta && dragVisual && createPortal(
        (() => {
          const draggedWidget = state.groups.flatMap(g => g.widgets).find(w => w.id === dragMeta.widgetId);
          if (!draggedWidget) return null;
          return (
            <div
              style={{
                position: "fixed",
                left: dragVisual.pointerX - dragMeta.grabDX,
                top: dragVisual.pointerY - dragMeta.grabDY,
                width: dragMeta.widthPx,
                height: dragMeta.heightPx,
                opacity: 0.85,
                pointerEvents: "none",
                zIndex: 10000,
                boxShadow: "0 20px 44px rgba(0,0,0,0.38)",
                borderRadius: D.radius ?? 4,
              }}
            >
              <WidgetShell
                widget={draggedWidget} stats={filteredStats} trades={filteredTrades} rawTrades={rawTrades} D={D}
                editMode height={dragMeta.heightPx}
                onRemove={() => {}} onGoToDataDate={onGoToDataDate}
              />
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
