import type { CharConfig, EnvSettings, PatternId, Settings, ThemeId, Traits } from "./types";
import { WALL_ART } from "./wall-art";

export type Pigment = { id: string; name: string; hex: string };

export const PIGMENTS: Pigment[] = [
  { id: "ai", name: "Indigo", hex: "#243e66" },
  { id: "ai-deep", name: "Deep indigo", hex: "#1a2c48" },
  { id: "shu", name: "Vermilion", hex: "#8f3a32" },
  { id: "beni", name: "Safflower", hex: "#a34b55" },
  { id: "ochre", name: "Yellow ochre", hex: "#a68448" },
  { id: "moss", name: "Malachite", hex: "#3e5c45" },
  { id: "sumi", name: "Sumi", hex: "#2a2420" },
  { id: "gofun", name: "Shell white", hex: "#e4d8c4" },
  { id: "murasaki", name: "Murasaki", hex: "#5c3d55" },
  { id: "persimmon", name: "Persimmon", hex: "#7a4634" },
];

export const PATTERNS: { id: PatternId; name: string }[] = [
  { id: "solid", name: "Plain" },
  { id: "seigaiha", name: "Seigaiha" },
  { id: "asanoha", name: "Asanoha" },
  { id: "shima", name: "Stripes" },
  { id: "kikko", name: "Kikkō" },
  { id: "shippo", name: "Shippō" },
  { id: "kanoko", name: "Kanoko" },
  { id: "yagasuri", name: "Yagasuri" },
];

export function pigmentHex(id: string): string {
  return PIGMENTS.find((p) => p.id === id)?.hex ?? "#243e66";
}

export function pigmentName(id: string): string {
  return PIGMENTS.find((p) => p.id === id)?.name ?? "Pigment";
}

export type Theme = {
  id: ThemeId;
  name: string;
  wall: string;
  tatami: string;
  wood: string;
  woodDeep: string;
  exterior: string;
  moon: string;
  lantern: string;
  paper: string;
  gold: string;
};

export const THEMES: Theme[] = [
  {
    id: "night",
    name: "Indigo night",
    wall: "#dccdb4",
    tatami: "#c6b27a",
    wood: "#6a4630",
    woodDeep: "#3e2a1e",
    exterior: "#1a2744",
    moon: "#efe6d2",
    lantern: "#e6b15a",
    paper: "#e7dcc6",
    gold: "#c4a15a",
  },
  {
    id: "vermilion",
    name: "Vermilion hour",
    wall: "#e4d0c0",
    tatami: "#cbb48a",
    wood: "#7a4634",
    woodDeep: "#4a2c22",
    exterior: "#3a2438",
    moon: "#f3e0d2",
    lantern: "#f0c07a",
    paper: "#ead8c8",
    gold: "#c88848",
  },
  {
    id: "moss",
    name: "Moss rain",
    wall: "#d5d0bc",
    tatami: "#b7b48a",
    wood: "#5c5340",
    woodDeep: "#2e3328",
    exterior: "#1e3330",
    moon: "#e4e6d4",
    lantern: "#d7b56a",
    paper: "#e3e0d0",
    gold: "#a89858",
  },
  {
    id: "dawn",
    name: "Charcoal dawn",
    wall: "#eadfce",
    tatami: "#d0c096",
    wood: "#8a6244",
    woodDeep: "#4e3828",
    exterior: "#c4846a",
    moon: "#f7efe4",
    lantern: "#f2d2a4",
    paper: "#f0e6d4",
    gold: "#d0a868",
  },
];

