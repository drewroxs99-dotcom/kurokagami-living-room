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

const TABLES = [
  { x0: 390, y0: 648, x1: 710, y1: 804 },
  { x0: 940, y0: 636, x1: 1224, y1: 802 },
];

function insideTable(x: number, y: number) {
  return TABLES.some((table) => x > table.x0 && x < table.x1 && y > table.y0 && y < table.y1);
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

  it("keeps people and pets out of both tables while they move around the room", () => {
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

  it("routes people around the tea tables instead of walking across or getting stuck", () => {
    const crossings = [
      { id: "ofuku", startX: 300, endX: 1300 },
      { id: "kichi", startX: 1300, endX: 300 },
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
