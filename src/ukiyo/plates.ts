import { pigmentHex } from "./palette";
import { patternTile } from "./patterns";
import { figureScale, screenFootX } from "./figure";
import { BRAZIER, CUSHIONS, PIPE_TRAY, TEA_TABLES } from "./sim";
import { assetMatches, getActiveAssets, imageForAsset } from "./assets";
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
  return load("/prints/room.jpg");
}

function drawTableForeground(ctx: CanvasRenderingContext2D, settings: Settings) {
  const room = roomPlate();
  if (!room) return;

  const key = `${settings.env.lanternPaper}:${settings.env.screen}`;
  let layer = tableForegroundLayers.get(key);
  if (!layer) {
    layer = document.createElement("canvas");
    layer.width = 1600;
    layer.height = 900;
    const layerCtx = layer.getContext("2d");
    if (!layerCtx) return;
    layerCtx.beginPath();
    layerCtx.moveTo(650, 647);
    layerCtx.lineTo(949, 647);
    layerCtx.lineTo(980, 676);
    layerCtx.lineTo(982, 700);
    layerCtx.lineTo(616, 700);
    layerCtx.lineTo(616, 678);
    layerCtx.closePath();
    layerCtx.rect(624, 698, 350, 26);
    layerCtx.moveTo(637, 706);
    layerCtx.lineTo(664, 706);
    layerCtx.lineTo(664, 769);
    layerCtx.lineTo(651, 778);
    layerCtx.lineTo(640, 773);
    layerCtx.closePath();
    layerCtx.moveTo(939, 706);
    layerCtx.lineTo(963, 706);
    layerCtx.lineTo(963, 773);
    layerCtx.lineTo(951, 779);
    layerCtx.lineTo(939, 772);
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

function dye(d: Uint8ClampedArray, i: number, hex: string) {
  const tgt = hexRgb(hex);
  const r = d[i];
  const g0 = d[i + 1];
  const b = d[i + 2];
  const lum = (0.3 * r + 0.59 * g0 + 0.11 * b) / 255;
  const shade = 0.32 + lum * 0.95;
  d[i] = Math.min(255, tgt.r * shade);
  d[i + 1] = Math.min(255, tgt.g * shade);
  d[i + 2] = Math.min(255, tgt.b * shade);
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
  if (l > 188 && sat < 0.28 && r + 8 >= b) return -1;
  const ny = y / h;
  if (ny < 0.32) return -1;
  const nx = x / w;
  if (ny > 0.4 && ny < 0.54 && nx > 0.28 && nx < 0.72 && l < 150) return 1;
  if (ny > 0.3 && ny < 0.5 && (nx < 0.2 || nx > 0.8)) return 2;
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
  for (let y = 0, p = 0; y < h; y++) {
    for (let x = 0; x < w; x++, p++) {
      const i = p * 4;
      if (d[i + 3] < 16) continue;
      const part = garmentAt(x, y, w, h, d[i], d[i + 1], d[i + 2]);
      if (part < 0) continue;
      const color = part === 1 ? obi : part === 2 ? lining : kimono;
      if (color) dye(d, i, color);
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

type Masks = { lantern: HTMLCanvasElement; screen: HTMLCanvasElement };
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

/** Lantern paper and byobu gold, sampled from the room print. */
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
  for (let y = 0, p = 0; y < h; y++) {
    for (let x = 0; x < w; x++, p++) {
      const i = p * 4;
      const r = src[i];
      const g0 = src[i + 1];
      const b = src[i + 2];
      const lantern = x > 1096 && x < 1178 && y > 476 && y < 658;
      if (lantern && r > 158 && g0 > 108 && b > 48 && b < 205 && r - b > 38 && g0 - b > 12) {
        lantern.data[i] = lantern.data[i + 1] = lantern.data[i + 2] = lantern.data[i + 3] = 255;
      }
      if (
        x > 1252 &&
        x < 1538 &&
        y > 250 &&
        y < 642 &&
        r > 88 &&
        r < 205 &&
        g0 > 52 &&
        g0 < 168 &&
        b < 92 &&
        r - b > 46 &&
        g0 - b > 16 &&
        r + g0 + b > 190
      ) {
        screen.data[i] = screen.data[i + 1] = screen.data[i + 2] = screen.data[i + 3] = 255;
      }
    }
  }
  const lanternC = paintMask(lantern);
  const screenC = paintMask(screen);
  if (!lanternC || !screenC) return null;
  masks = { lantern: lanternC, screen: screenC };
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
  pat.setTransform(new DOMMatrix().scale(1.35, 1.35));
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
  for (const cushion of CUSHIONS) {
    items.push({
      y: cushion.y,
      draw: () => drawCushion(ctx, cushion.x, cushion.y, cushion.rx, cushion.ry, settings),
    });
  }
  items.push({ y: 780, draw: () => drawTableForeground(ctx, settings) });
  items.push({
    y: BRAZIER.y,
    draw: () => {
      drawHibachi(ctx, BRAZIER.x, BRAZIER.y, ink);
      wisps(ctx, BRAZIER.x, BRAZIER.y - 10, world.time, "rgba(70,60,50,0.55)");
    },
  });
  const pot = TEA_TABLES[0]?.pot;
  if (pot) {
    items.push({
      y: pot.y,
      depth: 781,
      draw: () => drawPot(ctx, pot.x, pot.y, settings, ink),
    });
  }
  for (const table of TEA_TABLES) {
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
    ctx.globalAlpha = 0.42;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(coloredMask(m.lantern, pigmentHex(settings.env.lanternPaper), "lamp"), 0, 0);
    ctx.restore();
  }
  if (settings.env.screen !== "solid") {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.drawImage(patternOnMask(m.screen, settings.env.screen, "screen"), 0, 0);
    ctx.restore();
  }
}

function drawCushion(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, settings: Settings) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = pigmentHex(settings.env.wood);
  ctx.strokeStyle = "rgba(37, 23, 18, 0.82)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  const tile = patternTile(settings.env.cushionPattern);
  if (tile && settings.env.cushionPattern !== "solid") {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 2, ry - 2, 0, 0, Math.PI * 2);
    ctx.clip();
    const pattern = ctx.createPattern(tile, "repeat");
    if (pattern) {
      pattern.setTransform(new DOMMatrix().scale(1.2, 1.2));
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = pattern;
      ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
    }
    ctx.restore();
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.78, ry * 0.67, 0, 0.16, Math.PI * 0.84);
  ctx.strokeStyle = "rgba(245, 220, 177, 0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawWallArt(ctx: CanvasRenderingContext2D, settings: Settings) {
  const art = WALL_ART.find((entry) => entry.id === settings.env.wallArt);
  if (!art) return;
  const image = load(art.src);
  if (!image) return;
  const x = 765;
  const y = 329;
  const w = 69;
  const h = 220;
  const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  ctx.save();
  ctx.fillStyle = "#d9c6a0";
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(image, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
  ctx.restore();
  ctx.strokeStyle = "rgba(57, 39, 27, 0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
}

function drawPot(ctx: CanvasRenderingContext2D, x: number, base: number, settings: Settings, ink: Ink) {
  const glaze = pigmentHex(settings.env.glaze);
  ctx.save();
  ctx.translate(x, base);
  ctx.fillStyle = glaze;
  ctx.strokeStyle = "#1c140f";
  ctx.lineWidth = Math.max(1.2, ink.lw(1.1));
  ctx.beginPath();
  ctx.ellipse(0, -4, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -16, 24, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -28, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -32, 14, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1c140f";
  ctx.fillRect(-1.5, -40, 3, 8);
  ctx.strokeStyle = "#1c140f";
  ctx.beginPath();
  ctx.moveTo(20, -18);
  ctx.quadraticCurveTo(36, -20, 38, -32);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-22, -16, 10, Math.PI * 0.55, Math.PI * 1.5);
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

function drawPet(ctx: CanvasRenderingContext2D, pet: Pet, world: World) {
  const pose = pet.pose === "sit" && pet.kind === "dog" ? "stand" : pet.pose === "walk" && pet.kind === "cat" ? "stand" : pet.pose;
  const img = load(`/prints/${pet.kind}-${pose}.webp`) ?? load(`/prints/${pet.kind}-stand.webp`);
  if (!img) return;
  const s = figureScale(pet.y);
  const x = screenFootX(pet.x, pet.y);
  const h = (pet.kind === "cat" ? 58 : 86) * s * (pose === "sit" ? 0.92 : 1);
  const w = h * (img.naturalWidth / img.naturalHeight);
  const bob = pet.pose === "walk" ? -Math.abs(Math.sin(pet.phase * 8)) * 3.2 * s : Math.sin(world.time * 1.4 + pet.x) * -1.2 * s;
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
  const bob = walking ? -Math.abs(Math.sin(ch.walkPhase * Math.PI * 2)) * 5 * s : idle * -2.2 * s;
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
  ctx.rotate(ch.facing * stride * 0.045);

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

  for (const asset of getActiveAssets()) {
    if (!assetMatches(asset, ch.id, ch.pose)) continue;
    const overlay = imageForAsset(asset);
    if (!overlay.complete || !overlay.naturalWidth || !overlay.naturalHeight) continue;
    const fit = Math.min(w / overlay.naturalWidth, h / overlay.naturalHeight);
    const ow = overlay.naturalWidth * fit;
    const oh = overlay.naturalHeight * fit;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(overlay, -ow / 2, -h + (h - oh) / 2, ow, oh);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

export function platesReady() {
  return roomPlate() != null && CAST.every((id) => load(srcFor(id, "stand")) != null);
}
