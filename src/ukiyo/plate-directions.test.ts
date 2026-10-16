import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PLATE_FACING, plateDrawSign } from "./plate-directions.ts";

const EXPECTED: Record<string, Record<"stand" | "walk" | "sit", 1 | -1>> = {
  komachi: { stand: -1, walk: -1, sit: -1 },
  hanae: { stand: 1, walk: 1, sit: 1 },
  ofuku: { stand: -1, walk: -1, sit: -1 },
  arai: { stand: -1, walk: -1, sit: -1 },
  ume: { stand: -1, walk: 1, sit: 1 },
  kichi: { stand: -1, walk: -1, sit: -1 },
  otsu: { stand: -1, walk: -1, sit: -1 },
  jiro: { stand: 1, walk: 1, sit: 1 },
  saku: { stand: -1, walk: -1, sit: -1 },
  hei: { stand: 1, walk: 1, sit: 1 },
};

describe("character plate directions", () => {
  it("matches the native direction of every stand, walk, and sit plate", () => {
    assert.deepEqual(PLATE_FACING, EXPECTED);
  });

  it("flips a plate only when its native direction differs from the target", () => {
    for (const [id, poses] of Object.entries(EXPECTED)) {
      for (const [pose, native] of Object.entries(poses) as [keyof typeof poses, 1 | -1][]) {
        assert.equal(plateDrawSign(id, pose, native), 1, `${id} ${pose} should stay unflipped`);
        assert.equal(plateDrawSign(id, pose, native === 1 ? -1 : 1), -1, `${id} ${pose} should flip`);
      }
    }
  });
});
