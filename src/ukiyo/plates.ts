import { pigmentHex } from "./palette";
import { patternTile } from "./patterns";
import { figureScale, screenFootX } from "./figure";
import { BRAZIER, CUSHIONS, PIPE_TRAY, TEA_TABLES } from "./sim";
import { plateDrawSign, type PlatePose } from "./plate-directions";
import type { CharConfig, PatternId, Pet, Settings, SimChar, World } from "./types";
import { WALL_ART } from "./wall-art";

const CAST = ["komachi", "hanae", "ofuku", "arai", "ume", "kichi", "otsu", "jiro", "saku", "hei"] as const;

const CANON: Record<string, string> = {
  komachi: "ai",
  hanae: "shu",
  ofuku: "moss",
  arai: "persimmon",
  ume: "ochre",
  kichi: "sumi",
  otsu: "moss",
  jiro: "ai",
  saku: "murasaki",
  hei: "ochre",
};

const CANON_OBI: Record<string, string> = {
  komachi: "ochre",
  hanae: "ochre",
  ofuku: "sumi",
  arai: "ochre",
  ume: "persimmon",
  kichi: "persimmon",
  otsu: "sumi",
  jiro: "sumi",
  saku: "ochre",
  hei: "sumi",
};

const CANON_LINING: Record<string, string> = {
  komachi: "shu",
  hanae: "beni",
  ofuku: "gofun",
  arai: "gofun",
  ume: "shu",
  kichi: "persimmon",
  otsu: "gofun",
  jiro: "gofun",
  saku: "beni",
  hei: "sumi",
};

const CANON_PATTERN: Record<string, PatternId> = {
  komachi: "seigaiha",
  hanae: "asanoha",
  ofuku: "shima",
  arai: "yagasuri",
  ume: "asanoha",
  kichi: "solid",
  otsu: "shima",
  jiro: "solid",
  saku: "shippo",
  hei: "solid",
};

const images = new Map<string, HTMLImageElement>();
const tableForegroundLayers = new Map<string, HTMLCanvasElement>();

