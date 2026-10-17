import type {
  CharConfig,
  Pet,
  PlanName,
  PoseName,
  Seat,
  Settings,
  SimChar,
  Task,
  World,
} from "./types";

/** Feet land just in front of painted cushions, with distinct spots around both tables. */
export const SEATS: Seat[] = [
  { id: "left", x: 516, y: 814 },
  { id: "right", x: 1090, y: 814 },
  { id: "center", x: 800, y: 846 },
  { id: "alcove", x: 365, y: 748 },
  { id: "front", x: 1246, y: 746 },
  { id: "screen", x: 1468, y: 824 },
];

/** Match the four cushions painted in the hall artwork. */
export const CUSHIONS = [
  { id: "sideLeft", x: 365, y: 728, rx: 52, ry: 20 },
  { id: "frontLeft", x: 516, y: 792, rx: 78, ry: 24 },
  { id: "frontRight", x: 1090, y: 792, rx: 74, ry: 24 },
  { id: "sideRight", x: 1246, y: 726, rx: 36, ry: 16 },
];

/**
 * Prop contact points map to the two painted lacquer tables in hall.jpg.
 */
export const TEA_TABLES = [
  {
    id: "left" as const,
    pot: { x: 538, y: 708 },
    cups: [
      { id: "l1", x: 466, y: 714 },
      { id: "l2", x: 612, y: 712 },
    ],
    sweet: { x: 574, y: 716 },
    approach: { x: 292, y: 828, face: 1 as const },
    seat: "left",
  },
  {
    id: "right" as const,
    pot: { x: 1082, y: 700 },
    cups: [
      { id: "r1", x: 1000, y: 706 },
      { id: "r2", x: 1168, y: 704 },
    ],
    sweet: { x: 1132, y: 708 },
    approach: { x: 1364, y: 828, face: -1 as const },
    seat: "right",
  },
];

/** Tatami beside the screen, clear of both tables. */
export const PIPE_TRAY = { x: 1388, y: 816, face: -1 as const };

export const LOOKS: { id: string; x: number; y: number; face: 1 | -1; label: string }[] = [
  { id: "pine", x: 200, y: 824, face: -1, label: "the pine" },
  { id: "scroll", x: 920, y: 824, face: -1, label: "the scroll" },
  { id: "hearth", x: 760, y: 780, face: 1, label: "the brazier" },
  { id: "screen", x: 1436, y: 836, face: -1, label: "the screen" },
  { id: "lantern", x: 344, y: 668, face: 1, label: "the floor lantern" },
  { id: "flowers", x: 670, y: 820, face: 1, label: "the flowers" },
];

export const TABLE = { x: 800, y: 700 };
export const STAND = { x: 214, y: 736 };
export const TRAY = PIPE_TRAY;
export const WATCH = LOOKS[0];
export const SCROLL = LOOKS[1];
export const BRAZIER = { x: 828, y: 636 };
export const HEARTH = LOOKS[2];
export const BOUNDS = { x0: 160, y0: 640, x1: 1500, y1: 858 };

/** Painted tabletop and legs in hall.jpg; feet stay clear of both silhouettes. */
export const TABLE_BOUNDS = [
  { x0: 379, y0: 644, x1: 728, y1: 804 },
  { x0: 818, y0: 636, x1: 1234, y1: 802 },
];

const WALK_CLEARANCE = 2;
const ROUTE_CLEARANCE = WALK_CLEARANCE + 1;
const NAVIGATION_OBSTACLES = TABLE_BOUNDS.map((solid) => ({
  x0: solid.x0 - WALK_CLEARANCE,
  y0: solid.y0 - WALK_CLEARANCE,
  x1: solid.x1 + WALK_CLEARANCE,
  y1: solid.y1 + WALK_CLEARANCE,
}));
const ROUTE_CORNERS = NAVIGATION_OBSTACLES.flatMap((solid) => [
  { x: solid.x0 - ROUTE_CLEARANCE, y: solid.y0 - ROUTE_CLEARANCE },
  { x: solid.x1 + ROUTE_CLEARANCE, y: solid.y0 - ROUTE_CLEARANCE },
  { x: solid.x0 - ROUTE_CLEARANCE, y: solid.y1 + ROUTE_CLEARANCE },
  { x: solid.x1 + ROUTE_CLEARANCE, y: solid.y1 + ROUTE_CLEARANCE },
])
  .map((point) => ({
    x: Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, point.x)),
    y: Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, point.y)),
  }))
  .filter((point) => isWalkablePosition(point.x, point.y));

const LINES = [
  "The paper drinks the lamplight.",
  "The corridor is holding its breath.",
  "Sit. The mat is still warm.",
  "One cup, and the room grows larger.",
  "The pine has not moved all evening.",
  "I will not ask what you are thinking.",
  "Even the smoke is trying to be polite.",
  "Stay until the lantern decides.",
  "Vermilion suits the hour.",
  "That scroll has been patient.",
];

const SENTIMENTAL = [
  "I dreamed the scroll blinked.",
  "Leave the outer robe. The room is kind.",
  "The rain is practicing on the roof.",
];

const CROSS = ["Not another toast.", "The mat is crowded.", "I would rather watch the pine."];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeChar(
  id: string,
  x: number,
  y: number,
  facing: 1 | -1,
  extra: Partial<SimChar>,
): SimChar {
  return {
    id,
    x,
    y,
    facing,
    sit: 0,
    raise: 0,
    pose: "stand",
    walkPhase: 0,
    queue: [],
    taskTime: 0,
    stuck: 0,
    tox: 0,
    hold: "none",
    say: null,
    seat: null,
    reserved: null,
    last: "",
    cool: {},
    sipped: false,
    ...extra,
  };
}

