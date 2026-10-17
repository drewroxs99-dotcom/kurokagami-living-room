export type PatternId =
  | "solid"
  | "seigaiha"
  | "asanoha"
  | "shima"
  | "kikko"
  | "shippo"
  | "kanoko"
  | "yagasuri";

export type HairStyle = "shimada" | "tsubushi" | "marumage" | "mage";

export type DrinkStyle = "talkative" | "sleepy" | "sentimental" | "cross";

export type TraitKey =
  | "sociability"
  | "solitude"
  | "calm"
  | "playfulness"
  | "melancholy"
  | "restlessness"
  | "curiosity"
  | "affection"
  | "drink"
  | "smoke";

export type Traits = Record<TraitKey, number>;

export type ThemeId = "night" | "vermilion" | "moss" | "dawn";

export type CharConfig = {
  id: string;
  name: string;
  role: "senior" | "oiran" | "attendant" | "guest";
  gender: "woman" | "man";
  pigment: string;
  pattern: PatternId;
  lining: string;
  obi: string;
  hasOuter: boolean;
  wearingOuter: boolean;
  outerPigment: string;
  outerPattern: PatternId;
  hair: HairStyle;
  ornament: "none" | "flower" | "comb" | "pin";
  brow: "natural" | "hikimayu";
  lip: number;
  blush: number;
  beautyMark: boolean;
  stature: number;
  frontObi: boolean;
  traits: Traits;
  drinkStyle: DrinkStyle;
  fan: boolean;
  present: boolean;
};

export type EnvSettings = {
  hour: number;
  paperAge: number;
  inkWeight: number;
  misregister: number;
  lantern: number;
  activity: number;
  speed: number;
  smoke: boolean;
  petals: boolean;
  theme: ThemeId;
  screen: PatternId;
  cushionPattern: PatternId;
  wallArt: string;
  wood: string;
  screenColor: string;
  glaze: string;
  lanternPaper: string;
  animals: boolean;
  zoom: number;
};

export type Settings = {
  env: EnvSettings;
  chars: CharConfig[];
  seed: number;
};

export type PoseName =
  | "stand"
  | "walk"
  | "sit"
  | "drink"
  | "smoke"
  | "reach"
  | "adjust"
  | "gesture";

export type Task =
  | { kind: "wait"; seconds: number }
  | { kind: "goto"; x: number; y: number }
  | { kind: "face"; dir: 1 | -1 }
  | { kind: "sit"; seat: string }
  | { kind: "stand" }
  | { kind: "takeCup"; cupId?: string }
  | { kind: "placeCup" }
  | { kind: "drink" }
  | { kind: "takePipe" }
  | { kind: "placePipe" }
  | { kind: "smoke" }
  | { kind: "robe" }
  | { kind: "say"; text: string }
  | { kind: "pose"; pose: PoseName; seconds: number };

export type Hold = "none" | "cup" | "pipe" | "fan";

export type SimChar = {
  id: string;
  x: number;
  y: number;
  facing: 1 | -1;
  sit: number;
  raise: number;
  pose: PoseName;
  walkPhase: number;
  queue: Task[];
  taskTime: number;
  stuck: number;
  tox: number;
  hold: Hold;
  say: { text: string; life: number } | null;
  seat: string | null;
  reserved: string | null;
  last: string;
  cool: Record<string, number>;
  sipped: boolean;
};

export type Cup = { id: string; holder: string | null; x: number; y: number };

export type Mote = {
  x: number;
  y: number;
  life: number;
  max: number;
  vy: number;
  w: number;
  ph: number;
  kind: "smoke" | "petal";
};

export type PetKind = "cat" | "dog";

export type Pet = {
  id: string;
  kind: PetKind;
  x: number;
  y: number;
  facing: 1 | -1;
  pose: "stand" | "walk" | "sit";
  phase: number;
  wait: number;
  tx: number;
  ty: number;
};

export type World = {
  time: number;
  rng: () => number;
  chars: SimChar[];
  pets: Pet[];
  cups: Cup[];
  pipeHolder: string | null;
  log: { text: string; time: number }[];
  inject: { id: string; plan: PlanName }[];
  motes: Mote[];
  look: Record<string, { id: string; until: number }>;
};

export type PlanName =
  | "sit"
  | "wander"
  | "drink"
  | "converse"
  | "adjust"
  | "watch"
  | "smoke"
  | "robe"
  | "attend"
  | "wait";

export type Seat = { id: string; x: number; y: number };