function load(src: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = src;
    images.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function roomPlate(): HTMLImageElement | null {
  return load("/prints/hall.jpg");
}

function drawTableForeground(ctx: CanvasRenderingContext2D, settings: Settings) {
  const room = roomPlate();
  if (!room) return;

  const key = `${settings.env.lanternPaper}:${settings.env.screen}:${settings.env.screenColor}:${settings.env.wood}:${settings.env.cushionPattern}`;
  let layer = tableForegroundLayers.get(key);
  if (!layer) {
    layer = document.createElement("canvas");
    layer.width = 1600;
    layer.height = 900;
    const layerCtx = layer.getContext("2d");
    if (!layerCtx) return;
    layerCtx.beginPath();
    layerCtx.moveTo(382, 646);
    layerCtx.lineTo(715, 644);
    layerCtx.lineTo(728, 671);
    layerCtx.lineTo(711, 685);
    layerCtx.lineTo(710, 708);
    layerCtx.lineTo(686, 712);
    layerCtx.lineTo(676, 772);
    layerCtx.lineTo(660, 780);
    layerCtx.lineTo(646, 773);
    layerCtx.lineTo(640, 711);
    layerCtx.lineTo(438, 711);
    layerCtx.lineTo(434, 773);
    layerCtx.lineTo(414, 780);
    layerCtx.lineTo(400, 770);
    layerCtx.lineTo(397, 699);
    layerCtx.lineTo(379, 680);
    layerCtx.closePath();
    layerCtx.moveTo(839, 642);
    layerCtx.lineTo(1219, 638);
    layerCtx.lineTo(1234, 667);
    layerCtx.lineTo(1218, 684);
    layerCtx.lineTo(1218, 706);
    layerCtx.lineTo(1194, 711);
    layerCtx.lineTo(1182, 770);
    layerCtx.lineTo(1165, 779);
    layerCtx.lineTo(1151, 771);
    layerCtx.lineTo(1145, 710);
    layerCtx.lineTo(875, 711);
    layerCtx.lineTo(870, 772);
    layerCtx.lineTo(850, 780);
    layerCtx.lineTo(836, 770);
    layerCtx.lineTo(834, 698);
    layerCtx.lineTo(818, 678);
    layerCtx.closePath();
    layerCtx.clip();
    layerCtx.drawImage(room, 0, 0, 1600, 900);
    drawRoomTints(layerCtx, settings);
    tableForegroundLayers.set(key, layer);
  }
  ctx.drawImage(layer, 0, 0);
}

function platePose(ch: SimChar): PlatePose {
  if (ch.pose === "walk" && ch.sit < 0.2) return "walk";
  if (ch.sit > 0.5 || ch.pose === "sit") return "sit";
  return "stand";
}

function srcFor(id: string, pose: PlatePose) {
  return `/prints/${id}-${pose}.webp`;
}

const styledCache = new Map<string, HTMLCanvasElement>();

function hexRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

type DyeTarget = { hue: number; saturation: number };

function dyeTarget(hex: string): DyeTarget {
  const tgt = hexRgb(hex);
  const max = Math.max(tgt.r, tgt.g, tgt.b) / 255;
  const min = Math.min(tgt.r, tgt.g, tgt.b) / 255;
  const chroma = max - min;
  let hue = 0;
  if (chroma > 0) {
    if (max === tgt.r / 255) hue = ((tgt.g - tgt.b) / 255 / chroma) % 6;
    else if (max === tgt.g / 255) hue = (tgt.b - tgt.r) / 255 / chroma + 2;
    else hue = (tgt.r - tgt.g) / 255 / chroma + 4;
    hue /= 6;
    if (hue < 0) hue += 1;
  }
  const targetLightness = (max + min) / 2;
  const denominator = 1 - Math.abs(2 * targetLightness - 1);
  return { hue, saturation: denominator === 0 ? 0 : chroma / denominator };
}

function dye(d: Uint8ClampedArray, i: number, target: DyeTarget) {
  const { hue, saturation } = target;
  const r = d[i];
  const g = d[i + 1];
  const b = d[i + 2];
  const lightness = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
  const m = lightness - c / 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (hue < 1 / 6) [red, green, blue] = [c, x, 0];
  else if (hue < 2 / 6) [red, green, blue] = [x, c, 0];
  else if (hue < 3 / 6) [red, green, blue] = [0, c, x];
  else if (hue < 4 / 6) [red, green, blue] = [0, x, c];
  else if (hue < 5 / 6) [red, green, blue] = [x, 0, c];
  else [red, green, blue] = [c, 0, x];
  d[i] = (red + m) * 255;
  d[i + 1] = (green + m) * 255;
  d[i + 2] = (blue + m) * 255;
}

function isSkin(r: number, g0: number, b: number) {
  if (r < 145 || g0 < 105 || b < 80) return false;
  if (r < g0 || g0 + 6 < b) return false;
  if (r - b > 95) return false;
  if (r - g0 > 55) return false;
  return true;
}

/** 0 kimono, 1 obi, 2 lining, -1 leave alone (head, skin, ink). */
function garmentAt(x: number, y: number, w: number, h: number, r: number, g0: number, b: number) {
  const max = Math.max(r, g0, b);
  const min = Math.min(r, g0, b);
  const l = (max + min) / 2;
  const sat = max === 0 ? 0 : (max - min) / max;
  if (l < 42) return -1;
  if (isSkin(r, g0, b)) return -1;
  const ny = y / h;
  if (ny < 0.32) return -1;
  const nx = x / w;
  if (ny > 0.4 && ny < 0.54 && nx > 0.28 && nx < 0.72 && l < 150) return 1;
  const lightTrim = l > 0.64 * 255 && sat < 0.38 && r + 12 >= b;
  const sleeveEdge = ny > 0.3 && ny < 0.82 && (nx < 0.14 || nx > 0.86);
  const collar = ny > 0.3 && ny < 0.43 && nx > 0.38 && nx < 0.62;
  if (lightTrim && (sleeveEdge || collar)) return 2;
  return 0;
}

function dyePlate(
  img: HTMLImageElement,
  kimono: string | null,
  obi: string | null,
  lining: string | null,
  pattern: PatternId | null,
): CanvasImageSource {
  if (!kimono && !obi && !lining && !pattern) return img;
  const key = `${img.src}|${kimono ?? ""}|${obi ?? ""}|${lining ?? ""}|${pattern ?? ""}`;
  const hit = styledCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return img;
  g.drawImage(img, 0, 0);
  const image = g.getImageData(0, 0, c.width, c.height);
  const d = image.data;
  const mask = new Uint8Array(c.width * c.height);
  const w = c.width;
  const h = c.height;
  const targets = {
    kimono: kimono ? dyeTarget(kimono) : null,
    obi: obi ? dyeTarget(obi) : null,
    lining: lining ? dyeTarget(lining) : null,
  };
  for (let y = 0, p = 0; y < h; y++) {
    for (let x = 0; x < w; x++, p++) {
      const i = p * 4;
      if (d[i + 3] < 16) continue;
      const part = garmentAt(x, y, w, h, d[i], d[i + 1], d[i + 2]);
      if (part < 0) continue;
      const target = part === 1 ? targets.obi : part === 2 ? targets.lining : targets.kimono;
      if (target) dye(d, i, target);
      if (part === 0) mask[p] = 1;
    }
  }
  g.putImageData(image, 0, 0);
  if (pattern && pattern !== "solid") {
    const tile = patternTile(pattern);
    if (tile) {
      const pc = document.createElement("canvas");
      pc.width = w;
      pc.height = h;
      const pg = pc.getContext("2d");
      if (pg) {
        const pat = pg.createPattern(tile, "repeat");
        if (pat) {
          pat.setTransform(new DOMMatrix().scale(3.2, 3.2));
          pg.fillStyle = pat;
          pg.fillRect(0, 0, w, h);
          const pd = pg.getImageData(0, 0, w, h).data;
          const out = g.getImageData(0, 0, w, h);
          for (let i = 0, p = 0; i < out.data.length; i += 4, p++) {
            if (!mask[p]) continue;
            const a = pd[i + 3] / 255;
            if (a < 0.15) continue;
            const ink = (0.3 * pd[i] + 0.59 * pd[i + 1] + 0.11 * pd[i + 2]) / 255;
            const motif = a * (1 - ink);
            const k = 1 - motif * 0.48;
            out.data[i] *= k;
            out.data[i + 1] *= k;
            out.data[i + 2] *= k;
          }
          g.putImageData(out, 0, 0);
        }
      }
    }
  }
  styledCache.set(key, c);
  return c;
}

type Ink = { lw: (px: number) => number };

type Masks = {
  lantern: HTMLCanvasElement;
  screen: HTMLCanvasElement;
  cushions: HTMLCanvasElement;
};
let masks: Masks | null = null;
const tintCache = new Map<string, HTMLCanvasElement>();

function paintMask(img: ImageData) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  if (!g) return null;
  g.putImageData(img, 0, 0);
  return c;
}