export function createWorld(settings: Settings): World {
  const rng = mulberry32(settings.seed || 1);
  const left = TEA_TABLES[0];
  const komachi = makeChar("komachi", SEATS[0].x, SEATS[0].y, 1, {
    sit: 1,
    pose: "sit",
    seat: "left",
    reserved: "left",
    queue: [{ kind: "wait", seconds: 2.4 }],
  });
  const hanae = makeChar("hanae", 800, 646, 1, {
    hold: "fan",
    pose: "walk",
    walkPhase: 0.35,
    queue: [
      { kind: "goto", x: LOOKS[2].x, y: LOOKS[2].y },
      { kind: "face", dir: LOOKS[2].face },
      { kind: "pose", pose: "gesture", seconds: 2.8 },
    ],
  });
  const ofuku = makeChar("ofuku", 220, 800, 1, {
    pose: "walk",
    walkPhase: 0.1,
    reserved: "center",
    queue: [
      { kind: "goto", x: left.approach.x, y: left.approach.y },
      { kind: "face", dir: left.approach.face },
      { kind: "pose", pose: "reach", seconds: 0.7 },
      { kind: "takeCup", cupId: "l1" },
      { kind: "goto", x: SEATS[2].x, y: SEATS[2].y },
      { kind: "face", dir: -1 },
      { kind: "sit", seat: "center" },
      { kind: "drink" },
      { kind: "wait", seconds: 2.2 },
    ],
  });
  const arai = makeChar("arai", SEATS[1].x, SEATS[1].y, -1, {
    sit: 1,
    pose: "sit",
    seat: "right",
    reserved: "right",
    hold: "cup",
    tox: 0.18,
    queue: [
      { kind: "wait", seconds: 0.6 },
      { kind: "drink" },
      { kind: "wait", seconds: 1.8 },
    ],
  });
  const kichi = makeChar("kichi", 220, 660, 1, {
    pose: "walk",
    walkPhase: 0.55,
    queue: [
      { kind: "goto", x: LOOKS[4].x, y: LOOKS[4].y },
      { kind: "face", dir: LOOKS[4].face },
      { kind: "pose", pose: "reach", seconds: 1.6 },
      { kind: "wait", seconds: 1.8 },
    ],
  });
  const ume = makeChar("ume", 760, 848, 1, {
    pose: "walk",
    walkPhase: 0.2,
    queue: [
      { kind: "goto", x: LOOKS[1].x, y: LOOKS[1].y },
      { kind: "face", dir: LOOKS[1].face },
      { kind: "pose", pose: "gesture", seconds: 2.4 },
    ],
  });
  const otsu = makeChar("otsu", 400, 830, 1, {
    pose: "walk",
    queue: [
      { kind: "goto", x: SEATS[3].x, y: SEATS[3].y },
      { kind: "face", dir: 1 },
      { kind: "sit", seat: "alcove" },
      { kind: "wait", seconds: 3 },
    ],
  });
  const jiro = makeChar("jiro", 980, 848, -1, {
    pose: "walk",
    queue: [
      { kind: "goto", x: LOOKS[5].x, y: LOOKS[5].y },
      { kind: "face", dir: LOOKS[5].face },
      { kind: "pose", pose: "gesture", seconds: 2.2 },
    ],
  });
  const saku = makeChar("saku", 1500, 836, -1, {
    hold: "fan",
    pose: "walk",
    queue: [
      { kind: "goto", x: LOOKS[3].x, y: LOOKS[3].y },
      { kind: "face", dir: LOOKS[3].face },
      { kind: "pose", pose: "gesture", seconds: 2.6 },
    ],
  });
  const hei = makeChar("hei", 1180, 846, 1, {
    pose: "walk",
    reserved: "screen",
    queue: [
      { kind: "goto", x: PIPE_TRAY.x - 46, y: PIPE_TRAY.y },
      { kind: "face", dir: PIPE_TRAY.face },
      { kind: "pose", pose: "reach", seconds: 0.6 },
      { kind: "takePipe" },
      { kind: "goto", x: SEATS[5].x, y: SEATS[5].y },
      { kind: "face", dir: -1 },
      { kind: "sit", seat: "screen" },
      { kind: "smoke" },
    ],
  });
  return {
    time: 0,
    rng,
    chars: [komachi, hanae, ofuku, arai, ume, kichi, otsu, jiro, saku, hei],
    pets: [
      makePet("mikan", "cat", 700, 850, 1),
      makePet("shiro", "dog", 210, 846, -1),
    ],
    cups: TEA_TABLES.flatMap((table) =>
      table.cups.map((cup) => ({
        id: cup.id,
        x: cup.x,
        y: cup.y,
        holder: cup.id === "r1" ? "arai" : null,
      })),
    ),
    pipeHolder: null,
    log: [{ text: "The lantern was already lit.", time: 0 }],
    inject: [],
    motes: [],
    look: {},
  };
}

function makePet(id: string, kind: Pet["kind"], x: number, y: number, facing: 1 | -1): Pet {
  return {
    id,
    kind,
    x,
    y,
    facing,
    pose: "stand",
    phase: 0,
    wait: 1.2,
    tx: x,
    ty: y,
  };
}

function here(settings: Settings, id: string) {
  return settings.chars.find((c) => c.id === id)?.present ?? false;
}

function cfgOf(settings: Settings, id: string): CharConfig {
  const found = settings.chars.find((c) => c.id === id);
  if (!found) throw new Error(id);
  return found;
}

function nameOf(settings: Settings, id: string) {
  return cfgOf(settings, id).name;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, (a.y - b.y) * 1.15);
}

function pushLog(world: World, text: string) {
  world.log.unshift({ text, time: world.time });
  if (world.log.length > 16) world.log.pop();
}

