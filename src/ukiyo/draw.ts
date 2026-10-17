import { pigmentHex, themeById, type Theme } from "./palette";
import { patternTile } from "./patterns";
import { SEATS, STAND, TABLE, TRAY } from "./sim";
import { drawFigure } from "./figure";
import { characterHitBounds, drawPlateCast, roomPlate } from "./plates";
import type { PatternId, Settings, World } from "./types";

export type Layout = { x: number; y: number; w: number; h: number; scale: number };

/** Where the sheet is looking, in world pixels. Zoom lives on the house settings. */
export const sheet = { x: 800, y: 450 };

export function layoutFor(vw: number, vh: number): Layout {
  const m = vw < 700 ? 8 : 26;
  const maxW = vw - m * 2;
  const maxH = vh - m * 2;
  let w = maxW;
  let h = w / (16 / 9);
  if (h > maxH) {
    h = maxH;
    w = h * (16 / 9);
  }
  return { x: (vw - w) / 2, y: (vh - h) / 2, w, h, scale: w / 1600 };
}

export function clientToWorld(vw: number, vh: number, px: number, py: number, zoom: number) {
  const lay = layoutFor(vw, vh);
  const s = lay.scale * zoom;
  const cx = lay.x + lay.w / 2;
  const cy = lay.y + lay.h / 2;
  return { x: (px - cx) / s + sheet.x, y: (py - cy) / s + sheet.y };
}

const INK = "#1c140f";
const FACE = "#f3e4d2";
const NECK = "#f0d8c4";
const HAND = "#efd0b4";

let grain: HTMLCanvasElement | null = null;

function grainTile() {
  if (grain) return grain;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  if (!g) return c;
  const img = g.createImageData(256, 256);
  let s = 99;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s & 2147483646) / 2147483647;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const n = rnd();
    const v = 150 + n * 90;
    img.data[i] = v;
    img.data[i + 1] = v - 8;
    img.data[i + 2] = v - 20;
    img.data[i + 3] = n > 0.82 ? 70 : n > 0.55 ? 28 : 10;
  }
  g.putImageData(img, 0, 0);
  grain = c;
  return c;
}

function hexRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mix(a: string, b: string, t: number) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t);
  const n = (v: number) => v.toString(16).padStart(2, "0");
  return `#${n(f(A.r, B.r))}${n(f(A.g, B.g))}${n(f(A.b, B.b))}`;
}

function exteriorColor(theme: Theme, hour: number) {
  const dusk = mix(theme.exterior, "#c4846a", 0.55);
  return mix(dusk, theme.exterior, Math.min(1, hour * 1.15));
}

type Ink = {
  lw: (px: number) => number;
  mis: number;
  weight: number;
};

function strokeInk(ctx: CanvasRenderingContext2D, ink: Ink, px = 1.45) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink.lw(px * (0.75 + ink.weight));
  ctx.stroke();
}