/** Restrict material masks to the lantern paper and folding screen in hall.jpg. */
function ensureMasks(room: HTMLImageElement): Masks | null {
  if (masks) return masks;
  const w = 1600;
  const h = 900;
  const scratch = document.createElement("canvas");
  scratch.width = w;
  scratch.height = h;
  const sg = scratch.getContext("2d", { willReadFrequently: true });
  if (!sg) return null;
  sg.drawImage(room, 0, 0, w, h);
  const src = sg.getImageData(0, 0, w, h).data;
  const lantern = sg.createImageData(w, h);
  const screen = sg.createImageData(w, h);
  const cushions = sg.createImageData(w, h);
  const screenTop = new Float32Array(w);
  const screenBottom = new Float32Array(w);
  for (let x = 1124; x <= 1580; x++) {
    screenTop[x] = x <= 1305
      ? 266 + ((x - 1124) * (243 - 266)) / (1305 - 1124)
      : 243 + ((x - 1305) * (215 - 243)) / (1568 - 1305);
    screenBottom[x] = x <= 1390
      ? 640 + ((x - 1126) * (658 - 640)) / (1390 - 1126)
      : 658 + ((x - 1390) * (680 - 658)) / (1578 - 1390);
  }
  for (let y = 0, p = 0; y < h; y++) {
    for (let x = 0; x < w; x++, p++) {
      const i = p * 4;
      const r = src[i];
      const g0 = src[i + 1];
      const b = src[i + 2];
      const ceilingLantern = ((x - 830) / 70) ** 2 + ((y - 161) / 66) ** 2 <= 1;
      const floorLantern = ((x - 486) / 32) ** 2 + ((y - 489) / 40) ** 2 <= 1;
      const onLantern = ceilingLantern || floorLantern;
      if (
        onLantern &&
        r > 48 &&
        g0 > 36 &&
        b > 18 &&
        r - b > 18 &&
        g0 - b > 4 &&
        r > g0 * 0.92
      ) {
        lantern.data[i] = lantern.data[i + 1] = lantern.data[i + 2] = lantern.data[i + 3] = 255;
      }
      const inFoldingScreen =
        x >= 1132 && x <= 1572 && y >= screenTop[x] + 7 && y <= screenBottom[x] - 8;
      if (
        inFoldingScreen &&
        r > 42 &&
        g0 > 24 &&
        b < 150 &&
        r - b > 20 &&
        g0 - b > 7 &&
        r > g0 * 0.92
      ) {
        screen.data[i] = screen.data[i + 1] = screen.data[i + 2] = screen.data[i + 3] = 255;
      }
      const insideCushion =
        r > 48 &&
        g0 > 28 &&
        r - g0 > 5 &&
        g0 - b > 3 &&
        r - b > 15 &&
        CUSHIONS.some(
          (cushion) =>
            Math.abs(x - cushion.x) <= cushion.rx &&
            Math.abs(y - cushion.y) <= cushion.ry &&
            ((x - cushion.x) / Math.max(1, cushion.rx - 3)) ** 2 +
              ((y - cushion.y) / Math.max(1, cushion.ry - 3)) ** 2 <=
              1,
        );
      if (insideCushion) {
        cushions.data[i] = cushions.data[i + 1] = cushions.data[i + 2] = cushions.data[i + 3] = 255;
      }
    }
  }
  const lanternC = paintMask(lantern);
  const screenC = paintMask(screen);
  const cushionsC = paintMask(cushions);
  if (!lanternC || !screenC || !cushionsC) return null;
  masks = { lantern: lanternC, screen: screenC, cushions: cushionsC };
  return masks;
}