function abortInteraction(world: World, ch: SimChar, settings: Settings, message: string) {
  ch.queue = [{ kind: "wait", seconds: 1 }];
  ch.taskTime = 0;
  ch.raise = 0;
  ch.pose = ch.sit > 0.5 ? "sit" : "stand";
  releaseReserve(ch);
  pushLog(world, `${nameOf(settings, ch.id)} ${message}`);
}

function finish(ch: SimChar) {
  ch.queue.shift();
  ch.taskTime = 0;
  ch.sipped = false;
}

function releaseReserve(ch: SimChar) {
  ch.reserved = ch.seat;
}

function seatTaken(world: World, id: string, self: string, settings: Settings) {
  return world.chars.some(
    (o) => o.id !== self && here(settings, o.id) && (o.seat === id || o.reserved === id),
  );
}

function freeSeat(world: World, settings: Settings, self: string, prefer?: string): Seat | null {
  const ids = SEATS.map((s) => s.id);
  const order = prefer ? [prefer, ...ids.filter((id) => id !== prefer)] : ids;
  for (const id of order) {
    if (!seatTaken(world, id, self, settings)) return SEATS.find((s) => s.id === id) ?? null;
  }
  return null;
}

function stepPets(world: World, settings: Settings, dt: number) {
  if (!settings.env.animals) return;
  const present = world.chars.filter((c) => here(settings, c.id));
  for (const pet of world.pets) {
    pet.phase += dt;
    if (pet.wait > 0) {
      pet.wait -= dt;
      pet.pose = pet.kind === "cat" && pet.wait > 0.4 ? "sit" : "stand";
      continue;
    }
    const dx = pet.tx - pet.x;
    const dy = pet.ty - pet.y;
    const d = Math.hypot(dx, dy);
    const speed = pet.kind === "cat" ? 46 : 70;
    if (d < 8) {
      pet.x = pet.tx;
      pet.y = pet.ty;
      pet.wait = 1.4 + world.rng() * (pet.kind === "cat" ? 4.5 : 2.2);
      const follow = present.length ? present[Math.floor(world.rng() * present.length)] : null;
      if (follow && world.rng() < (pet.kind === "dog" ? 0.75 : 0.4)) {
        pet.tx = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, follow.x + (world.rng() - 0.5) * 90));
        pet.ty = Math.min(BOUNDS.y1, Math.max(BOUNDS.y0 + 20, follow.y + 18 + world.rng() * 24));
      } else {
        pet.tx = BOUNDS.x0 + world.rng() * (BOUNDS.x1 - BOUNDS.x0);
        pet.ty = BOUNDS.y0 + 40 + world.rng() * (BOUNDS.y1 - BOUNDS.y0 - 40);
      }
      if (blocked(pet.tx, pet.ty)) {
        const open = openPoint(world);
        pet.tx = open.x;
        pet.ty = open.y;
      }
      continue;
    }
    pet.pose = "walk";
    pet.facing = dx >= 0 ? 1 : -1;
    const step = Math.min(d, speed * dt);
    stepAvoid(pet, pet.tx, pet.ty, step);
    pet.x = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, pet.x));
    pet.y = Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, pet.y));
  }
}

function nearestOther(world: World, settings: Settings, ch: SimChar) {
  let best: SimChar | null = null;
  let bestD = Infinity;
  for (const o of world.chars) {
    if (o.id === ch.id || !here(settings, o.id)) continue;
    const d = dist(ch, o);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

function clampWalk(ch: SimChar) {
  ch.x = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, ch.x));
  ch.y = Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, ch.y));
}

function blocked(x: number, y: number) {
  return NAVIGATION_OBSTACLES.some((s) => x > s.x0 && x < s.x1 && y > s.y0 && y < s.y1);
}

export function isWalkablePosition(x: number, y: number) {
  return (
    x >= BOUNDS.x0 &&
    x <= BOUNDS.x1 &&
    y >= BOUNDS.y0 &&
    y <= BOUNDS.y1 &&
    !blocked(x, y)
  );
}

function walkableTarget(x: number, y: number) {
  const target = {
    x: Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, x)),
    y: Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, y)),
  };
  if (isWalkablePosition(target.x, target.y)) return target;

  const candidates = NAVIGATION_OBSTACLES.flatMap((solid) => [
    { x: solid.x0 - 1, y: Math.min(solid.y1, Math.max(solid.y0, target.y)) },
    { x: solid.x1 + 1, y: Math.min(solid.y1, Math.max(solid.y0, target.y)) },
    { x: Math.min(solid.x1, Math.max(solid.x0, target.x)), y: solid.y0 - 1 },
    { x: Math.min(solid.x1, Math.max(solid.x0, target.x)), y: solid.y1 + 1 },
  ])
    .filter((point) => isWalkablePosition(point.x, point.y))
    .sort(
      (a, b) =>
        Math.hypot(a.x - target.x, a.y - target.y) -
        Math.hypot(b.x - target.x, b.y - target.y),
    );

  return candidates[0] ?? { x: BOUNDS.x0, y: BOUNDS.y0 };
}

function segmentBlocked(x0: number, y0: number, x1: number, y1: number) {
  return NAVIGATION_OBSTACLES.some((solid) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    let enter = 0;
    let leave = 1;

    for (const [p, q] of [
      [-dx, x0 - solid.x0],
      [dx, solid.x1 - x0],
      [-dy, y0 - solid.y0],
      [dy, solid.y1 - y0],
    ]) {
      if (p === 0) {
        if (q <= 0) return false;
        continue;
      }
      const t = q / p;
      if (p < 0) {
        if (t > leave) return false;
        enter = Math.max(enter, t);
      } else {
        if (t < enter) return false;
        leave = Math.min(leave, t);
      }
    }

    return enter < leave && leave > 0 && enter < 1;
  });
}

