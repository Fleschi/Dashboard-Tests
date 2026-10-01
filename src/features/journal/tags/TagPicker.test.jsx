import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import TagPicker from "./TagPicker";
import { __resetTagLibrary } from "./tagLibrary";
import { collectTagIds, withLegacyTags } from "./tagDoc";

jest.mock("../../../services/supabase/tags", () => ({
  loadTagLibrary: jest.fn(),
  insertTagGroup: jest.fn(), updateTagGroup: jest.fn(), deleteTagGroup: jest.fn(),
  insertTag: jest.fn(), updateTag: jest.fn(), deleteTag: jest.fn(),
}));
const api = require("../../../services/supabase/tags");

const LIBRARY = {
  groups: [{ id: "g1", name: "Trade", color: "#6366f1" }, { id: "g2", name: "Context", color: "#22c55e" }],
  tags: [
    { id: "t1", groupId: "g1", name: "15m Cont", color: "#ef4444" },
    { id: "t2", groupId: "g2", name: "News", color: null },
  ],
};
const D = { bg: "#000", card: "#111", border: "#333", text: "#fff", textMuted: "#888", blue: "#6366f1", red: "#f00" };

beforeEach(() => { api.loadTagLibrary.mockResolvedValue(LIBRARY); __resetTagLibrary(); });

test("shows the group structure with all tags; clicking a tag inserts it", async () => {
  const onPick = jest.fn();
  render(<TagPicker D={D} onPick={onPick} onClose={() => {}} />);
  fireEvent.click(await screen.findByText("#15m Cont"));
  expect(screen.getByRole("button", { name: /^Trade/ })).toBeTruthy();   // group header
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: "t1", name: "15m Cont", color: "#ef4444" }));
});

test("a tag without its own colour falls back to its group's colour", async () => {
  const onPick = jest.fn();
  render(<TagPicker D={D} onPick={onPick} onClose={() => {}} />);
  fireEvent.click(await screen.findByText("#News"));
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: "t2", color: "#22c55e" }));
});

test("typing a new name + Enter creates the tag with the chosen colour and inserts it", async () => {
  api.insertTag.mockResolvedValue({ id: "t9", parent_id: "g1", name: "Sweep", color: "#22c55e" });
  const onPick = jest.fn();
  render(<TagPicker D={D} onPick={onPick} onClose={() => {}} />);
  await screen.findByText("#15m Cont");
  fireEvent.click(screen.getByRole("button", { name: "Colour #22c55e" }));
  const input = screen.getByLabelText("Tag name");
  fireEvent.change(input, { target: { value: "Sweep" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(onPick).toHaveBeenCalled());
  expect(api.insertTag).toHaveBeenCalledWith({ groupId: "g1", name: "Sweep", color: "#22c55e" });
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: "t9", name: "Sweep", color: "#22c55e" }));
});

test("Enter on an existing name inserts that tag instead of creating a duplicate", async () => {
  const onPick = jest.fn();
  render(<TagPicker D={D} onPick={onPick} onClose={() => {}} />);
  await screen.findByText("#15m Cont");
  const input = screen.getByLabelText("Tag name");
  fireEvent.change(input, { target: { value: "15m cont" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(api.insertTag).not.toHaveBeenCalled();
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
});

test("collectTagIds reads inline tags anywhere; withLegacyTags adds only missing ids under the title", () => {
  const doc = { type: "doc", content: [
    { type: "title" },
    { type: "paragraph", content: [{ type: "text", text: "a " }, { type: "tag", attrs: { tagId: "t1" } }] },
  ] };
  expect(collectTagIds(doc)).toEqual(["t1"]);
  const merged = withLegacyTags(doc, ["t1", "t2"]);
  expect(collectTagIds(merged)).toEqual(["t2", "t1"]);
  expect(merged.content[0].type).toBe("title");
  expect(withLegacyTags(doc, ["t1"])).toBe(doc);
});