function fillBlock(ctx: CanvasRenderingContext2D, color: string, mis: number) {
  if (mis > 0.05) {
    ctx.save();
    ctx.translate(inkShift(mis), -0.4 * mis);
    ctx.globalAlpha *= 0.22 + mis * 0.12;
    ctx.fillStyle = "#6e2438";
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = color;
  ctx.fill();
}

function inkShift(mis: number) {
  return 1.8 * mis;
}

function fillCloth(
  ctx: CanvasRenderingContext2D,
  color: string,
  pattern: PatternId,
  mis: number,
  tileScale = 0.22,
) {
  fillBlock(ctx, color, mis);
  const tile = patternTile(pattern);
  if (!tile) return;
  const pat = ctx.createPattern(tile, "repeat");
  if (!pat) return;
  pat.setTransform(new DOMMatrix().scale(tileScale, tileScale));
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = pat;
  ctx.fill();
  ctx.restore();
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  vw: number,
  vh: number,
  world: World,
  settings: Settings,
  selected: string | null,
) {
  const lay = layoutFor(vw, vh);
  const theme = themeById(settings.env.theme);
  ctx.clearRect(0, 0, vw, vh);
  ctx.fillStyle = "#100e0c";
  ctx.fillRect(0, 0, vw, vh);
  // lacquer sheen
  const sheen = ctx.createLinearGradient(0, 0, 0, vh);
  sheen.addColorStop(0, "rgba(255,244,220,0.04)");
  sheen.addColorStop(0.45, "rgba(255,244,220,0)");
  sheen.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  const zoom = settings.env.zoom;
  ctx.translate(lay.x + lay.w / 2, lay.y + lay.h / 2);
  ctx.scale(lay.scale * zoom, lay.scale * zoom);
  ctx.translate(-sheet.x, -sheet.y);
  const ink: Ink = {
    lw: (px) => px / (lay.scale * zoom),
    mis: settings.env.misregister,
    weight: settings.env.inkWeight,
  };
  drawPrint(ctx, world, settings, theme, ink, selected);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(232, 214, 180, 0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(lay.x - 6, lay.y - 6, lay.w + 12, lay.h + 12);
  ctx.restore();
}

function drawPrint(
  ctx: CanvasRenderingContext2D,
  world: World,
  settings: Settings,
  theme: Theme,
  ink: Ink,
  selected: string | null,
) {
  roundedClip(ctx);
  const room = roomPlate();
  if (room) {
    ctx.drawImage(room, 0, 0, 1600, 900);
    drawPlateCast(ctx, world, settings, selected, ink);
    drawMotes(ctx, world);
    drawHour(ctx, settings.env.hour, theme);
    drawLanternLight(ctx, settings.env.lantern, world.time, pigmentHex(settings.env.lanternPaper));
    drawInkWeight(ctx, settings.env.inkWeight);
    drawVignette(ctx, settings.env.paperAge, theme);
    drawMargin(ctx, ink);
    ctx.restore();
    return;
  }

  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, 1600, 900);

  const ext = exteriorColor(theme, settings.env.hour);
  drawArchitecture(ctx, theme, ext, settings, ink, world.time);
  drawTatami(ctx, theme, ink);

  type Item = { y: number; draw: () => void };
  const items: Item[] = [];

  items.push({ y: 548, draw: () => drawByobu(ctx, theme, settings, ink) });
  items.push({ y: TABLE.y + 36, draw: () => drawTable(ctx, world, theme, ink) });
  items.push({ y: STAND.y, draw: () => drawStand(ctx, settings, ink) });
  items.push({ y: TRAY.y - 4, draw: () => drawTray(ctx, world, theme, ink) });
  items.push({
    y: 736,
    draw: () => drawLantern(ctx, theme, settings.env.lantern, world.time, ink),
  });

  for (const seat of SEATS) {
    items.push({
      y: seat.y - 8,
      draw: () => drawCushion(ctx, seat.x, seat.y, seat.id === "right" ? "#8f3a32" : "#243e66", ink),
    });
  }

  for (const ch of world.chars) {
    const config = settings.chars.find((c) => c.id === ch.id);
    if (!config) continue;
    items.push({
      y: ch.y,
      draw: () => drawFigure(ctx, ch, config, world, ink, selected === ch.id),
    });
  }

  items.push({ y: 830, draw: () => drawCat(ctx, world.time, ink) });

  items.sort((a, b) => a.y - b.y);
  for (const item of items) item.draw();

  drawMotes(ctx, world);
  drawForeground(ctx, theme, ink);
  drawVignette(ctx, settings.env.paperAge, theme);
  drawMargin(ctx, ink);
  ctx.restore(); // clip
}

function roundedClip(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.beginPath();
  const wob = (i: number, amp: number) => Math.sin(i * 1.7) * amp + Math.sin(i * 0.37 + 2) * amp * 0.6;
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const x = (1600 * i) / steps;
    const y = 8 + wob(i, 1.4);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = 0; i <= steps; i++) {
    const y = (900 * i) / steps;
    ctx.lineTo(1592 + wob(i + 3, 1.6), y);
  }
  for (let i = steps; i >= 0; i--) {
    const x = (1600 * i) / steps;
    ctx.lineTo(x, 892 + wob(i + 5, 1.5));
  }
  for (let i = steps; i >= 0; i--) {
    const y = (900 * i) / steps;
    ctx.lineTo(8 + wob(i + 1, 1.4), y);
  }
  ctx.closePath();
  ctx.clip();
}