function nextWaypoint(start: { x: number; y: number }, end: { x: number; y: number }) {
  if (blocked(end.x, end.y)) return null;
  if (!segmentBlocked(start.x, start.y, end.x, end.y)) return end;

  const nodes = [start, ...ROUTE_CORNERS, end];
  const distances = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const visited = nodes.map(() => false);
  const endIndex = nodes.length - 1;
  distances[0] = 0;

  for (let count = 0; count < nodes.length; count++) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited[i] && (current === -1 || distances[i] < distances[current])) current = i;
    }
    if (current === -1 || !Number.isFinite(distances[current])) break;
    if (current === endIndex) break;
    visited[current] = true;

    for (let i = 1; i < nodes.length; i++) {
      if (
        visited[i] ||
        segmentBlocked(nodes[current].x, nodes[current].y, nodes[i].x, nodes[i].y)
      ) {
        continue;
      }
      const distance =
        distances[current] + Math.hypot(nodes[i].x - nodes[current].x, nodes[i].y - nodes[current].y);
      if (distance < distances[i]) {
        distances[i] = distance;
        previous[i] = current;
      }
    }
  }

  if (!Number.isFinite(distances[endIndex])) return null;
  let waypoint = endIndex;
  while (previous[waypoint] > 0) waypoint = previous[waypoint];
  return nodes[waypoint];
}

function stepAvoid(ch: { x: number; y: number }, tx: number, ty: number, step: number) {
  const waypoint = nextWaypoint(ch, { x: tx, y: ty });
  if (!waypoint) return;
  const dx = waypoint.x - ch.x;
  const dy = waypoint.y - ch.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.001) return;
  const distance = Math.min(d, step);
  const nx = ch.x + (dx / d) * distance;
  const ny = ch.y + (dy / d) * distance;
  if (!segmentBlocked(ch.x, ch.y, nx, ny)) {
    ch.x = nx;
    ch.y = ny;
  }
}

function openPoint(world: World) {
  for (let i = 0; i < 12; i++) {
    const x = BOUNDS.x0 + 30 + world.rng() * (BOUNDS.x1 - BOUNDS.x0 - 60);
    const y = BOUNDS.y0 + 16 + world.rng() * (BOUNDS.y1 - BOUNDS.y0 - 28);
    if (!blocked(x, y)) return { x, y };
  }
  return { x: 800, y: 840 };
}

function seatFace(seat: Seat): 1 | -1 {
  if (seat.id === "screen") return -1;
  if (seat.id === "alcove") return 1;
  if (seat.x < 700) return 1;
  if (seat.x > 1000) return -1;
  return -1;
}

function nearestFreeCup(world: World, ch: SimChar) {
  let best: (typeof world.cups)[number] | null = null;
  let bestD = Infinity;
  for (const cup of world.cups) {
    if (cup.holder) continue;
    const d = Math.hypot(cup.x - ch.x, cup.y - ch.y);
    if (d < bestD) {
      bestD = d;
      best = cup;
    }
  }
  return best;
}

function tableForCup(id: string) {
  return TEA_TABLES.find((table) => table.cups.some((cup) => cup.id === id)) ?? TEA_TABLES[0];
}

function pickLine(world: World, style: CharConfig["drinkStyle"], tox: number) {
  const pool = style === "cross" && tox > 0.35 ? CROSS : style === "sentimental" && tox > 0.2 ? SENTIMENTAL : LINES;
  return pool[Math.floor(world.rng() * pool.length)] ?? LINES[0];
}

function cooling(ch: SimChar, key: string, now: number) {
  return (ch.cool[key] ?? 0) > now;
}

function enqueue(ch: SimChar, tasks: Task[]) {
  ch.queue.push(...tasks);
}

function ensureStand(ch: SimChar, tasks: Task[]) {
  if (ch.sit > 0.35 || ch.seat) tasks.push({ kind: "stand" });
}

function faceToward(fromX: number, toX: number): 1 | -1 {
  return toX >= fromX ? 1 : -1;
}

