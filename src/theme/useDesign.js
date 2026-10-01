import { useState } from "react";
import { loadDesign } from "./designStorage";

// loadDesign() always returns a complete design (falling back to defaults on
// missing/corrupt storage), so it can be used directly as the initial state.
export function useDesign() {
  return useState(loadDesign);
}
