import { useEffect, useMemo, useState } from "react";
import { loadTrades } from "../../services/supabase/trades";
import { calcStats } from "../../shared/utils/tradeStats";

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