function buildPlan(world: World, ch: SimChar, settings: Settings, plan: PlanName) {
  const c = cfgOf(settings, ch.id);
  const tasks: Task[] = [];
  const lively = settings.env.activity;
  const waitMul = 0.85 + (1 - lively) * 0.9;

  if (plan === "wait") {
    tasks.push({ kind: "wait", seconds: (1.2 + world.rng() * 2.6) * waitMul });
  } else if (plan === "wander") {
    ensureStand(ch, tasks);
    const spot = openPoint(world);
    tasks.push({ kind: "goto", x: spot.x, y: spot.y });
    tasks.push({ kind: "wait", seconds: 1 + world.rng() * 2.2 });
  } else if (plan === "sit") {
    if (ch.seat && ch.sit > 0.8) {
      tasks.push({ kind: "wait", seconds: (2.2 + world.rng() * 3.4) * waitMul });
    } else {
      const seat = freeSeat(world, settings, ch.id, c.traits.melancholy > 0.6 ? "alcove" : undefined);
      if (!seat) {
        tasks.push({ kind: "wait", seconds: 2 });
      } else {
        ensureStand(ch, tasks);
        ch.reserved = seat.id;
        tasks.push({ kind: "goto", x: seat.x, y: seat.y });
        tasks.push({ kind: "face", dir: seatFace(seat) });
        tasks.push({ kind: "sit", seat: seat.id });
        tasks.push({ kind: "wait", seconds: (2.4 + world.rng() * 4) * waitMul });
      }
    }
  } else if (plan === "drink") {
    const holding = ch.hold === "cup";
    const freeCup = world.cups.some((cup) => cup.holder === null);
    if (!holding && !freeCup) {
      tasks.push({ kind: "wait", seconds: 2 });
    } else {
      ensureStand(ch, tasks);
      const own = world.cups.find((cup) => cup.holder === ch.id);
      const cup = own ?? nearestFreeCup(world, ch);
      const table = cup ? tableForCup(cup.id) : TEA_TABLES[0];
      if (!holding) {
        tasks.push({ kind: "goto", x: table.approach.x, y: table.approach.y });
        tasks.push({ kind: "face", dir: table.approach.face });
        tasks.push({ kind: "pose", pose: "reach", seconds: 0.65 });
        if (cup) tasks.push({ kind: "takeCup", cupId: cup.id });
      }
      const seat =
        SEATS.find((s) => s.id === table.seat && !seatTaken(world, s.id, ch.id, settings)) ??
        (ch.seat ? SEATS.find((s) => s.id === ch.seat) : freeSeat(world, settings, ch.id));
      if (seat && !ch.seat) ch.reserved = seat.id;
      if (seat) {
        tasks.push({ kind: "goto", x: seat.x, y: seat.y });
        tasks.push({ kind: "face", dir: seatFace(seat) });
        tasks.push({ kind: "sit", seat: seat.id });
      }
      tasks.push({ kind: "drink" });
      tasks.push({ kind: "wait", seconds: 1.6 + world.rng() * 2.4 });
      tasks.push({ kind: "stand" });
      tasks.push({ kind: "goto", x: table.approach.x, y: table.approach.y });
      tasks.push({ kind: "face", dir: table.approach.face });
      tasks.push({ kind: "placeCup" });
      ch.cool.drink = world.time + 18;
    }
  } else if (plan === "converse") {
    const other = nearestOther(world, settings, ch);
    if (!other) {
      tasks.push({ kind: "wait", seconds: 2 });
    } else {
      ensureStand(ch, tasks);
      const side = ch.x <= other.x ? -78 : 78;
      const tx = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, other.x + side));
      const ty = Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, other.y + 8));
      tasks.push({ kind: "goto", x: tx, y: ty });
      tasks.push({ kind: "face", dir: faceToward(tx, other.x) });
      tasks.push({ kind: "say", text: pickLine(world, c.drinkStyle, ch.tox) });
      tasks.push({ kind: "pose", pose: "gesture", seconds: 4.2 + world.rng() * 2 });
      world.look[other.id] = { id: ch.id, until: world.time + 7 };
      ch.cool.converse = world.time + 10;
      ch.last = "converse";
    }
  } else if (plan === "adjust") {
    tasks.push({ kind: "pose", pose: "adjust", seconds: 2.6 + world.rng() * 1.4 });
  } else if (plan === "watch") {
    ensureStand(ch, tasks);
    const spot = LOOKS[Math.floor(world.rng() * LOOKS.length)] ?? LOOKS[0];
    tasks.push({ kind: "goto", x: spot.x, y: spot.y });
    tasks.push({ kind: "face", dir: spot.face });
    tasks.push({ kind: "pose", pose: "gesture", seconds: 1.6 + world.rng() });
    tasks.push({ kind: "wait", seconds: (2.2 + world.rng() * 3.2) * waitMul });
  } else if (plan === "smoke") {
    if (!settings.env.smoke) {
      tasks.push({ kind: "wait", seconds: 2 });
    } else if (world.pipeHolder && world.pipeHolder !== ch.id) {
      tasks.push({ kind: "wait", seconds: 2.5 });
    } else {
      ensureStand(ch, tasks);
      if (ch.hold !== "pipe") {
        tasks.push({ kind: "goto", x: PIPE_TRAY.x - 46, y: PIPE_TRAY.y });
        tasks.push({ kind: "face", dir: PIPE_TRAY.face });
        tasks.push({ kind: "pose", pose: "reach", seconds: 0.55 });
        tasks.push({ kind: "takePipe" });
      }
      const seat = freeSeat(world, settings, ch.id, "screen");
      if (seat) {
        ch.reserved = seat.id;
        tasks.push({ kind: "goto", x: seat.x, y: seat.y });
        tasks.push({ kind: "face", dir: seatFace(seat) });
        tasks.push({ kind: "sit", seat: seat.id });
      }
      tasks.push({ kind: "smoke" });
      tasks.push({ kind: "stand" });
      tasks.push({ kind: "goto", x: PIPE_TRAY.x - 46, y: PIPE_TRAY.y });
      tasks.push({ kind: "face", dir: PIPE_TRAY.face });
      tasks.push({ kind: "placePipe" });
      ch.cool.smoke = world.time + 24;
    }
  } else if (plan === "robe") {
    if (!c.hasOuter) {
      tasks.push({ kind: "wait", seconds: 1 });
    } else {
      tasks.push({ kind: "robe" });
    }
  } else if (plan === "attend") {
    ensureStand(ch, tasks);
    const table = TEA_TABLES[world.rng() < 0.5 ? 0 : 1];
    tasks.push({ kind: "goto", x: table.approach.x, y: table.approach.y });
    tasks.push({ kind: "face", dir: table.approach.face });
    tasks.push({ kind: "pose", pose: "reach", seconds: 1.3 });
    const guest = world.chars.find((o) => o.id !== ch.id && (o.hold === "cup" || o.seat));
    if (guest) {
      const tx = guest.x + (guest.x > ch.x ? -70 : 70);
      tasks.push({ kind: "goto", x: Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, tx)), y: guest.y + 6 });
      tasks.push({ kind: "face", dir: faceToward(tx, guest.x) });
      tasks.push({ kind: "pose", pose: "gesture", seconds: 2.2 });
      world.look[guest.id] = { id: ch.id, until: world.time + 4 };
    }
    ch.cool.attend = world.time + 12;
  }

  if (tasks.length === 0) tasks.push({ kind: "wait", seconds: 2 });
  ch.last = plan;
  enqueue(ch, tasks);
}

