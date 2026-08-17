import { useState, useEffect, useMemo } from "react";
import { calcStats } from "./utils/calculations";
import { loadTrades } from "./utils/supabase";
import { loadDesign } from "./modules/Settings";
import { DEFAULT_DESIGN, MOBILE_BREAKPOINT } from "./constants.jsx";

// ─── useTradeData ─────────────────────────────────────────────────────────────

export function useTradeData() {
  const [trades,  setTrades]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    loadTrades("backtesting")
      .then(t => { setTrades(t); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const stats = useMemo(
    () => trades.length > 0 ? calcStats(trades) : null,
    [trades]
  );

  return { trades, setTrades, stats, loading, error };
}

// ─── useIsMobile ──────────────────────────────────────────────────────────────

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isMobile;
}

// ─── useDesign ────────────────────────────────────────────────────────────────

export function useDesign() {
  return useState(() => loadDesign() || DEFAULT_DESIGN);
}

// ─── useNavigation ────────────────────────────────────────────────────────────

export function useNavigation() {
  const [tab,       setTabState]  = useState("overview");
  const [globalTab, setGlobalTab] = useState(null);

  const setTab = (id) => {
    if (id === "settings") { setGlobalTab("settings"); return; }
    setGlobalTab(null);
    setTabState(id);
  };

  return { tab, setTab, globalTab };
}