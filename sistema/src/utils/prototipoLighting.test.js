import { test } from "node:test";
import assert from "node:assert/strict";
import { lightingLevel, haloRadius } from "./prototipoLighting.js";

test("LED curve preserves subtle minimum and triples previous maximum", () => {
  assert.equal(lightingLevel(1).gain, 0.06);
  assert.equal(lightingLevel(10).internal, 30);
  assert.equal(lightingLevel(10).gain, 3 * 5.96);
  for (let n = 2; n <= 10; n++) {
    assert.ok(lightingLevel(n).gain > lightingLevel(n - 1).gain);
  }
});
test("invalid and out-of-range levels stay finite and bounded", () => {
  assert.deepEqual(lightingLevel(-1), lightingLevel(1));
  assert.deepEqual(lightingLevel(50), lightingLevel(10));
  assert.deepEqual(lightingLevel(NaN), lightingLevel(6));
  assert.deepEqual(lightingLevel(Infinity), lightingLevel(6));
});
test("halo blur padding remains bounded for small and large logos", () => {
  assert.equal(haloRadius(10000, 1200, 600), 100);
  assert.equal(haloRadius(10000, 4000, 2000), 256);
  assert.equal(haloRadius(0.2, 1200, 600), 2);
});
