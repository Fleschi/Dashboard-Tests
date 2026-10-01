import { useEffect, useState } from "react";
import { DEFAULT_TIME_RANGE } from "../../shared/utils/timeRange";

// The date-range filter is shared between Overview and Data — selecting a
// range in either tab should affect both, and survive a page refresh.
const TIME_RANGE_STORAGE_KEY = "trading_dashboard_time_range_v1";

function loadSharedTimeRange() {
  try {
    const raw = localStorage.getItem(TIME_RANGE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_TIME_RANGE;
  } catch { return DEFAULT_TIME_RANGE; }
}

export function useTimeRanges({ tab, globalTab, setTab }) {
  // Shared date-range filter, used by both Overview and Data — this is the
  // user's *persistent* selection (e.g. "2023") and is never touched by
  // clicking a Calendar-widget day; only the range picker itself writes here.
  const [timeRange, setTimeRange] = useState(loadSharedTimeRange);
  useEffect(() => {
    try { localStorage.setItem(TIME_RANGE_STORAGE_KEY, JSON.stringify(timeRange)); } catch {}
  }, [timeRange]);

  // Set when a calendar-widget day is clicked; consumed by the Data tab to
  // highlight/scroll to that day's trade(s), then cleared.
  const [jumpDate, setJumpDate] = useState(null);

  // Temporary "show everything" override for the Data tab, set by clicking a
  // Calendar-widget day. Deliberately separate from `timeRange` above: while
  // this is set, Data ignores whatever range is selected (so the clicked
  // day's trade is guaranteed to be visible/highlighted no matter how narrow
  // the persistent range is) without disturbing that persistent range
  // underneath — it's cleared (restoring the persistent range) as soon as
  // the Data tab isn't the active view anymore.
  const [dataAllTimeOverride, setDataAllTimeOverride] = useState(false);
  useEffect(() => {
    const onDataTab = tab === "data" && globalTab !== "settings";
    if (dataAllTimeOverride && !onDataTab) setDataAllTimeOverride(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, globalTab]);

  // Clicking a day on the Overview calendar widget jumps to the Data tab,
  // scrolls/highlights the matching trade(s) there, and temporarily switches
  // Data to "All time" so that trade is guaranteed to show up regardless of
  // whatever range was selected — the persistent `timeRange` stays exactly as
  // the user left it underneath.
  const goToDataDate = (date) => { setJumpDate(date); setDataAllTimeOverride(true); setTab("data"); };

  // The range Data actually filters/displays by: "All time" while the
  // override above is active, otherwise the persistent range like every
  // other tab.
  const dataTimeRange = dataAllTimeOverride ? DEFAULT_TIME_RANGE : timeRange;

  // Any manual interaction with Data's own range picker is treated as the
  // user intentionally taking over — it cancels the temporary override (if
  // any) and adopts the picked range as the new persistent one.
  const setDataTimeRange = (newRange) => { setDataAllTimeOverride(false); setTimeRange(newRange); };

  return {
    timeRange, setTimeRange,
    dataTimeRange, setDataTimeRange,
    jumpDate, clearJumpDate: () => setJumpDate(null),
    goToDataDate,
  };
}
