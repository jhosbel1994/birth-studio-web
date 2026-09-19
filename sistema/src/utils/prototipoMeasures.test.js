import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDimension, formatDimension, fitAvailableSpace } from "./prototipoMeasures.js";

test("units preserve decimal dimensions", () => {
  for (const value of [0.125, 1.62, 3, 20]) {
    for (const unit of ["cm", "m"]) assert.equal(parseDimension(formatDimension(value, unit), unit), value);
  }
  assert.equal(parseDimension("12,5"), 0.125);
  assert.equal(parseDimension("12.5"), 0.125);
});
test("invalid input is rejected, never silently clamped or made positive", () => {
  for (const raw of ["", "0", "-50", "abc", "50abc", "1.2.3", "2001", "9", "Infinity"]) {
    assert.equal(parseDimension(raw), null, raw);
  }
});
test("fit preserves available-space ratio within both facade limits", () => {
  assert.deepEqual(fitAvailableSpace(3, 1, 6, 3), { width: 3, height: 1 });
  assert.deepEqual(fitAvailableSpace(3, 1, 6, 1), { width: 1.5, height: 0.5 });
  assert.equal(fitAvailableSpace(3, 1, 0.1, 0.1), null);
});