function choosePlan(world: World, ch: SimChar, settings: Settings): PlanName {
  const c = cfgOf(settings, ch.id);
  const t = c.traits;
  const lively = settings.env.activity;
  const toxTalk = c.drinkStyle === "talkative" ? ch.tox * 0.9 : 0;
  const toxSleep = c.drinkStyle === "sleepy" ? ch.tox : 0;
  const toxCross = c.drinkStyle === "cross" ? ch.tox * 0.7 : 0;
  const other = nearestOther(world, settings, ch);
  const socialOk = !!other && dist(ch, other) < 640;

  const weights: { k: PlanName; w: number }[] = [
    {
      k: "sit",
      w: (t.solitude * 0.95 + t.melancholy * 0.65 + t.calm * 0.3 + toxSleep * 0.8) * (ch.seat ? 0.35 : 1),
    },
    { k: "wander", w: (0.28 + t.restlessness * 1.15 + lively * 0.65) * (0.55 + lively * 0.7) },
    {
      k: "drink",
      w: cooling(ch, "drink", world.time) ? 0 : (t.drink * 1.1 + 0.05) * (ch.tox > 0.82 ? 0.25 : 1),
    },
    {
      k: "converse",
      w:
        (cooling(ch, "converse", world.time) ? 0 : 1) *
        (t.sociability * 0.95 + t.affection * 0.6 + toxTalk + lively * 0.2) *
        (socialOk ? 1 : 0) *
        (1 - toxCross),
    },
    { k: "adjust", w: 0.16 + (1 - t.calm) * 0.12 },
    { k: "watch", w: t.curiosity * 0.7 + t.solitude * 0.28 + t.melancholy * 0.2 },
    {
      k: "smoke",
      w: !settings.env.smoke || cooling(ch, "smoke", world.time) ? 0 : t.smoke * 0.85,
    },
    {
      k: "robe",
      w: c.hasOuter && t.playfulness > 0.2 ? t.playfulness * 0.32 : 0,
    },
    {
      k: "attend",
      w: c.role === "attendant" && !cooling(ch, "attend", world.time) ? 0.9 : 0,
    },
    { k: "wait", w: 0.32 + t.calm * 0.45 + (1 - lively) * 0.55 + toxSleep * 0.3 },
  ];

  if (ch.last) {
    const prev = weights.find((w) => w.k === ch.last);
    if (prev) prev.w *= 0.28;
  }

  let sum = 0;
  for (const w of weights) sum += Math.max(0, w.w);
  if (sum <= 0) return "wait";
  let r = world.rng() * sum;
  for (const w of weights) {
    r -= Math.max(0, w.w);
    if (r <= 0) return w.k;
  }
  return "wait";
}

function avoidOthers(world: World, settings: Settings, ch: SimChar, dt: number) {
  for (const o of world.chars) {
    if (o.id === ch.id || !here(settings, o.id)) continue;
    let dx = ch.x - o.x;
    let dy = ch.y - o.y;
    let d = Math.hypot(dx, dy * 1.4);
    if (d < 118) {
      if (d < 0.1) {
        dx = ch.id < o.id ? -1 : 1;
        dy = 0;
        d = 1;
      }
      const x = ch.x + (dx / d) * 132 * dt;
      const y = ch.y + (dy / d) * 90 * dt;
      if (
        x >= BOUNDS.x0 &&
        x <= BOUNDS.x1 &&
        y >= BOUNDS.y0 &&
        y <= BOUNDS.y1 &&
        !blocked(x, y) &&
        !segmentBlocked(ch.x, ch.y, x, y)
      ) {
        ch.x = x;
        ch.y = y;
      }
    }
  }
}