function coloredMask(mask: HTMLCanvasElement, color: string, name: string) {
  const key = `${name}|${color}`;
  const hit = tintCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 1600;
  c.height = 900;
  const g = c.getContext("2d");
  if (!g) return mask;
  g.fillStyle = color;
  g.fillRect(0, 0, 1600, 900);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(mask, 0, 0);
  tintCache.set(key, c);
  return c;
}

function patternOnMask(mask: HTMLCanvasElement, id: PatternId, name: string) {
  const key = `pat|${name}|${id}`;
  const hit = tintCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 1600;
  c.height = 900;
  const g = c.getContext("2d");
  const tile = patternTile(id);
  if (!g || !tile) return c;
  const pat = g.createPattern(tile, "repeat");
  if (!pat) return c;
  pat.setTransform(new DOMMatrix().scale(0.62, 0.62));
  g.fillStyle = pat;
  g.fillRect(0, 0, 1600, 900);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(mask, 0, 0);
  tintCache.set(key, c);
  return c;
}

function wisps(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, inkish: string) {
  ctx.save();
  ctx.strokeStyle = inkish;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const o = (time * 0.7 + i * 0.7) % 2.2;
    ctx.globalAlpha = 0.5 * (1 - o / 2.2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 10 + i * 4, y - 16 - o * 14, x + Math.sin(time + i) * 10, y - 34 - o * 16);
    ctx.stroke();
  }
  ctx.restore();
}

