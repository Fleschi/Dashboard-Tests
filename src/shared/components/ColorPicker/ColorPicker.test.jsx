import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ColorPicker, { normalizeHex, hexToHsv, hsvToHex } from "./ColorPicker";

const D = { bg: "#000", card: "#111", border: "#333", text: "#fff", textMuted: "#888", blue: "#6366f1" };
const SWATCHES = [["emerald", "Emerald", "#2dd888"], ["crimson", "Crimson", "#ff5470"]];

test("hex helpers: normalise and round-trip through HSV", () => {
  expect(normalizeHex("#FFF")).toBe("#ffffff");
  expect(normalizeHex("22C55E")).toBe("#22c55e");
  expect(normalizeHex("#12")).toBeNull();
  for (const h of ["#000000", "#ffffff", "#22c55e", "#ff5470", "#6366f1", "#c99a2e", "#0ea5e9", "#7f7f7f"]) {
    expect(hsvToHex(hexToHsv(h))).toBe(h);
  }
});

test("palette swatch: fires onChange + onChangeEnd with the swatch id, then closes", () => {
  const onChange = jest.fn(), onChangeEnd = jest.fn();
  render(<ColorPicker D={D} value="#6366f1" swatches={SWATCHES} onChange={onChange} onChangeEnd={onChangeEnd} />);
  fireEvent.click(screen.getByRole("button", { name: /#6366F1/i }));
  fireEvent.click(screen.getByRole("button", { name: "Custom" }));          // custom colour -> opens on Custom
  fireEvent.click(screen.getByRole("button", { name: "Palette" }));
  fireEvent.click(screen.getByRole("button", { name: "Colour Crimson" }));
  expect(onChange).toHaveBeenCalledWith("#ff5470", expect.objectContaining({ source: "palette", id: "crimson" }));
  expect(onChangeEnd).toHaveBeenCalledWith("#ff5470", expect.objectContaining({ id: "crimson" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("hex field: live change on a full hex, commit on Enter, invalid text restored on blur", () => {
  const onChange = jest.fn(), onChangeEnd = jest.fn();
  render(<ColorPicker D={D} value="#6366f1" onChange={onChange} onChangeEnd={onChangeEnd} />);
  fireEvent.click(screen.getByRole("button", { name: /#6366F1/i }));
  const input = screen.getByLabelText("Hex code");
  fireEvent.change(input, { target: { value: "#3fae6c" } });
  expect(onChange).toHaveBeenLastCalledWith("#3fae6c", { source: "custom" });
  expect(onChangeEnd).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onChangeEnd).toHaveBeenCalledWith("#3fae6c", { source: "custom" });
  fireEvent.change(input, { target: { value: "#zz" } });
  fireEvent.blur(input);
  expect(input.value).toBe("#3fae6c");
});

test("keyboard on the colour square changes the colour; Escape closes without bubbling", () => {
  const onChange = jest.fn();
  const parentKey = jest.fn();
  const onParentKey = (e) => { if (e.key === "Escape") parentKey(); };   // e.g. a parent popup's Escape-to-close
  document.addEventListener("keydown", onParentKey);
  render(<ColorPicker D={D} value="#808080" onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: /#808080/i }));
  fireEvent.keyDown(screen.getByLabelText("Saturation and brightness"), { key: "ArrowRight" });
  expect(onChange).toHaveBeenCalled();
  expect(onChange.mock.calls[0][0]).not.toBe("#808080");
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(parentKey).not.toHaveBeenCalled();
  document.removeEventListener("keydown", onParentKey);
});

test("reset button calls onReset and closes; follows the new value", () => {
  function Host() {
    const [c, setC] = useState("#ff5470");
    return <ColorPicker D={D} value={c} onChange={setC} onReset={() => setC("#2dd888")} />;
  }
  render(<Host />);
  fireEvent.click(screen.getByRole("button", { name: /#FF5470/i }));
  fireEvent.click(screen.getByRole("button", { name: "Default" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: /#2DD888/i })).toBeTruthy();
});

test("dot variant and controlled open state", () => {
  const onOpenChange = jest.fn();
  const { rerender } = render(<ColorPicker D={D} variant="dot" title="Pick" value="#ef4444" open={false} onOpenChange={onOpenChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Pick" }));
  expect(onOpenChange).toHaveBeenCalledWith(true);
  expect(screen.queryByRole("dialog")).toBeNull();
  rerender(<ColorPicker D={D} variant="dot" title="Pick" value="#ef4444" open onOpenChange={onOpenChange} />);
  expect(screen.getByRole("dialog")).toBeTruthy();
});
