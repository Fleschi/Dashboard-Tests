import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import {
  loadOverviewState, saveOverviewState, makeWidget, makeGroup,
  BUILT_IN_PRESETS, findBuiltInPreset, GRID_COLUMNS, CELL_COLS, CELLS_WIDE, CELL_PX, findFreeSpot,
} from "./overview/overviewModel";
import { WIDGET_DEFS, getWidgetHeight } from "./overview/widgetRegistry";
import { getWidgetCells } from "./overview/widgetCells";
import WidgetShell from "./overview/WidgetShell";
import AddWidgetPanel from "./overview/AddWidgetPanel";
import TimeRangePicker from "./overview/TimeRangePicker";
import { filterTradesByRange } from "./overview/timeRange";
import { calcStats } from "../utils/calculations";

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

export default function Overview({ stats, design, isMobile, topBarSlot, onGoToDataDate, timeRange, onTimeRangeChange }) {
  const D = design;
  const [state, setState] = useState(() => {
    const loaded = loadOverviewState();
    return { ...loaded, groups: ensurePositions(loaded.groups) };
  });
  const [editMode, setEditMode] = useState(false);
  const [dragInfo, setDragInfo] = useState(null);
  const [addPanelFor, setAddPanelFor] = useState(null);

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

  // ─── Drag & drop (free positioning) ────────────────────────────────────────
  // Dropping a widget only ever changes *that* widget's own (x, y) — nothing
  // else in the group is touched, reflowed, or repacked to "support" it. This
  // is what lets two small widgets sit stacked next to a bigger one: they're
  // just independently-placed cells, not slots in an auto-flowing row.

  const handleDragStart = (groupId, widgetId) => (e) => {
    setDragInfo({ groupId, widgetId });
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  const moveDraggedTo = (targetGroupId, x, y) => {
    setState(s => {
      if (!dragInfo) return s;
      let dragged = null;
      const groupsWithoutDragged = s.groups.map(g => {
        if (g.id !== dragInfo.groupId) return g;
        const found = g.widgets.find(w => w.id === dragInfo.widgetId);
        if (found) dragged = found;
        return { ...g, widgets: g.widgets.filter(w => w.id !== dragInfo.widgetId) };
      });
      if (!dragged) return s;
      const { w } = getWidgetCells(dragged.type, dragged.size);
      const clampedX = Math.max(0, Math.min(x, CELLS_WIDE - w));
      const clampedY = Math.max(0, y);
      const moved = { ...dragged, x: clampedX, y: clampedY };
      const finalGroups = groupsWithoutDragged.map(g =>
        g.id === targetGroupId ? { ...g, widgets: [...g.widgets, moved] } : g
      );
      return { ...s, groups: finalGroups, presetId: "custom" };
    });
    setDragInfo(null);
  };

  // Converts the drop's pixel position within the group's canvas into a cell
  // coordinate, snapping to the nearest cell.
  const handleDrop = (groupId) => (e) => {
    e.preventDefault();
    if (!dragInfo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const colWidthPx = rect.width / GRID_COLUMNS;
    const rawCol = Math.round((e.clientX - rect.left) / colWidthPx);
    const cellX = Math.round(rawCol / CELL_COLS);
    const cellY = Math.floor((e.clientY - rect.top) / (CELL_PX + 12)); // 12 = grid gap
    moveDraggedTo(groupId, cellX, Math.max(0, cellY));
  };

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
              onDragOver={handleDragOver} onDrop={handleDrop(group.id)}
              style={{ border: `1px dashed ${D.border}`, borderRadius: D.radius ?? 4, padding: 24, textAlign: "center", color: D.textMuted, fontSize: 13 }}
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
                  widget={widget} stats={filteredStats} trades={filteredTrades} D={D}
                  editMode={editMode}
                  onRemove={() => removeWidget(group.id, widget.id)}
                  onGoToDataDate={onGoToDataDate}
                  height={getWidgetHeight(widget.type, widget.size)}
                />
              ))}
            </div>
          ) : (
            <div
              onDragOver={handleDragOver} onDrop={handleDrop(group.id)}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
                gridAutoRows: `${CELL_PX}px`,
                gap: 12,
                // A bit of empty room past the last row, so there's always
                // somewhere to drop a widget to start a new row.
                paddingBottom: editMode ? CELL_PX * 0.75 : 0,
              }}
            >
              {group.widgets.map(widget => {
                const { w, h } = getWidgetCells(widget.type, widget.size);
                return (
                  <div
                    key={widget.id}
                    style={{
                      gridColumn: `${widget.x * CELL_COLS + 1} / span ${Math.min(w * CELL_COLS, GRID_COLUMNS)}`,
                      gridRow: `${widget.y + 1} / span ${h}`,
                    }}
                  >
                    <WidgetShell
                      widget={widget} stats={filteredStats} trades={filteredTrades} D={D}
                      editMode={editMode}
                      onRemove={() => removeWidget(group.id, widget.id)}
                      dragProps={{ onDragStart: handleDragStart(group.id, widget.id), onDragEnd: () => setDragInfo(null) }}
                      onGoToDataDate={onGoToDataDate}
                    />
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
    </div>
  );
}

const ghostBtn    = (D) => ({ padding: "8px 16px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, fontSize: 13, fontWeight: 600, cursor: "pointer" });
const dangerBtn   = (D) => ({ padding: "8px 16px", background: "transparent", border: `1px solid ${D.red}40`, borderRadius: 8, color: D.red, fontSize: 13, fontWeight: 600, cursor: "pointer" });

// Same footprint/shape as TimeRangePicker's calendar icon button, so the two
// sit together as one clean icon group.
const iconToggleBtn = (D, active) => ({
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 40, height: 40, padding: 0,
  background: active ? `${D.blue}18` : "transparent",
  border: `1px solid ${active ? D.blue : D.border}`, borderRadius: 8,
  cursor: "pointer",
});