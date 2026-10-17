import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultSettings } from "./palette.ts";
import {
  BOUNDS,
  CUSHIONS,
  createWorld,
  isWalkablePosition,
  LOOKS,
  PIPE_TRAY,
  SEATS,
  stepWorld,
  TABLE_BOUNDS,
  TEA_TABLES,
} from "./sim.ts";

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
  return TABLE_BOUNDS.some(
    (table) => x > table.x0 && x < table.x1 && y > table.y0 && y < table.y1,
  );
}

describe("household interactions", () => {
  it("keeps every fixed destination on the walkable floor and cushions aligned to seats", () => {
    const destinations = [
      ...SEATS,
      ...TEA_TABLES.map((table) => table.approach),
      ...LOOKS,
      PIPE_TRAY,
    ];
    for (const point of destinations) {
      assert.ok(
        point.x >= BOUNDS.x0 &&
          point.x <= BOUNDS.x1 &&
          point.y >= BOUNDS.y0 &&
          point.y <= BOUNDS.y1,
        `destination (${point.x}, ${point.y}) is outside the floor`,
      );
      assert.equal(
        isWalkablePosition(point.x, point.y),
        true,
        `destination (${point.x}, ${point.y}) is blocked`,
      );
    }
    const seatCushionPairs = [
      ["left", "frontLeft", 22],
      ["right", "frontRight", 22],
      ["alcove", "sideLeft", 20],
      ["front", "sideRight", 18],
    ] as const;
    for (const [seatId, cushionId, footOffset] of seatCushionPairs) {
      const seat = SEATS.find((candidate) => candidate.id === seatId);
      const cushion = CUSHIONS.find((candidate) => candidate.id === cushionId);
      assert.ok(seat);
      assert.ok(cushion);
      assert.equal(seat.x, cushion.x);
      assert.equal(seat.y - cushion.y, footOffset);
    }
    assert.equal(CUSHIONS.find((cushion) => cushion.id === "sideRight")?.x, 1278);
    for (const table of TEA_TABLES) {
      for (const cup of table.cups) {
        assert.equal(insideTable(cup.x, cup.y), true, `${cup.id} is not on its tabletop`);
      }
      assert.equal(insideTable(table.pot.x, table.pot.y), true, `${table.id} teapot is not on its table`);
      assert.equal(
        insideTable(table.sweet.x, table.sweet.y),
        true,
        `${table.id} sweets are not on their table`,
      );
    }
  });

  it("spreads central room activities around the center seat", () => {
    const destinations = [SEATS[2], LOOKS[1], LOOKS[2], LOOKS[5]];
    for (let i = 0; i < destinations.length; i++) {
      for (let j = i + 1; j < destinations.length; j++) {
        const a = destinations[i];
        const b = destinations[j];
        assert.ok(a);
        assert.ok(b);
        assert.ok(
          Math.hypot(a.x - b.x, (a.y - b.y) * 1.4) >= 90,
          `${a.id} and ${b.id} destinations are too close`,
        );
      }
    }
  });

  it("picks up the cup at the table it approached", () => {
    const world = createWorld(defaultSettings());

    advance(world, 7);

    const ofuku = world.chars.find((character) => character.id === "ofuku");
    assert.equal(ofuku?.hold, "cup");
    assert.equal(world.cups.find((cup) => cup.id === "l1")?.holder, "ofuku");
    assert.equal(world.cups.find((cup) => cup.id === "r1")?.holder, "arai");
  });

  it("keeps Hanae facing forward while her first route is mostly vertical", () => {
    const world = createWorld(defaultSettings());
    const hanae = world.chars.find((character) => character.id === "hanae");
    assert.ok(hanae);

    advance(world, 0.5);

    assert.equal(hanae.facing, 1);
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

  it("redirects an interaction destination placed inside a table to its nearest clear edge", () => {
    const settings = defaultSettings();
    for (const character of settings.chars) character.present = character.id === "ofuku";
    const world = createWorld(settings);
    const ofuku = world.chars.find((character) => character.id === "ofuku");
    assert.ok(ofuku);
    ofuku.x = 300;
    ofuku.y = 828;
    ofuku.sit = 0;
    ofuku.seat = null;
    ofuku.reserved = null;
    ofuku.queue = [
      { kind: "goto", x: 550, y: 700 },
      { kind: "wait", seconds: 30 },
    ];

    advance(world, 8, settings, () => {
      assert.equal(isWalkablePosition(ofuku.x, ofuku.y), true);
    });

    assert.ok(Math.abs(ofuku.x - 550) < 7);
    assert.ok(Math.abs(ofuku.y - 641) < 7);
  });

  it("keeps moving people from passing through someone who is seated", () => {
    const settings = defaultSettings();
    for (const character of settings.chars) {
      character.present = character.id === "komachi" || character.id === "hanae";
    }
    const world = createWorld(settings);
    const seated = world.chars.find((character) => character.id === "komachi");
    const walker = world.chars.find((character) => character.id === "hanae");
    assert.ok(seated);
    assert.ok(walker);
    seated.queue = [{ kind: "wait", seconds: 30 }];
    walker.x = 250;
    walker.y = seated.y;
    walker.sit = 0;
    walker.pose = "walk";
    walker.queue = [
      { kind: "goto", x: 780, y: seated.y },
      { kind: "wait", seconds: 30 },
    ];
    let minimumSeparation = Infinity;
    let facingChanges = 0;
    let previousFacing = walker.facing;

    advance(world, 12, settings, () => {
      minimumSeparation = Math.min(
        minimumSeparation,
        Math.hypot(walker.x - seated.x, (walker.y - seated.y) * 1.4),
      );
      if (walker.facing !== previousFacing) facingChanges++;
      previousFacing = walker.facing;
    });

    assert.ok(
      minimumSeparation >= 72,
      `the walker overlapped the seated person (${minimumSeparation.toFixed(1)}px clearance)`,
    );
    assert.ok(facingChanges <= 2, `the walker flipped direction ${facingChanges} times`);
    assert.ok(Math.abs(walker.x - 780) < 7, "the walker got stuck instead of reaching the destination");
  });
});
