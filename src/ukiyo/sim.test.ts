import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultSettings } from "./palette.ts";
import { createWorld, stepWorld } from "./sim.ts";

function advance(
  world: ReturnType<typeof createWorld>,
  seconds: number,
  settings = defaultSettings(),
  observe?: (world: ReturnType<typeof createWorld>) => void,
) {
  const steps = Math.ceil(seconds * 60);
  for (let i = 0; i < steps; i++) {
    stepWorld(world, 1 / 60, settings, { setWearing: () => undefined });
    observe?.(world);
  }
}

function insideTable(x: number, y: number) {
  return x > 608 && x < 990 && y > 640 && y < 780;
}

describe("household interactions", () => {
  it("picks up the cup at the table it approached", () => {
    const world = createWorld(defaultSettings());

    advance(world, 7);

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

  it("keeps people and pets out of the table while they move around the room", () => {
    const world = createWorld(defaultSettings());
    advance(world, 30, defaultSettings(), (frame) => {
      for (const character of frame.chars) {
        assert.equal(insideTable(character.x, character.y), false, `${character.id} crossed the table`);
      }
      for (const pet of frame.pets) {
        assert.equal(insideTable(pet.x, pet.y), false, `${pet.id} crossed the table`);
      }
    });

    for (const character of world.chars) {
      assert.ok(character.x >= 160 && character.x <= 1500, `${character.id} left the room`);
      assert.ok(character.y >= 640 && character.y <= 858, `${character.id} left the mats`);
      assert.equal(insideTable(character.x, character.y), false, `${character.id} crossed a tea table`);
    }
    for (const pet of world.pets) {
      assert.equal(insideTable(pet.x, pet.y), false, `${pet.id} crossed the table`);
    }
  });

  it("routes people around the tea table instead of walking across or getting stuck", () => {
    const crossings = [
      { id: "ofuku", startX: 500, endX: 1120 },
      { id: "kichi", startX: 1120, endX: 500 },
    ];

    for (const crossing of crossings) {
      const settings = defaultSettings();
      for (const character of settings.chars) character.present = character.id === crossing.id;
      const world = createWorld(settings);
      const character = world.chars.find((candidate) => candidate.id === crossing.id);
      assert.ok(character);
      character.x = crossing.startX;
      character.y = 700;
      character.sit = 0;
      character.seat = null;
      character.reserved = null;
      character.pose = "walk";
      character.queue = [
        { kind: "goto", x: crossing.endX, y: 700 },
        { kind: "wait", seconds: 30 },
      ];

      advance(world, 12, settings, (frame) => {
        for (const person of frame.chars) {
          if (settings.chars.find((candidate) => candidate.id === person.id)?.present) {
            assert.equal(insideTable(person.x, person.y), false, `${person.id} walked across a tea table`);
          }
        }
      });

      assert.ok(
        Math.abs(character.x - crossing.endX) < 7,
        `${character.id} did not get around the table`,
      );
      assert.ok(Math.abs(character.y - 700) < 7, `${character.id} did not reach the destination`);
    }
  });
});