function stepChar(world: World, ch: SimChar, settings: Settings, dt: number, mutate: Mutate) {
  const look = world.look[ch.id];
  if (look && world.time > look.until) delete world.look[ch.id];

  if (ch.queue.length === 0) {
    const plan = choosePlan(world, ch, settings);
    buildPlan(world, ch, settings, plan);
  }

  const task = ch.queue[0];
  if (!task) return;
  ch.taskTime += dt;

  if (task.kind === "wait") {
    ch.pose = ch.sit > 0.5 ? "sit" : "stand";
    ch.raise = 0;
    if (look && ch.sit < 0.5) {
      const other = world.chars.find((o) => o.id === look.id);
      if (other) ch.facing = faceToward(ch.x, other.x);
    }
    if (ch.taskTime >= task.seconds) finish(ch);
    return;
  }

  if (task.kind === "goto") {
    const destination = walkableTarget(task.x, task.y);
    task.x = destination.x;
    task.y = destination.y;
    const dx = task.x - ch.x;
    const dy = task.y - ch.y;
    const d = Math.hypot(dx, dy);
    const speed = (108 + settings.env.activity * 36) * (1 - Math.min(0.4, ch.tox * 0.3));
    if (d < 7) {
      ch.x = task.x;
      ch.y = task.y;
      ch.pose = ch.sit > 0.4 ? "sit" : "stand";
      finish(ch);
      return;
    }
    const step = Math.min(d, speed * dt);
    const before = ch.x;
    const intend: 1 | -1 = task.x >= ch.x ? 1 : -1;
    stepAvoid(ch, task.x, task.y, step);
    ch.pose = "walk";
    ch.walkPhase += dt * 2.35;
    avoidOthers(world, settings, ch, dt);
    clampWalk(ch);
    const moved = ch.x - before;
    if (Math.abs(moved) > 0.4) ch.facing = moved > 0 ? 1 : -1;
    else if (Math.abs(task.x - ch.x) > 12 && Math.abs(dx) > Math.abs(dy)) ch.facing = intend;
    if (Math.abs(ch.x - before) < 4 * dt) ch.stuck += dt;
    else ch.stuck = 0;
    if (ch.stuck > 2.8) {
      ch.stuck = 0;
      finish(ch);
    }
    return;
  }

  if (task.kind === "face") {
    ch.facing = task.dir;
    finish(ch);
    return;
  }

  if (task.kind === "sit") {
    ch.pose = "sit";
    ch.sit = Math.min(1, ch.sit + dt * 1.35);
    ch.seat = task.seat;
    ch.reserved = task.seat;
    if (ch.sit >= 0.98) {
      pushLog(world, `${nameOf(settings, ch.id)} sat.`);
      finish(ch);
    }
    return;
  }

  if (task.kind === "stand") {
    ch.pose = "stand";
    ch.sit = Math.max(0, ch.sit - dt * 1.55);
    if (ch.sit <= 0.02) {
      ch.sit = 0;
      ch.seat = null;
      releaseReserve(ch);
      finish(ch);
    }
    return;
  }

  if (task.kind === "takeCup") {
    const cup = task.cupId
      ? world.cups.find((candidate) => candidate.id === task.cupId)
      : nearestFreeCup(world, ch);
    if (!cup || cup.holder || dist(ch, cup) > 250) {
      abortInteraction(world, ch, settings, "could not reach a free cup.");
      return;
    }
    if (ch.hold === "pipe") {
      abortInteraction(world, ch, settings, "put the pipe away before taking a cup.");
      return;
    }
    cup.holder = ch.id;
    ch.hold = "cup";
    pushLog(world, `${nameOf(settings, ch.id)} lifted a cup.`);
    finish(ch);
    return;
  }

  if (task.kind === "placeCup") {
    const cup = world.cups.find((c) => c.holder === ch.id);
    if (cup) cup.holder = null;
    if (ch.hold === "cup") {
      ch.hold = cfgOf(settings, ch.id).fan ? "fan" : "none";
      pushLog(world, `${nameOf(settings, ch.id)} set the cup down.`);
    }
    ch.raise = 0;
    finish(ch);
    return;
  }

  if (task.kind === "drink") {
    if (ch.hold !== "cup") {
      abortInteraction(world, ch, settings, "could not drink without a cup.");
      return;
    }
    ch.pose = "drink";
    const e = ch.taskTime;
    if (e < 0.7) ch.raise = e / 0.7;
    else if (e < 2) ch.raise = 1;
    else ch.raise = Math.max(0, 1 - (e - 2) / 0.7);
    if (e > 1.15 && !ch.sipped) {
      ch.sipped = true;
      const person = cfgOf(settings, ch.id);
      const sens = 0.7 + (1 - person.traits.calm) * 0.4;
      ch.tox = Math.min(1, ch.tox + 0.18 * sens);
      pushLog(world, `${person.name} drank.`);
    }
    if (e >= 2.75) {
      ch.raise = 0;
      finish(ch);
    }
    return;
  }

  if (task.kind === "takePipe") {
    if (world.pipeHolder && world.pipeHolder !== ch.id) {
      abortInteraction(world, ch, settings, "could not take the pipe; someone else has it.");
      return;
    }
    if (dist(ch, PIPE_TRAY) > 110) {
      abortInteraction(world, ch, settings, "could not reach the pipe tray.");
      return;
    }
    if (ch.hold === "cup") {
      const cup = world.cups.find((c) => c.holder === ch.id);
      if (cup) cup.holder = null;
    }
    world.pipeHolder = ch.id;
    ch.hold = "pipe";
    pushLog(world, `${nameOf(settings, ch.id)} took the kiseru.`);
    finish(ch);
    return;
  }

  if (task.kind === "placePipe") {
    if (world.pipeHolder === ch.id) world.pipeHolder = null;
    if (ch.hold === "pipe") ch.hold = cfgOf(settings, ch.id).fan ? "fan" : "none";
    pushLog(world, `${nameOf(settings, ch.id)} put the pipe away.`);
    finish(ch);
    return;
  }

  if (task.kind === "smoke") {
    if (ch.hold !== "pipe") {
      abortInteraction(world, ch, settings, "could not smoke without the pipe.");
      return;
    }
    if (!settings.env.smoke) {
      ch.queue = [
        { kind: "stand" },
        { kind: "goto", x: PIPE_TRAY.x - 46, y: PIPE_TRAY.y },
        { kind: "face", dir: PIPE_TRAY.face },
        { kind: "placePipe" },
      ];
      ch.taskTime = 0;
      return;
    }
    ch.pose = "smoke";
    ch.raise = 0.35 + Math.sin(ch.taskTime * 1.4) * 0.08;
    if (world.rng() < dt * 7) {
      world.motes.push({
        x: ch.x + ch.facing * 18,
        y: ch.y - 150,
        life: 2.4 + world.rng(),
        max: 2.8,
        vy: 18 + world.rng() * 14,
        w: 1.2 + world.rng(),
        ph: world.rng() * 6,
        kind: "smoke",
      });
    }
    if (ch.taskTime > 6.5) {
      ch.raise = 0;
      finish(ch);
    }
    return;
  }

  if (task.kind === "robe") {
    const person = cfgOf(settings, ch.id);
    const next = !person.wearingOuter;
    mutate.setWearing(ch.id, next);
    finish(ch);
    return;
  }

  if (task.kind === "say") {
    ch.say = { text: task.text, life: 4.6 };
    pushLog(world, `${nameOf(settings, ch.id)} spoke.`);
    finish(ch);
    return;
  }

  if (task.kind === "pose") {
    ch.pose = task.pose;
    if (task.pose === "reach") ch.raise = Math.min(1, ch.taskTime / 0.4);
    if (task.pose === "gesture") ch.raise = 0.25 + Math.sin(world.time * 2.2) * 0.15;
    if (task.pose === "adjust") ch.raise = 0.45 + Math.sin(world.time * 1.6) * 0.08;
    if (ch.taskTime >= task.seconds) {
      if (task.pose !== "drink") ch.raise = 0;
      finish(ch);
    }
  }
}