function drawArchitecture(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  ext: string,
  settings: Settings,
  ink: Ink,
  time: number,
) {
  ctx.fillStyle = theme.wall;
  ctx.fillRect(0, 0, 1600, 430);

  // ceiling beam
  ctx.fillStyle = theme.woodDeep;
  ctx.fillRect(0, 36, 1600, 28);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 40, 1600, 16);
  grainLines(ctx, 40, 44, 1520, 8, theme.woodDeep);

  drawShoji(ctx, 78, 78, 390, 230, ext, theme, ink, time);
  drawTokonoma(ctx, 500, 70, 470, 330, theme, ink, time);
  drawFusuma(ctx, 1000, 78, 520, 310, theme, settings, ink);

  // posts
  post(ctx, 70, 64, 390, theme);
  post(ctx, 488, 64, 390, theme);
  post(ctx, 990, 64, 390, theme);
  post(ctx, 1528, 64, 390, theme);

  // rail where wall meets floor
  ctx.fillStyle = theme.woodDeep;
  ctx.fillRect(40, 408, 1520, 16);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(40, 408, 1520, 8);
}

function post(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, theme: Theme) {
  ctx.fillStyle = theme.wood;
  ctx.fillRect(x, y, 18, h);
  ctx.fillStyle = theme.woodDeep;
  ctx.fillRect(x, y, 3, h);
  grainLines(ctx, x + 4, y + 8, 10, h - 16, theme.woodDeep);
}

function grainLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + w * 0.3, y + h * 0.2, x + w * 0.2, y + h * 0.6, x + w * 0.8, y + h);
  ctx.stroke();
  ctx.restore();
}

function drawShoji(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  ext: string,
  theme: Theme,
  ink: Ink,
  time: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = ext;
  ctx.fillRect(x, y, w, h);
  // moon
  ctx.fillStyle = theme.moon;
  ctx.beginPath();
  ctx.arc(x + w * 0.72, y + h * 0.38, 28, 0, Math.PI * 2);
  ctx.fill();
  drawPine(ctx, x + 30, y + h - 10, theme);
  ctx.restore();

  ctx.fillStyle = "#efe6d4";
  ctx.globalAlpha = 0.78;
  const cols = 7;
  const rows = 5;
  const cw = w / cols;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillRect(x + c * cw + 3, y + r * rh + 3, cw - 6, rh - 6);
    }
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.woodDeep;
  ctx.lineWidth = ink.lw(1.4);
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  for (let c = 1; c < cols; c++) {
    ctx.moveTo(x + c * cw, y);
    ctx.lineTo(x + c * cw, y + h);
  }
  for (let r = 1; r < rows; r++) {
    ctx.moveTo(x, y + r * rh);
    ctx.lineTo(x + w, y + r * rh);
  }
  ctx.stroke();

  // a moth near the moon, slow
  const mx = x + w * 0.72 + Math.sin(time * 0.7) * 36;
  const my = y + 48 + Math.cos(time * 0.9) * 16;
  drawMoth(ctx, mx, my, time);
}

function drawPine(ctx: CanvasRenderingContext2D, x: number, y: number, theme: Theme) {
  ctx.strokeStyle = "#0e1410";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 40, y);
  ctx.quadraticCurveTo(x + 10, y - 80, x + 70, y - 150);
  ctx.stroke();
  ctx.fillStyle = "#14241c";
  for (const [dx, dy, r] of [
    [70, -150, 28],
    [48, -132, 22],
    [96, -128, 20],
    [30, -100, 18],
    [78, -108, 16],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy, r, r * 0.62, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  void theme;
}

function drawMoth(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 3) * 0.4);
  ctx.fillStyle = "rgba(243,228,210,0.85)";
  ctx.beginPath();
  ctx.ellipse(-6, 0, 7, 3.2, -0.5, 0, Math.PI * 2);
  ctx.ellipse(6, 0, 7, 3.2, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(0, 3);
  ctx.stroke();
  ctx.restore();
}