function kiseru(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.7);
  ctx.strokeStyle = "#2a2420";
  ctx.lineWidth = Math.max(1.1, 1.6 * s);
  ctx.beginPath();
  ctx.moveTo(-16 * s, 0);
  ctx.quadraticCurveTo(0, -2 * s, 22 * s, -4 * s);
  ctx.stroke();
  ctx.fillStyle = "#a68448";
  ctx.beginPath();
  ctx.ellipse(24 * s, -5 * s, 4 * s, 2.6 * s, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPlateCast(
  ctx: CanvasRenderingContext2D,
  world: World,
  settings: Settings,
  selected: string | null,
  ink: Ink,
) {
  type Item = { y: number; depth?: number; draw: () => void };
  const items: Item[] = [];
  items.push({ y: 120, draw: () => drawRoomTints(ctx, settings) });
  items.push({ y: 560, draw: () => drawWallArt(ctx, settings) });
  items.push({ y: 780, draw: () => drawTableForeground(ctx, settings) });
  items.push({
    y: BRAZIER.y,
    draw: () => {
      drawHibachi(ctx, BRAZIER.x, BRAZIER.y, ink);
      wisps(ctx, BRAZIER.x, BRAZIER.y - 10, world.time, "rgba(70,60,50,0.55)");
    },
  });
  for (const table of TEA_TABLES) {
    items.push({
      y: table.pot.y,
      depth: 781,
      draw: () => drawPot(ctx, table.pot.x, table.pot.y, settings, ink),
    });
    items.push({
      y: table.sweet.y,
      depth: 781,
      draw: () => drawSweet(ctx, table.sweet.x, table.sweet.y, ink),
    });
    for (const cup of table.cups) {
      const held = world.cups.find((c) => c.id === cup.id)?.holder;
      if (held) continue;
      items.push({
        y: cup.y,
        depth: 781,
        draw: () => drawCup(ctx, cup.x, cup.y - 6, 1.2, settings, ink),
      });
    }
  }
  items.push({
    y: PIPE_TRAY.y - 4,
    draw: () => drawPipeTray(ctx, world, settings, ink),
  });
  for (const ch of world.chars) {
    const config = settings.chars.find((c) => c.id === ch.id);
    if (!config || !config.present) continue;
    items.push({
      y: ch.y,
      draw: () => drawOne(ctx, ch, config, world, settings, selected === ch.id, ink),
    });
  }
  if (settings.env.animals) {
    for (const pet of world.pets) {
      items.push({ y: pet.y, draw: () => drawPet(ctx, pet, world) });
    }
  }
  items.sort((a, b) => (a.depth ?? a.y) - (b.depth ?? b.y));
  for (const item of items) item.draw();
}

function drawRoomTints(ctx: CanvasRenderingContext2D, settings: Settings) {
  const room = roomPlate();
  if (!room) return;
  const m = ensureMasks(room);
  if (!m) return;
  if (settings.env.lanternPaper !== "ochre") {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(coloredMask(m.lantern, pigmentHex(settings.env.lanternPaper), "lamp"), 0, 0);
    ctx.restore();
  }
  if (settings.env.wood !== "persimmon") {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.globalCompositeOperation = "color";
    ctx.drawImage(coloredMask(m.cushions, pigmentHex(settings.env.wood), "cushions"), 0, 0);
    ctx.restore();
  }
  if (settings.env.cushionPattern !== "solid") {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(patternOnMask(m.cushions, settings.env.cushionPattern, "cushions"), 0, 0);
    ctx.restore();
  }
  if (settings.env.screen !== "solid") {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(patternOnMask(m.screen, settings.env.screen, "screen"), 0, 0);
    ctx.restore();
  }
  if (settings.env.screenColor !== "ochre") {
    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.globalCompositeOperation = "color";
    ctx.drawImage(coloredMask(m.screen, pigmentHex(settings.env.screenColor), "screen"), 0, 0);
    ctx.restore();
  }
}

function drawWallArt(ctx: CanvasRenderingContext2D, settings: Settings) {
  const art = WALL_ART.find((entry) => entry.id === settings.env.wallArt);
  if (!art) return;
  const image = load(art.src);
  if (!image) return;
  const x = 805;
  const y = 320;
  const w = 55;
  const h = 121;
  const imageAspect = image.naturalWidth / image.naturalHeight;
  const targetAspect = w / h;
  const sx =
    imageAspect > targetAspect
      ? (image.naturalWidth - image.naturalHeight * targetAspect) / 2
      : 0;
  const sy =
    imageAspect < targetAspect
      ? (image.naturalHeight - image.naturalWidth / targetAspect) / 2
      : 0;
  const sw =
    imageAspect > targetAspect ? image.naturalHeight * targetAspect : image.naturalWidth;
  const sh =
    imageAspect < targetAspect ? image.naturalWidth / targetAspect : image.naturalHeight;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + 2, y);
  ctx.lineTo(x + w - 2, y + 2);
  ctx.lineTo(x + w - 1, y + h - 2);
  ctx.lineTo(x + 1, y + h);
  ctx.closePath();
  ctx.clip();
  ctx.filter = "sepia(0.48) saturate(0.58) brightness(0.82) contrast(0.88)";
  ctx.globalAlpha = 0.56;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = "rgba(57, 39, 27, 0.45)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x + 2, y);
  ctx.lineTo(x + w - 2, y + 2);
  ctx.lineTo(x + w - 1, y + h - 2);
  ctx.lineTo(x + 1, y + h);
  ctx.closePath();
  ctx.stroke();
}

