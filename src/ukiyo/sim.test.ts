import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultSettings } from "./palette.ts";
import { createWorld, stepWorld } from "./sim.ts";

function advance(world: ReturnType<typeof createWorld>, seconds: number) {
  const settings = defaultSettings();
  const steps = Math.ceil(seconds * 60);
  for (let i = 0; i < steps; i++) {
    stepWorld(world, 1 / 60, settings, { setWearing: () => undefined });
  }
}

describe("household interactions", () => {
  it("picks up the cup at the table it approached", () => {
    const world = createWorld(defaultSettings());

    advance(world, 2);

    const ofuku = world.chars.find((character) => character.id === "ofuku");
    assert.equal(ofuku?.hold, "cup");
    assert.equal(world.cups.find((cup) => cup.id === "l1")?.holder, "ofuku");
    assert.equal(world.cups.find((cup) => cup.id === "r1")?.holder, "arai");
  });

  it("does not take a cup that another guest is holding or continue to drink", () => {
    const world = createWorld(defaultSettings());
    const ofuku = world.chars.find((character) => character.id === "ofuku");
    const cup = world.cups.find((candidate) => candidate.id === "l1");
    assert.ok(ofuku);
    assert.ok(cup);
    ofuku.x = 292;
    ofuku.y = 828;
    ofuku.queue = [{ kind: "takeCup", cupId: cup.id }, { kind: "drink" }];
    cup.holder = "arai";

    advance(world, 1 / 60);

    assert.equal(ofuku.hold, "none");
    assert.equal(cup.holder, "arai");
    assert.equal(ofuku.tox, 0);
    assert.match(world.log[0]?.text ?? "", /could not reach a free cup/);
  });

  it("returns the pipe to its tray when smoking is turned off", () => {
    const settings = defaultSettings();
    settings.env.smoke = false;
    const world = createWorld(settings);
    const hei = world.chars.find((character) => character.id === "hei");
    assert.ok(hei);
    hei.x = 1342;
    hei.y = 816;
    hei.hold = "pipe";
    hei.queue = [{ kind: "smoke" }];
    world.pipeHolder = hei.id;

    for (let i = 0; i < 30; i++) {
      stepWorld(world, 1 / 60, settings, { setWearing: () => undefined });
    }

    assert.equal(hei.hold, "none");
    assert.equal(world.pipeHolder, null);
  });

  it("keeps people out of the tea tables while they move around the room", () => {
    const world = createWorld(defaultSettings());
    advance(world, 30);

    for (const character of world.chars) {
      assert.ok(character.x >= 160 && character.x <= 1500, `${character.id} left the room`);
      assert.ok(character.y >= 640 && character.y <= 858, `${character.id} left the mats`);
      const insideLeftTable =
        character.x > 390 && character.x < 710 && character.y > 648 && character.y < 804;
      const insideRightTable =
        character.x > 940 && character.x < 1224 && character.y > 636 && character.y < 802;
      assert.equal(insideLeftTable || insideRightTable, false, `${character.id} crossed a tea table`);
    }
  });
});