function drawTokonoma(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: Theme,
  ink: Ink,
  time: number,
) {
  ctx.fillStyle = mix(theme.wall, "#000000", 0.08);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = theme.woodDeep;
  ctx.lineWidth = ink.lw(1.6);
  ctx.strokeRect(x, y, w, h);
  // irregular tokobashira
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.moveTo(x + 18, y);
  ctx.quadraticCurveTo(x + 28, y + h * 0.4, x + 14, y + h);
  ctx.lineTo(x + 30, y + h);
  ctx.quadraticCurveTo(x + 42, y + h * 0.5, x + 34, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = theme.woodDeep;
  ctx.stroke();

  // scroll
  const sx = x + 150;
  const sy = y + 18;
  ctx.fillStyle = "#d8c7a4";
  ctx.fillRect(sx, sy, 170, 250);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink.lw(1.1);
  ctx.strokeRect(sx, sy, 170, 250);
  ctx.fillStyle = theme.woodDeep;
  ctx.fillRect(sx - 8, sy - 8, 186, 10);
  ctx.fillRect(sx - 8, sy + 248, 186, 10);

  drawMask(ctx, sx + 85, sy + 118, time, ink);

  // vase and branch on the alcove floor
  ctx.fillStyle = "#2a2420";
  ctx.beginPath();
  ctx.moveTo(x + 80, y + h - 18);
  ctx.lineTo(x + 98, y + h - 70);
  ctx.lineTo(x + 122, y + h - 70);
  ctx.lineTo(x + 140, y + h - 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#3e5c45";
  ctx.lineWidth = ink.lw(1.3);
  ctx.beginPath();
  ctx.moveTo(x + 110, y + h - 70);
  ctx.quadraticCurveTo(x + 160, y + h - 120, x + 150, y + h - 150);
  ctx.stroke();
  ctx.fillStyle = "#3e5c45";
  ctx.beginPath();
  ctx.ellipse(x + 154, y + h - 154, 16, 7, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMask(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, ink: Ink) {
  const cycle = (time % 26) / 26;
  const open = cycle > 0.02 && cycle < 0.045 ? 1 : 0;

  ctx.save();
  ctx.translate(x, y);
  // arabesque
  ctx.strokeStyle = "#8c7044";
  ctx.lineWidth = ink.lw(1.15);
  ctx.beginPath();
  ctx.arc(-34, 8, 22, 0.2, 1.4);
  ctx.arc(34, 8, 22, Math.PI - 1.4, Math.PI - 0.2);
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 40, -20, 8, 14, s * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#f4ead8";
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  strokeInk(ctx, ink, 1.2);

  // eyes
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink.lw(1.3);
  ctx.beginPath();
  if (open) {
    ctx.ellipse(-10, -6, 6, 2.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(10, -6, 6, 2.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(-10, -6, 1.3, 0, Math.PI * 2);
    ctx.arc(10, -6, 1.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(-16, -6);
    ctx.quadraticCurveTo(-10, -9, -4, -5);
    ctx.moveTo(4, -5);
    ctx.quadraticCurveTo(10, -9, 16, -6);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(4, 8, 0, 12);
  ctx.stroke();
  ctx.fillStyle = "#8e3a30";
  ctx.beginPath();
  ctx.ellipse(0, 20, 5, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFusuma(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: Theme,
  settings: Settings,
  ink: Ink,
) {
  const openW = 120;
  // opening onto corridor
  ctx.fillStyle = mix(exteriorColor(theme, settings.env.hour), "#000", 0.25);
  ctx.fillRect(x + w - openW, y, openW, h);
  // distant lantern in corridor
  ctx.fillStyle = theme.lantern;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x + w - 70, y + 70, 28, 46);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.woodDeep;
  ctx.strokeRect(x + w - 70, y + 70, 28, 46);
  drawPine(ctx, x + w - 150, y + h - 20, theme);

  // closed panels slid left
  const panels = 3;
  const pw = (w - openW) / panels;
  for (let i = 0; i < panels; i++) {
    const px = x + i * pw;
    ctx.fillStyle = "#e7dcc4";
    ctx.fillRect(px, y, pw - 6, h);
    drawPanelMotif(ctx, px, y, pw - 6, h, theme, settings.env.screen, i);
    ctx.strokeStyle = theme.woodDeep;
    ctx.lineWidth = ink.lw(1.5);
    ctx.strokeRect(px, y, pw - 6, h);
    ctx.fillStyle = theme.wood;
    ctx.fillRect(px, y, pw - 6, 8);
    ctx.fillRect(px, y + h - 8, pw - 6, 8);
  }
}

function drawPanelMotif(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: Theme,
  pattern: PatternId,
  i: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 6, y + 12, w - 12, h - 24);
  ctx.clip();
  if (pattern === "seigaiha" || pattern === "solid") {
    ctx.fillStyle = theme.gold;
    ctx.globalAlpha = 0.85;
    cloud(ctx, x + w * 0.4, y + 50 + i * 10, 70);
    cloud(ctx, x + w * 0.7, y + h * 0.55, 54);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#1a2420";
    ctx.beginPath();
    ctx.moveTo(x + 16, y + h - 20);
    ctx.quadraticCurveTo(x + w * 0.4, y + h * 0.45, x + w - 20, y + h * 0.62);
    ctx.lineTo(x + w - 10, y + h - 16);
    ctx.closePath();
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    const tile = patternTile(pattern);
    if (tile) {
      const pat = ctx.createPattern(tile, "repeat");
      if (pat) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = pat;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.restore();
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.ellipse(x - r * 0.45, y + 4, r * 0.55, r * 0.28, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.4, y + 6, r * 0.5, r * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTatami(ctx: CanvasRenderingContext2D, theme: Theme, ink: Ink) {
  const rows = [
    { y: 430, h: 150, skew: 18 },
    { y: 580, h: 175, skew: 28 },
    { y: 755, h: 120, skew: 10 },
  ];
  for (const row of rows) {
    const mats = 4;
    const gap = 8;
    const usable = 1480;
    const mw = usable / mats;
    for (let i = 0; i < mats; i++) {
      const x = 60 + i * mw;
      mat(ctx, x, row.y, mw - gap, row.h, row.skew, theme, ink, (i + (row.y > 500 ? 1 : 0)) % 2 === 0);
    }
  }
}

function mat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  skew: number,
  theme: Theme,
  ink: Ink,
  flip: boolean,
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w + skew, y + h);
  ctx.lineTo(x + skew, y + h);
  ctx.closePath();
  ctx.fillStyle = theme.tatami;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#6a5830";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (flip) {
    for (let i = 8; i < w; i += 7) {
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + skew, y + h);
    }
  } else {
    for (let i = 6; i < h; i += 6) {
      ctx.moveTo(x, y + i);
      ctx.lineTo(x + w + skew, y + i);
    }
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "#2a3144";
  ctx.lineWidth = ink.lw(3);
  ctx.stroke();
  ctx.strokeStyle = "#6e2a32";
  ctx.lineWidth = ink.lw(1.2);
  ctx.stroke();
}

function drawByobu(ctx: CanvasRenderingContext2D, theme: Theme, settings: Settings, ink: Ink) {
  const x = 168;
  const y = 470;
  const pw = 52;
  const ph = 150;
  for (let i = 0; i < 4; i++) {
    const px = x + i * (pw + 3);
    const lift = Math.abs(i - 1.5) * 6;
    ctx.fillStyle = "#efe6d4";
    ctx.fillRect(px, y + lift, pw, ph - lift);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 3, y + lift + 4, pw - 6, ph - lift - 8);
    ctx.clip();
    const tile = patternTile(settings.env.screen === "solid" ? "seigaiha" : settings.env.screen);
    if (tile) {
      ctx.globalAlpha = 0.45;
      const pat = ctx.createPattern(tile, "repeat");
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(px, y, pw, ph);
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = theme.gold;
    ctx.globalAlpha = 0.8;
    cloud(ctx, px + pw / 2, y + 40 + lift, 18);
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = theme.woodDeep;
    ctx.lineWidth = ink.lw(1.3);
    ctx.strokeRect(px, y + lift, pw, ph - lift);
  }
}

function drawCushion(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, ink: Ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  strokeInk(ctx, ink, 1.15);
  ctx.strokeStyle = "rgba(255,244,230,0.35)";
  ctx.lineWidth = ink.lw(0.8);
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTable(ctx: CanvasRenderingContext2D, world: World, theme: Theme, ink: Ink) {
  const x = TABLE.x;
  const y = TABLE.y;
  ctx.beginPath();
  ctx.moveTo(x - 120, y - 24);
  ctx.lineTo(x + 130, y - 18);
  ctx.lineTo(x + 150, y + 28);
  ctx.lineTo(x - 100, y + 34);
  ctx.closePath();
  ctx.fillStyle = "#1a1614";
  ctx.fill();
  strokeInk(ctx, ink, 1.2);
  ctx.strokeStyle = theme.gold;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = ink.lw(1);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // tokkuri
  ctx.fillStyle = "#f3ead8";
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 8);
  ctx.quadraticCurveTo(x - 18, y - 8, x - 8, y - 36);
  ctx.lineTo(x + 10, y - 36);
  ctx.quadraticCurveTo(x + 20, y - 8, x + 14, y + 8);
  ctx.closePath();
  ctx.fill();
  strokeInk(ctx, ink, 1.1);
  ctx.fillStyle = "#8e3a30";
  ctx.fillRect(x - 6, y - 28, 14, 8);

  const free = world.cups.filter((c) => !c.holder);
  free.forEach((c, i) => {
    drawCup(ctx, x + 36 + i * 28, y + 2, ink, false);
    void c;
  });
}

function drawCup(ctx: CanvasRenderingContext2D, x: number, y: number, ink: Ink, held: boolean) {
  ctx.save();
  ctx.translate(x, y);
  if (held) ctx.rotate(-0.4);
  ctx.fillStyle = "#8e3a30";
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  strokeInk(ctx, ink, 1);
  ctx.fillStyle = "rgba(243,228,210,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, -1, 7, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStand(ctx: CanvasRenderingContext2D, settings: Settings, ink: Ink) {
  const x = STAND.x;
  const y = STAND.y;
  ctx.strokeStyle = "#5c4030";
  ctx.lineWidth = ink.lw(2.2);
  ctx.beginPath();
  ctx.moveTo(x - 34, y);
  ctx.lineTo(x - 34, y - 150);
  ctx.moveTo(x + 34, y);
  ctx.lineTo(x + 34, y - 150);
  ctx.moveTo(x - 40, y - 128);
  ctx.lineTo(x + 40, y - 128);
  ctx.stroke();

  const robes = settings.chars.filter((c) => c.hasOuter && !c.wearingOuter);
  robes.forEach((c, i) => {
    const ox = x - 8 + i * 14;
    ctx.beginPath();
    ctx.moveTo(ox - 28, y - 126);
    ctx.quadraticCurveTo(ox - 36, y - 40, ox - 22, y - 8);
    ctx.lineTo(ox + 26, y - 8);
    ctx.quadraticCurveTo(ox + 34, y - 50, ox + 24, y - 126);
    ctx.closePath();
    fillCloth(ctx, pigmentHex(c.outerPigment), c.outerPattern, 0.2);
    strokeInk(ctx, ink, 1.15);
  });
}

function drawTray(ctx: CanvasRenderingContext2D, world: World, theme: Theme, ink: Ink) {
  const x = TRAY.x;
  const y = TRAY.y;
  ctx.fillStyle = "#2a211c";
  ctx.beginPath();
  ctx.ellipse(x, y, 36, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  strokeInk(ctx, ink, 1);
  if (!world.pipeHolder) {
    drawPipe(ctx, x, y - 8, 0.2, ink);
  }
  void theme;
}

function drawPipe(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, ink: Ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = "#3a2e24";
  ctx.lineWidth = ink.lw(1.6);
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(16, -2);
  ctx.stroke();
  ctx.fillStyle = "#c4a15a";
  ctx.beginPath();
  ctx.arc(18, -3, 3.2, 0, Math.PI * 2);
  ctx.fill();
  strokeInk(ctx, ink, 0.8);
  ctx.restore();
}

function drawLantern(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  level: number,
  time: number,
  ink: Ink,
) {
  const x = 1410;
  const y = 700;
  const flicker = 0.85 + Math.sin(time * 5.1) * 0.05 + Math.sin(time * 2.2) * 0.04;
  ctx.fillStyle = theme.woodDeep;
  ctx.fillRect(x - 6, y - 168, 12, 168);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(x - 28, y - 150, 56, 8);
  ctx.fillRect(x - 28, y - 48, 56, 8);
  const glow = mix(theme.lantern, "#fff3d2", 0.25 * level);
  ctx.globalAlpha = 0.55 + level * 0.45 * flicker;
  ctx.fillStyle = glow;
  ctx.fillRect(x - 24, y - 142, 48, 94);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.woodDeep;
  ctx.lineWidth = ink.lw(1.2);
  ctx.strokeRect(x - 24, y - 142, 48, 94);
  ctx.beginPath();
  ctx.moveTo(x, y - 142);
  ctx.lineTo(x, y - 48);
  ctx.moveTo(x - 24, y - 95);
  ctx.lineTo(x + 24, y - 95);
  ctx.stroke();

  if (level > 0.05) {
    ctx.save();
    ctx.globalAlpha = 0.08 * level * flicker;
    const g = ctx.createRadialGradient(x, y - 90, 10, x, y - 80, 180);
    g.addColorStop(0, theme.lantern);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y - 90, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // second moth
  drawMoth(ctx, x + Math.sin(time * 0.8) * 40, y - 170 + Math.cos(time * 1.1) * 18, time);
}

function drawCat(ctx: CanvasRenderingContext2D, time: number, ink: Ink) {
  ctx.save();
  ctx.translate(1240, 812);
  ctx.fillStyle = "#2a2420";
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  strokeInk(ctx, ink, 1.1);
  // head
  ctx.beginPath();
  ctx.ellipse(22, -6, 12, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();
  strokeInk(ctx, ink, 1.1);
  ctx.beginPath();
  ctx.moveTo(16, -14);
  ctx.lineTo(14, -20);
  ctx.lineTo(20, -14);
  ctx.moveTo(24, -15);
  ctx.lineTo(26, -22);
  ctx.lineTo(28, -13);
  ctx.stroke();
  // ear flick
  const flick = Math.sin(time * 0.5) > 0.97 ? -4 : 0;
  ctx.beginPath();
  ctx.moveTo(26, -18 + flick);
  ctx.lineTo(30, -24 + flick);
  ctx.stroke();
  ctx.strokeStyle = "#e7dcc6";
  ctx.lineWidth = ink.lw(0.7);
  ctx.beginPath();
  ctx.moveTo(18, -6);
  ctx.quadraticCurveTo(22, -4, 26, -6);
  ctx.stroke();
  // tail
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink.lw(1.4);
  ctx.beginPath();
  ctx.moveTo(-24, 2);
  ctx.quadraticCurveTo(-36, -18 + Math.sin(time * 1.4) * 4, -18, -16);
  ctx.stroke();
  ctx.restore();
}

function drawMotes(ctx: CanvasRenderingContext2D, world: World) {
  for (const m of world.motes) {
    const a = Math.max(0, m.life / m.max);
    if (m.kind === "smoke") {
      ctx.fillStyle = `rgba(50, 44, 38, ${0.18 * a})`;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, 8 + (1 - a) * 10, 6 + (1 - a) * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.ph + world.time);
      ctx.fillStyle = `rgba(196, 120, 130, ${0.75 * a})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawForeground(ctx: CanvasRenderingContext2D, theme: Theme, ink: Ink) {
  ctx.fillStyle = theme.woodDeep;
  ctx.fillRect(0, 868, 1600, 32);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, 868, 1600, 10);
  grainLines(ctx, 40, 874, 400, 8, theme.woodDeep);
  void ink;
}

function drawHour(ctx: CanvasRenderingContext2D, hour: number, theme: Theme) {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = theme.exterior;
  ctx.fillRect(0, 0, 1600, 900);
  ctx.globalAlpha = 1;
  if (hour < 0.48) {
    ctx.fillStyle = `rgba(8, 12, 24, ${(0.48 - hour) * 0.95})`;
    ctx.fillRect(0, 0, 1600, 900);
  } else if (hour > 0.64) {
    ctx.fillStyle = `rgba(186, 96, 48, ${(hour - 0.64) * 0.7})`;
    ctx.fillRect(0, 0, 1600, 900);
  }
  ctx.restore();
}

function drawLanternLight(
  ctx: CanvasRenderingContext2D,
  level: number,
  time: number,
  color: string,
) {
  ctx.save();
  const dim = Math.max(0, 0.62 - level);
  if (dim > 0.02) {
    ctx.fillStyle = `rgba(6, 8, 16, ${dim * 0.82})`;
    ctx.fillRect(0, 0, 1600, 900);
  }
  const glow = Math.max(0, level - 0.18) * 0.62;
  if (glow > 0.02) {
    ctx.globalCompositeOperation = "screen";
    const flick = 0.9 + Math.sin(time * 2.6) * 0.1;
    const hex = color.replace("#", "");
    const rgb = [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ].map((channel) => Math.round(channel + (255 - channel) * 0.58));
    const rgba = (alpha: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
    for (const lamp of [
      { x: 830, y: 151, r: 210, strength: 0.72 },
      { x: 486, y: 480, r: 165, strength: 0.88 },
    ]) {
      const g = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, lamp.r);
      g.addColorStop(0, rgba(glow * flick * lamp.strength));
      g.addColorStop(0.42, rgba(glow * 0.3 * lamp.strength));
      g.addColorStop(1, rgba(0));
      ctx.fillStyle = g;
      ctx.fillRect(lamp.x - lamp.r, lamp.y - lamp.r, lamp.r * 2, lamp.r * 2);
    }
  }
  ctx.restore();
}

function drawInkWeight(ctx: CanvasRenderingContext2D, weight: number) {
  if (weight < 0.04) return;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const k = Math.round(255 - weight * 48);
  ctx.fillStyle = `rgb(${k},${Math.max(0, k - 6)},${Math.max(0, k - 14)})`;
  ctx.fillRect(0, 0, 1600, 900);
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, age: number, theme: Theme) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const g = ctx.createRadialGradient(800, 450, 200, 800, 480, 860);
  g.addColorStop(0, "rgba(255,255,255,0.15)");
  g.addColorStop(1, `rgba(90, 60, 40, ${0.18 + age * 0.35})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1600, 900);
  ctx.restore();

  const tile = grainTile();
  ctx.save();
  ctx.globalAlpha = 0.16 + age * 0.22;
  ctx.globalCompositeOperation = "multiply";
  const pat = ctx.createPattern(tile, "repeat");
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, 1600, 900);
  }
  ctx.restore();

  // foxing
  ctx.save();
  ctx.globalAlpha = 0.05 + age * 0.12;
  ctx.fillStyle = "#8a5a32";
  const spots = [
    [120, 80, 18],
    [1480, 140, 12],
    [200, 820, 16],
    [900, 60, 10],
    [1300, 800, 20],
  ];
  for (const [sx, sy, r] of spots) {
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * 0.7, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  void theme;
}

function drawMargin(ctx: CanvasRenderingContext2D, ink: Ink) {
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = ink.lw(1.3);
  ctx.strokeRect(28, 22, 1544, 856);
  ctx.lineWidth = ink.lw(0.6);
  ctx.strokeRect(34, 28, 1532, 844);
  ctx.globalAlpha = 1;

  // seal
  ctx.fillStyle = "#8e3a30";
  ctx.fillRect(64, 800, 34, 34);
  ctx.fillStyle = "#f3ead8";
  ctx.font = `600 ${ink.lw(16)}px "Shippori Mincho", Palatino, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("鏡", 81, 818);

  ctx.save();
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.75;
  ctx.font = `500 ${ink.lw(18)}px "Zen Old Mincho", Palatino, serif`;
  ctx.textAlign = "center";
  const label = "黒鏡";
  for (let i = 0; i < label.length; i++) {
    ctx.fillText(label[i] ?? "", 52, 160 + i * 28);
  }
  ctx.restore();
}

export function hitCharacter(world: World, settings: Settings, sx: number, sy: number): string | null {
  let found: string | null = null;
  for (const ch of [...world.chars].sort((a, b) => a.y - b.y)) {
    const config = settings.chars.find((c) => c.id === ch.id);
    if (!config?.present) continue;
    const bounds = characterHitBounds(ch, config, world);
    if (
      bounds &&
      sx >= bounds.left &&
      sx <= bounds.right &&
      sy >= bounds.top &&
      sy <= bounds.bottom
    ) {
      found = ch.id;
    }
  }
  return found;
}