export type Mutate = {
  setWearing: (id: string, wearing: boolean) => void;
};

export function stepWorld(world: World, dt: number, settings: Settings, mutate: Mutate) {
  const dts = dt * settings.env.speed;
  world.time += dts;
  stepPets(world, settings, dts);

  if (world.inject.length) {
    const job = world.inject.shift();
    if (job) {
      const ch = world.chars.find((c) => c.id === job.id);
      if (ch) {
        ch.queue = [];
        ch.taskTime = 0;
        if (ch.reserved && ch.seat !== ch.reserved) ch.reserved = ch.seat;
        buildPlan(world, ch, settings, job.plan);
        if (ch.sit > 0.35 && ch.queue[0]?.kind !== "stand" && job.plan !== "sit" && job.plan !== "wait") {
          ch.queue.unshift({ kind: "stand" });
        }
      }
    }
  }

  for (const ch of world.chars) {
    const c = cfgOf(settings, ch.id);
    if (!c.present) {
      if (ch.hold === "cup") {
        const cup = world.cups.find((cup) => cup.holder === ch.id);
        if (cup) cup.holder = null;
      }
      if (world.pipeHolder === ch.id) world.pipeHolder = null;
      ch.hold = "none";
      ch.seat = null;
      ch.reserved = null;
      ch.queue = [];
      ch.say = null;
      ch.sit = 0;
      ch.pose = "stand";
      continue;
    }
    stepChar(world, ch, settings, dts, mutate);
    const decay = 0.012 * (0.8 + c.traits.calm * 0.4);
    ch.tox = Math.max(0, ch.tox - dts * decay);
    if (ch.say) {
      ch.say.life -= dts;
      if (ch.say.life <= 0) ch.say = null;
    }
  }

  for (const m of world.motes) {
    m.life -= dts;
    m.y -= m.vy * dts;
    m.x += Math.sin(world.time * m.w + m.ph) * dts * (m.kind === "petal" ? 22 : 10);
    if (m.kind === "petal") m.y += dts * 16;
  }
  world.motes = world.motes.filter((m) => m.life > 0);

  if (settings.env.petals && world.rng() < dts * 0.35 && world.motes.length < 28) {
    world.motes.push({
      x: 160 + world.rng() * 1280,
      y: 300 + world.rng() * 80,
      life: 7 + world.rng() * 4,
      max: 8,
      vy: -6,
      w: 0.6 + world.rng(),
      ph: world.rng() * 6,
      kind: "petal",
    });
  }
}

function nearestLook(ch: SimChar) {
  let best: string | null = null;
  let bestD = 78;
  const spots = [
    ...LOOKS.map((spot) => ({ x: spot.x, y: spot.y, label: spot.label })),
    ...TEA_TABLES.map((table) => ({ x: table.approach.x, y: table.approach.y, label: "the tea table" })),
    { x: PIPE_TRAY.x, y: PIPE_TRAY.y, label: "the pipe tray" },
    { x: BRAZIER.x, y: BRAZIER.y + 80, label: "the brazier" },
  ];
  for (const spot of spots) {
    const d = Math.hypot(ch.x - spot.x, (ch.y - spot.y) * 1.2);
    if (d < bestD) {
      bestD = d;
      best = spot.label;
    }
  }
  return best;
}

export function activityLine(world: World, settings: Settings, id: string): string {
  const ch = world.chars.find((c) => c.id === id);
  if (!ch) return "";
  const name = nameOf(settings, id);
  if (!cfgOf(settings, id).present) return `${name} is out of the room.`;
  const task = ch.queue[0];
  if (!task) return `${name} is still.`;
  switch (task.kind) {
    case "goto": {
      const look = nearestLook({ ...ch, x: task.x, y: task.y });
      return look ? `${name} is going to ${look}.` : `${name} is crossing the mats.`;
    }
    case "sit":
      return `${name} is sitting down.`;
    case "stand":
      return `${name} is rising.`;
    case "drink":
      return `${name} is drinking.`;
    case "smoke":
      return `${name} is smoking.`;
    case "takeCup":
      return `${name} lifts a cup from the table.`;
    case "placeCup":
      return `${name} sets the cup on the table.`;
    case "takePipe":
      return `${name} takes the kiseru from the tray.`;
    case "placePipe":
      return `${name} returns the kiseru.`;
    case "robe":
      return `${name} is changing an outer robe.`;
    case "pose":
      if (task.pose === "adjust") return `${name} is arranging a collar.`;
      if (task.pose === "reach") {
        const look = nearestLook(ch);
        return look ? `${name} reaches toward ${look}.` : `${name} reaches.`;
      }
      if (task.pose === "gesture") {
        const look = nearestLook(ch);
        return look ? `${name} is at ${look}.` : `${name} watches the room.`;
      }
      return `${name} pauses.`;
    case "say":
      return `${name} is with company.`;
    case "wait": {
      const look = nearestLook(ch);
      if (ch.hold === "cup") return `${name} holds a cup.`;
      if (ch.hold === "pipe") return `${name} holds the pipe.`;
      if (look) return `${name} is at ${look}.`;
      if (ch.sit > 0.6) return `${name} sits with the room.`;
      return `${name} is quiet.`;
    }
    default:
      return `${name} attends to the room.`;
  }
}