function drawPot(ctx: CanvasRenderingContext2D, x: number, base: number, settings: Settings, ink: Ink) {
  const glaze = pigmentHex(settings.env.glaze);
  ctx.save();
  ctx.translate(x, base);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#1c140f";
  ctx.lineWidth = Math.max(1.2, ink.lw(1));

  ctx.lineWidth = Math.max(2, ink.lw(2.4));
  ctx.beginPath();
  ctx.moveTo(-13, -24);
  ctx.bezierCurveTo(-33, -31, -34, -7, -17, -8);
  ctx.stroke();

  ctx.lineWidth = Math.max(2, ink.lw(2.5));
  ctx.beginPath();
  ctx.moveTo(14, -21);
  ctx.quadraticCurveTo(24, -23, 32, -34);
  ctx.quadraticCurveTo(36, -38, 37, -34);
  ctx.moveTo(14, -17);
  ctx.quadraticCurveTo(26, -19, 34, -32);
  ctx.stroke();

  ctx.fillStyle = glaze;
  ctx.beginPath();
  ctx.moveTo(-19, -23);
  ctx.bezierCurveTo(-25, -15, -21, -4, -12, -2);
  ctx.quadraticCurveTo(0, 2, 12, -2);
  ctx.bezierCurveTo(22, -6, 24, -17, 18, -25);
  ctx.quadraticCurveTo(0, -32, -19, -23);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const glazeShade = ctx.createLinearGradient(-22, -18, 22, -8);
  glazeShade.addColorStop(0, "rgba(0, 0, 0, 0.28)");
  glazeShade.addColorStop(0.45, "rgba(255, 242, 210, 0.18)");
  glazeShade.addColorStop(1, "rgba(0, 0, 0, 0.36)");
  ctx.fillStyle = glazeShade;
  ctx.fill();

  ctx.strokeStyle = "rgba(246, 222, 179, 0.65)";
  ctx.lineWidth = Math.max(0.8, ink.lw(0.9));
  ctx.beginPath();
  ctx.moveTo(-11, -23);
  ctx.quadraticCurveTo(-15, -13, -10, -5);
  ctx.stroke();

  ctx.strokeStyle = "#1c140f";
  ctx.lineWidth = Math.max(1.1, ink.lw(1));
  ctx.beginPath();
  ctx.ellipse(0, -27, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -29, 11, 2.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#cfad77";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -34, 3.2, 2.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = glaze;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, -2.5, 12, 2.6, 0, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -1, 15, 3.2, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawCup(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  settings: Settings,
  ink: Ink,
) {
  const glaze = pigmentHex(settings.env.glaze);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = glaze;
  ctx.strokeStyle = "#1c140f";
  ctx.lineWidth = ink.lw(0.9);
  ctx.beginPath();
  ctx.moveTo(-8 * s, -2 * s);
  ctx.lineTo(-9 * s, 6 * s);
  ctx.lineTo(9 * s, 6 * s);
  ctx.lineTo(8 * s, -2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -2 * s, 8.4 * s, 3.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(28,20,14,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, -2 * s, 3.6 * s, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSweet(ctx: CanvasRenderingContext2D, x: number, base: number, ink: Ink) {
  ctx.save();
  ctx.translate(x, base);
  ctx.fillStyle = "#6e2e28";
  ctx.strokeStyle = "#1c140f";
  ctx.lineWidth = ink.lw(0.8);
  ctx.beginPath();
  ctx.ellipse(0, -2, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f3e2c4";
  ctx.beginPath();
  ctx.ellipse(-3, -5, 4, 2.2, -0.3, 0, Math.PI * 2);
  ctx.ellipse(4, -4, 3.2, 1.8, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHibachi(ctx: CanvasRenderingContext2D, x: number, base: number, ink: Ink) {
  ctx.save();
  ctx.translate(x, base);
  ctx.fillStyle = "#241814";
  ctx.strokeStyle = "#120c0a";
  ctx.lineWidth = ink.lw(1.2);
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3a241c";
  ctx.beginPath();
  ctx.ellipse(0, -4, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9a3418";
  ctx.beginPath();
  ctx.ellipse(-6, -5, 5, 2.4, 0, 0, Math.PI * 2);
  ctx.ellipse(7, -4, 4, 2, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8c56a";
  ctx.beginPath();
  ctx.ellipse(-5, -6, 1.6, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPipeTray(ctx: CanvasRenderingContext2D, world: World, settings: Settings, ink: Ink) {
  ctx.save();
  ctx.translate(PIPE_TRAY.x, PIPE_TRAY.y);
  ctx.fillStyle = pigmentHex(settings.env.wood);
  ctx.strokeStyle = "#1c140f";
  ctx.lineWidth = ink.lw(1);
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (!world.pipeHolder) {
    ctx.save();
    ctx.translate(-2, -3);
    ctx.rotate(-0.35);
    ctx.lineWidth = ink.lw(1.4);
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.quadraticCurveTo(0, -2, 22, -3);
    ctx.stroke();
    ctx.fillStyle = "#c4a15a";
    ctx.beginPath();
    ctx.ellipse(24, -4, 4.5, 2.6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export function characterHitBounds(
  ch: SimChar,
  config: CharConfig,
  world: World,
) {
  const s = figureScale(ch.y) * config.stature;
  const walking = ch.pose === "walk" && ch.sit < 0.2;
  const transitioning = !walking && ch.sit > 0 && ch.sit < 1;
  const plates: { pose: PlatePose; height: number }[] = walking
    ? [{ pose: "walk", height: 200 * s }]
    : transitioning
      ? [
          { pose: "stand", height: 200 * s },
          { pose: "sit", height: 156 * s },
        ]
      : [{ pose: platePose(ch), height: (platePose(ch) === "sit" ? 156 : 200) * s }];
  const bounds = plates.flatMap(({ pose, height }) => {
    const img = load(srcFor(ch.id, pose)) ?? load(srcFor(ch.id, "stand"));
    return img ? [{ width: (height * img.naturalWidth) / img.naturalHeight, height }] : [];
  });
  if (bounds.length === 0) return null;

  const width = Math.max(...bounds.map((bound) => bound.width));
  const height = Math.max(...bounds.map((bound) => bound.height));
  const idle = Math.sin(world.time * 0.9 + ch.x * 0.01);
  const bob = 0;
  const breath = 1 + Math.sin(world.time * 1.35 + ch.y) * 0.012;
  const stride = walking ? Math.sin(ch.walkPhase * Math.PI * 2) : idle * 0.15;
  const angle = Math.abs(stride * 0.045);
  const halfWidth = (width * Math.cos(angle) + height * breath * Math.sin(angle)) / 2;
  const halfHeight = (height * breath * Math.cos(angle) + width * Math.sin(angle)) / 2;
  const x = screenFootX(ch.x, ch.y);
  const centerY = ch.y + bob - (height * breath) / 2;
  const pad = 10 * s;
  return {
    left: x - halfWidth - pad,
    right: x + halfWidth + pad,
    top: centerY - halfHeight - pad,
    bottom: centerY + halfHeight + pad,
  };
}

function drawPet(ctx: CanvasRenderingContext2D, pet: Pet, world: World) {
  const pose = pet.pose === "sit" && pet.kind === "dog" ? "stand" : pet.pose === "walk" && pet.kind === "cat" ? "stand" : pet.pose;
  const img = load(`/prints/${pet.kind}-${pose}.webp`) ?? load(`/prints/${pet.kind}-stand.webp`);
  if (!img) return;
  const s = figureScale(pet.y);
  const x = screenFootX(pet.x, pet.y);
  const h = (pet.kind === "cat" ? 58 : 86) * s * (pose === "sit" ? 0.92 : 1);
  const w = h * (img.naturalWidth / img.naturalHeight);
  const bob = 0;
  const native = pet.kind === "cat" ? 1 : -1;
  ctx.save();
  ctx.translate(x, pet.y + bob);
  ctx.fillStyle = "rgba(28,18,12,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 3, (pet.kind === "dog" ? 28 : 18) * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(pet.facing * native, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}

function drawOne(
  ctx: CanvasRenderingContext2D,
  ch: SimChar,
  config: CharConfig,
  world: World,
  settings: Settings,
  selected: boolean,
  ink: Ink,
) {
  const pose = platePose(ch);
  const s = figureScale(ch.y) * config.stature;
  const x = screenFootX(ch.x, ch.y);
  const y = ch.y;
  const img = load(srcFor(ch.id, pose)) ?? load(srcFor(ch.id, "stand"));
  if (!img) return;
  const seated = ch.sit * ch.sit * (3 - 2 * ch.sit);
  const h = (200 - 44 * seated) * s;
  const w = h * (img.naturalWidth / img.naturalHeight);
  const idle = Math.sin(world.time * 0.9 + ch.x * 0.01);
  const walking = ch.pose === "walk" && ch.sit < 0.2;
  const bob = 0;
  const breath = 1 + Math.sin(world.time * 1.35 + ch.y) * 0.012;
  const kimono = CANON[ch.id] && config.pigment !== CANON[ch.id] ? pigmentHex(config.pigment) : null;
  const obi = CANON_OBI[ch.id] && config.obi !== CANON_OBI[ch.id] ? pigmentHex(config.obi) : null;
  const lining = CANON_LINING[ch.id] && config.lining !== CANON_LINING[ch.id] ? pigmentHex(config.lining) : null;
  const pattern =
    CANON_PATTERN[ch.id] && config.pattern !== CANON_PATTERN[ch.id] && config.pattern !== "solid"
      ? config.pattern
      : null;

  ctx.save();
  ctx.translate(x, y + bob);
  const stride = walking ? Math.sin(ch.walkPhase * Math.PI * 2) : idle * 0.15;
  ctx.rotate(ch.facing * stride * 0.012);

  ctx.fillStyle = "rgba(28,18,12,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 4, (40 + 22 * seated) * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = "#8e3a30";
    ctx.lineWidth = ink.lw(1.6);
    ctx.beginPath();
    ctx.ellipse(0, 6, 52 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const drawPlate = (plate: PlatePose, alpha: number) => {
    if (alpha <= 0) return;
    const img = load(srcFor(ch.id, plate)) ?? load(srcFor(ch.id, "stand"));
    if (!img) return;
    const h = (plate === "sit" ? 156 : 200) * s;
    const w = h * (img.naturalWidth / img.naturalHeight);
    const source = dyePlate(img, kimono, obi, lining, pattern);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.scale(plateDrawSign(ch.id, plate, ch.facing), breath);
    if (settings.env.misregister > 0.05) {
      ctx.save();
      ctx.globalAlpha *= 0.32 * settings.env.misregister;
      ctx.drawImage(source, -w / 2 + 5, -h - 1, w, h);
      ctx.restore();
    }
    ctx.drawImage(source, -w / 2, -h, w, h);
    ctx.restore();
  };

  if (walking) {
    drawPlate("walk", 1);
  } else if (ch.sit > 0 && ch.sit < 1) {
    drawPlate("stand", 1 - seated);
    drawPlate("sit", seated);
  } else {
    drawPlate(pose, 1);
  }

  if (ch.hold === "pipe" || ch.pose === "smoke") {
    const px = ch.facing * 18 * s;
    const py = -h * (0.68 - 0.1 * seated);
    kiseru(ctx, px, py, s);
    wisps(ctx, px + ch.facing * 12 * s, py - 8 * s, world.time, "rgba(40,34,28,0.5)");
  } else if (ch.hold === "cup" || ch.pose === "drink") {
    const px = ch.facing * 16 * s;
    const cupHeight = ch.pose === "drink" ? 0.52 + ch.raise * 0.12 : 0.5;
    const py = -h * cupHeight;
    drawCup(ctx, px, py, Math.max(0.7, s), settings, ink);
    wisps(ctx, px, py - 10 * s, world.time * 0.8, "rgba(90,80,70,0.4)");
  }

  ctx.restore();
}

export function platesReady() {
  return roomPlate() != null && CAST.every((id) => load(srcFor(id, "stand")) != null);
}