export function themeById(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

const TRAIT_KEYS: (keyof Traits)[] = [
  "sociability",
  "solitude",
  "calm",
  "playfulness",
  "melancholy",
  "restlessness",
  "curiosity",
  "affection",
  "drink",
  "smoke",
];

function traits(partial: Partial<Traits>): Traits {
  const base: Traits = {
    sociability: 0.4,
    solitude: 0.4,
    calm: 0.5,
    playfulness: 0.3,
    melancholy: 0.3,
    restlessness: 0.3,
    curiosity: 0.4,
    affection: 0.3,
    drink: 0.3,
    smoke: 0.1,
  };
  for (const k of TRAIT_KEYS) {
    if (typeof partial[k] === "number") base[k] = clamp01(partial[k] as number);
  }
  return base;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export const TRAIT_LABELS: { key: keyof Traits; label: string; hint: string }[] = [
  { key: "sociability", label: "Sociability", hint: "Seeks company" },
  { key: "solitude", label: "Solitude", hint: "Keeps to a cushion" },
  { key: "calm", label: "Calm", hint: "Longer quiet" },
  { key: "playfulness", label: "Play", hint: "Changes robes, gestures" },
  { key: "melancholy", label: "Melancholy", hint: "Watches the scroll" },
  { key: "restlessness", label: "Restlessness", hint: "Crosses the room" },
  { key: "curiosity", label: "Curiosity", hint: "Studies objects" },
  { key: "affection", label: "Warmth", hint: "Sits nearer, offers the cup" },
  { key: "drink", label: "Drink", hint: "Returns to the tokkuri" },
  { key: "smoke", label: "Smoke", hint: "Takes up the kiseru" },
];

function woman(
  partial: Omit<CharConfig, "traits" | "gender" | "present"> & { traits: Partial<Traits> },
): CharConfig {
  return {
    present: true,
    ...partial,
    gender: "woman",
    traits: traits(partial.traits),
  };
}

export function defaultChars(): CharConfig[] {
  return [
    woman({
      id: "komachi",
      name: "Komachi",
      role: "senior",
      pigment: "ai",
      pattern: "seigaiha",
      lining: "shu",
      obi: "ochre",
      hasOuter: true,
      wearingOuter: true,
      outerPigment: "ai-deep",
      outerPattern: "shippo",
      hair: "shimada",
      ornament: "pin",
      brow: "hikimayu",
      lip: 0.72,
      blush: 0.18,
      beautyMark: false,
      stature: 1.02,
      frontObi: true,
      fan: false,
      drinkStyle: "sentimental",
      traits: {
        sociability: 0.28,
        solitude: 0.78,
        calm: 0.84,
        playfulness: 0.22,
        melancholy: 0.62,
        restlessness: 0.18,
        curiosity: 0.7,
        affection: 0.34,
        drink: 0.32,
        smoke: 0.05,
      },
    }),
    woman({
      id: "hanae",
      name: "Hanae",
      role: "oiran",
      pigment: "shu",
      pattern: "asanoha",
      lining: "beni",
      obi: "ochre",
      hasOuter: true,
      wearingOuter: false,
      outerPigment: "murasaki",
      outerPattern: "seigaiha",
      hair: "shimada",
      ornament: "flower",
      brow: "hikimayu",
      lip: 0.86,
      blush: 0.28,
      beautyMark: true,
      stature: 1,
      frontObi: true,
      fan: true,
      drinkStyle: "talkative",
      traits: {
        sociability: 0.86,
        solitude: 0.16,
        calm: 0.34,
        playfulness: 0.78,
        melancholy: 0.12,
        restlessness: 0.64,
        curiosity: 0.48,
        affection: 0.8,
        drink: 0.55,
        smoke: 0.08,
      },
    }),
    woman({
      id: "ofuku",
      name: "Ofuku",
      role: "attendant",
      pigment: "moss",
      pattern: "shima",
      lining: "gofun",
      obi: "sumi",
      hasOuter: false,
      wearingOuter: false,
      outerPigment: "moss",
      outerPattern: "solid",
      hair: "marumage",
      ornament: "comb",
      brow: "natural",
      lip: 0.42,
      blush: 0.1,
      beautyMark: false,
      stature: 0.94,
      frontObi: false,
      fan: false,
      drinkStyle: "sleepy",
      traits: {
        sociability: 0.48,
        solitude: 0.3,
        calm: 0.72,
        playfulness: 0.2,
        melancholy: 0.22,
        restlessness: 0.4,
        curiosity: 0.36,
        affection: 0.4,
        drink: 0.12,
        smoke: 0.02,
      },
    }),
    {
      id: "arai",
      name: "Arai",
      role: "guest",
      gender: "man",
      pigment: "persimmon",
      pattern: "yagasuri",
      lining: "gofun",
      obi: "ochre",
      hasOuter: false,
      wearingOuter: false,
      outerPigment: "sumi",
      outerPattern: "solid",
      hair: "mage",
      ornament: "none",
      brow: "natural",
      lip: 0.22,
      blush: 0.06,
      beautyMark: false,
      stature: 1.06,
      frontObi: false,
      fan: false,
      drinkStyle: "talkative",
      present: true,
      traits: traits({
        sociability: 0.42,
        solitude: 0.55,
        calm: 0.4,
        playfulness: 0.18,
        melancholy: 0.7,
        restlessness: 0.28,
        curiosity: 0.34,
        affection: 0.36,
        drink: 0.74,
        smoke: 0.62,
      }),
    },
    woman({
      id: "ume",
      name: "Ume",
      role: "guest",
      pigment: "ochre",
      pattern: "asanoha",
      lining: "shu",
      obi: "persimmon",
      hasOuter: false,
      wearingOuter: false,
      outerPigment: "ochre",
      outerPattern: "solid",
      hair: "tsubushi",
      ornament: "comb",
      brow: "natural",
      lip: 0.45,
      blush: 0.12,
      beautyMark: true,
      stature: 0.96,
      frontObi: true,
      fan: false,
      drinkStyle: "talkative",
      traits: {
        sociability: 0.72,
        solitude: 0.22,
        calm: 0.48,
        playfulness: 0.55,
        melancholy: 0.18,
        restlessness: 0.46,
        curiosity: 0.64,
        affection: 0.4,
        drink: 0.58,
        smoke: 0.08,
      },
    }),
    {
      id: "kichi",
      name: "Kichi",
      role: "guest",
      gender: "man" as const,
      pigment: "sumi",
      pattern: "solid" as const,
      lining: "persimmon",
      obi: "persimmon",
      hasOuter: false,
      wearingOuter: false,
      outerPigment: "persimmon",
      outerPattern: "solid" as const,
      hair: "mage" as const,
      ornament: "none" as const,
      brow: "natural" as const,
      lip: 0.16,
      blush: 0.04,
      beautyMark: false,
      stature: 1.04,
      frontObi: false,
      fan: false,
      drinkStyle: "sleepy" as const,
      present: true,
      traits: traits({
        sociability: 0.36,
        solitude: 0.6,
        calm: 0.74,
        playfulness: 0.16,
        melancholy: 0.4,
        restlessness: 0.22,
        curiosity: 0.3,
        affection: 0.28,
        drink: 0.4,
        smoke: 0.7,
      }),
    },
    woman({
      id: "otsu",
      name: "Otsu",
      role: "attendant",
      pigment: "moss",
      pattern: "shima",
      lining: "gofun",
      obi: "sumi",
      hasOuter: false,
      wearingOuter: false,
      outerPigment: "moss",
      outerPattern: "solid",
      hair: "marumage",
      ornament: "none",
      brow: "natural",
      lip: 0.28,
      blush: 0.08,
      beautyMark: false,
      stature: 0.94,
      frontObi: true,
      fan: false,
      drinkStyle: "sleepy",
      traits: {
        sociability: 0.4,
        solitude: 0.5,
        calm: 0.8,
        playfulness: 0.12,
        melancholy: 0.3,
        restlessness: 0.2,
        curiosity: 0.35,
        affection: 0.45,
        drink: 0.22,
        smoke: 0.04,
      },
    }),
    {
      id: "jiro",
      name: "Jiro",
      role: "guest" as const,
      gender: "man" as const,
      pigment: "ai",
      pattern: "solid" as const,
      lining: "gofun",
      obi: "sumi",
      hasOuter: false,
      wearingOuter: false,
      outerPigment: "ai",
      outerPattern: "solid" as const,
      hair: "mage" as const,
      ornament: "none" as const,
      brow: "natural" as const,
      lip: 0.12,
      blush: 0.04,
      beautyMark: false,
      stature: 1,
      frontObi: false,
      fan: false,
      drinkStyle: "talkative" as const,
      present: true,
      traits: traits({
        sociability: 0.7,
        solitude: 0.2,
        calm: 0.35,
        playfulness: 0.48,
        melancholy: 0.12,
        restlessness: 0.62,
        curiosity: 0.7,
        affection: 0.3,
        drink: 0.5,
        smoke: 0.2,
      }),
    },
    woman({
      id: "saku",
      name: "Saku",
      role: "guest",
      pigment: "murasaki",
      pattern: "shippo",
      lining: "beni",
      obi: "ochre",
      hasOuter: false,
      wearingOuter: false,
      outerPigment: "murasaki",
      outerPattern: "solid",
      hair: "shimada",
      ornament: "pin",
      brow: "hikimayu",
      lip: 0.6,
      blush: 0.2,
      beautyMark: false,
      stature: 0.98,
      frontObi: true,
      fan: true,
      drinkStyle: "sentimental",
      traits: {
        sociability: 0.66,
        solitude: 0.24,
        calm: 0.4,
        playfulness: 0.58,
        melancholy: 0.2,
        restlessness: 0.44,
        curiosity: 0.5,
        affection: 0.52,
        drink: 0.36,
        smoke: 0.1,
      },
    }),
    {
      id: "hei",
      name: "Hei",
      role: "guest" as const,
      gender: "man" as const,
      pigment: "ochre",
      pattern: "solid" as const,
      lining: "sumi",
      obi: "sumi",
      hasOuter: false,
      wearingOuter: false,
      outerPigment: "sumi",
      outerPattern: "solid" as const,
      hair: "mage" as const,
      ornament: "none" as const,
      brow: "natural" as const,
      lip: 0.1,
      blush: 0.02,
      beautyMark: false,
      stature: 1.05,
      frontObi: false,
      fan: false,
      drinkStyle: "cross" as const,
      present: true,
      traits: traits({
        sociability: 0.3,
        solitude: 0.66,
        calm: 0.5,
        playfulness: 0.1,
        melancholy: 0.48,
        restlessness: 0.24,
        curiosity: 0.28,
        affection: 0.2,
        drink: 0.55,
        smoke: 0.48,
      }),
    },
  ];
}

export function defaultEnv(): EnvSettings {
  return {
    hour: 0.62,
    paperAge: 0.42,
    inkWeight: 0.7,
    misregister: 0.45,
    lantern: 0.72,
    activity: 0.58,
    speed: 1,
    smoke: true,
    petals: true,
    theme: "night",
    screen: "solid",
    cushionPattern: "seigaiha",
    wallArt: "",
    wood: "persimmon",
    glaze: "ai",
    lanternPaper: "ochre",
    animals: true,
    zoom: 1,
  };
}

export function defaultSettings(): Settings {
  return { env: defaultEnv(), chars: defaultChars(), seed: 7 };
}

const PATTERN_IDS = new Set(PATTERNS.map((p) => p.id));
const THEME_IDS = new Set(THEMES.map((t) => t.id));

export function normalizeSettings(raw: unknown): Settings {
  const base = defaultSettings();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<Settings>;
  if (r.env && typeof r.env === "object") {
    const e = r.env as Partial<EnvSettings>;
    base.env = {
      ...base.env,
      ...e,
      hour: clamp01(num(e.hour, base.env.hour)),
      paperAge: clamp01(num(e.paperAge, base.env.paperAge)),
      inkWeight: clamp01(num(e.inkWeight, base.env.inkWeight)),
      misregister: clamp01(num(e.misregister, base.env.misregister)),
      lantern: clamp01(num(e.lantern, base.env.lantern)),
      activity: clamp01(num(e.activity, base.env.activity)),
      speed: Math.min(4, Math.max(0.25, num(e.speed, base.env.speed))),
      smoke: bool(e.smoke, base.env.smoke),
      petals: bool(e.petals, base.env.petals),
      theme: THEME_IDS.has(e.theme as ThemeId) ? (e.theme as ThemeId) : base.env.theme,
      screen: PATTERN_IDS.has(e.screen as PatternId) ? (e.screen as PatternId) : base.env.screen,
      cushionPattern: PATTERN_IDS.has(e.cushionPattern as PatternId)
        ? (e.cushionPattern as PatternId)
        : base.env.cushionPattern,
      wallArt:
        typeof e.wallArt === "string" && WALL_ART.some((art) => art.id === e.wallArt) ? e.wallArt : "",
      wood: pigmentId(e.wood, base.env.wood),
      glaze: pigmentId(e.glaze, base.env.glaze),
      lanternPaper: pigmentId(e.lanternPaper, base.env.lanternPaper),
      animals: bool(e.animals, base.env.animals),
      zoom: Math.min(2.4, Math.max(0.65, num(e.zoom, base.env.zoom))),
    };
  }
  if (Array.isArray(r.chars)) {
    base.chars = base.chars.map((def) => {
      const found = r.chars?.find((c) => c && typeof c === "object" && (c as CharConfig).id === def.id) as
        | Partial<CharConfig>
        | undefined;
      if (!found) return def;
      return {
        ...def,
        ...found,
        id: def.id,
        name: def.name,
        role: def.role,
        gender: def.gender,
        hasOuter: def.hasOuter,
        fan: def.fan,
        frontObi: def.frontObi,
        pigment: typeof found.pigment === "string" ? found.pigment : def.pigment,
        pattern: PATTERN_IDS.has(found.pattern as PatternId) ? (found.pattern as PatternId) : def.pattern,
        outerPattern: PATTERN_IDS.has(found.outerPattern as PatternId)
          ? (found.outerPattern as PatternId)
          : def.outerPattern,
        hair: found.hair ?? def.hair,
        traits: traits({ ...def.traits, ...(found.traits ?? {}) }),
        lip: clamp01(num(found.lip, def.lip)),
        blush: clamp01(num(found.blush, def.blush)),
        stature: Math.min(1.12, Math.max(0.88, num(found.stature, def.stature))),
        present: bool(found.present, def.present),
      };
    });
  }
  if (typeof r.seed === "number" && Number.isFinite(r.seed)) base.seed = r.seed >>> 0;
  return base;
}

function pigmentId(v: unknown, fallback: string) {
  return typeof v === "string" && PIGMENTS.some((p) => p.id === v) ? v : fallback;
}

function num(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function bool(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

export function hourName(hour: number): string {
  if (hour < 0.25) return "Dusk";
  if (hour < 0.5) return "Lamp-lighting";
  if (hour < 0.75) return "The quiet hour";
  return "Deep night";
}

export function roleLabel(role: CharConfig["role"]): string {
  switch (role) {
    case "senior":
      return "Senior of the house";
    case "oiran":
      return "Oiran";
    case "attendant":
      return "Attendant";
    case "guest":
      return "Guest";
  }
}
