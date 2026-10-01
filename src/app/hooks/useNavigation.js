import { useState } from "react";

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
