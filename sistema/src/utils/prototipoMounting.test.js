import { test } from "node:test";
import assert from "node:assert/strict";
import { compatibleSurfaces, reconcileMounting, MOUNTING_ENVIRONMENTS } from "./prototipoMounting.js";

test("desk is only available indoors; glass and totem keep frontal mounting", () => {
  assert.deepEqual(compatibleSurfaces("interior"), ["wall", "side", "desk"]);
  assert.deepEqual(compatibleSurfaces("fachada"), ["wall", "side"]);
  for (const environment of ["foto", "vitrina", "totem"]) assert.deepEqual(compatibleSurfaces(environment), ["wall"]);
  assert.deepEqual(compatibleSurfaces(null), []);
});
test("compatible placements preserve identity, dimensions, position and orientation", () => {
  const item = { id: "a", surface: "side", w: 1.2, x: 0.5, orientation: "left90" };
  assert.equal(reconcileMounting([item], "fachada")[0], item);
  assert.equal(reconcileMounting([item], "interior")[0], item);
});
test("incompatible surfaces clear selection without deleting or resizing the logo", () => {
  const item = { id: "a", surface: "desk", w: 1.2, dataUrl: "logo", x: 0.5 };
  const [next] = reconcileMounting([item], "fachada");
  assert.deepEqual(next, { ...item, surface: null });
  assert.equal(item.surface, "desk");
  assert.equal(reconcileMounting([next], "interior")[0], next);
});
test("environment presets contain no sign dimensions and use existing scenes", () => {
  for (const environment of MOUNTING_ENVIRONMENTS) {
    assert.deepEqual(Object.keys(environment).sort(), ["id", "label", "scene"]);
    assert.ok(["fachada", "interior", "totem", "foto"].includes(environment.scene));
  }
});
