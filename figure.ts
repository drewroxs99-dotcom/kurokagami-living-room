import { pigmentHex } from "./palette";
import { patternTile } from "./patterns";
import type { CharConfig, PatternId, PoseName, SimChar, World } from "./types";

const INK = "#1c140f";
const FACE = "#f4eadc";
const FACE_MAN = "#efd3bc";
const HAND = "#f0d2ba";
const TABI = "#f7f1e6";

export type Ink = {
  lw: (px: number) => number;
  mis: number;
  weight: number;
};

/** Depth on the painted floor. Back of the tatami is small; the near mats are larger. */
export function figureScale(feetY: number) {
  const t = Math.min(1, Math.max(0, (feetY - 540) / 320));
  return 0.46 + t * 0.58;
}

/** The hall painting already has perspective, so feet stay on the canvas point. */
export function screenFootX(x: number, _feetY: number) {
  return x;
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

function strokeInk(ctx: CanvasRenderingContext2D, ink: Ink, px = 1.4) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink.lw(px * (0.7 + ink.weight * 0.55));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function fillCloth(
  ctx: CanvasRenderingContext2D,
  color: string,
  pattern: PatternId,
  mis: number,
  tileScale = 0.5,
) {
  if (mis > 0.04) {
    ctx.save();
    ctx.translate(1.7 * mis, -0.35 * mis);
    ctx.globalAlpha *= 0.18 + mis * 0.1;
    ctx.fillStyle = "#6e2438";
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = color;
  ctx.fill();
  const tile = patternTile(pattern);
  if (!tile) return;
  const pat = ctx.createPattern(tile, "repeat");
  if (!pat) return;
  pat.setTransform(new DOMMatrix().scale(tileScale, tileScale));
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = pat;
  ctx.fill();
  ctx.restore();
}

type Pose = {
  man: boolean;
  sit: number;
  walking: boolean;
  step: number;
  sway: number;
  bob: number;
  sleeve: number;
  raise: number;
  shoulderY: number;
  waistY: number;
  hemY: number;
  neckY: number;
  headY: number;
  flare: number;
  sleeveLen: number;
};

function poseOf(ch: SimChar, config: CharConfig, time: number): Pose {
  const man = config.gender === "man";
  const sit = ch.sit;
  const walking = ch.pose === "walk" && sit < 0.2;
  const step = walking ? Math.sin(ch.walkPhase * Math.PI * 2) : 0;
  const idle = Math.sin(time * 0.85 + ch.x * 0.01);
  const sway = walking ? step * 14 : idle * 4.5;
  const bob = walking
    ? -Math.abs(Math.sin(ch.walkPhase * Math.PI * 2)) * 9
    : idle * -1.8;
  const sleeve = walking
    ? Math.sin(ch.walkPhase * Math.PI * 2 - 0.5) * 26
    : Math.sin(time * 1.15 + ch.y * 0.02) * 11;
  const drop = sit * 102;
  return {
    man,
    sit,
    walking,
    step,
    sway,
    bob,
    sleeve,
    raise: ch.raise,
    shoulderY: -232 + drop,
    waistY: -156 + drop * 0.82,
    hemY: -2,
    neckY: -256 + drop * 0.94,
    headY: -312 + drop * 0.9,
    flare: (man ? 36 : 56) + sit * (man ? 8 : 34),
    sleeveLen: (man ? 50 : 76) * (1 - sit * 0.42),
  };
}

export function drawFigure(
  ctx: CanvasRenderingContext2D,
  ch: SimChar,
  config: CharConfig,
  world: World,
  ink: Ink,
  selected: boolean,
) {
  const s = figureScale(ch.y) * config.stature;
  const x = screenFootX(ch.x, ch.y);
  const y = ch.y;
  const p = poseOf(ch, config, world.time);
  const lean =
    (p.walking ? p.step * 0.035 : Math.sin(world.time * 0.55 + ch.y) * 0.012) +
    (ch.pose === "drink" ? -0.04 * ch.raise : 0);

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(28,20,15,0.14)";
  ctx.beginPath();
  ctx.ellipse(0, 6, (p.sit > 0.5 ? 54 : 34) * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = "#8e3a30";
    ctx.lineWidth = ink.lw(1.5);
    ctx.beginPath();
    ctx.ellipse(0, 8, 46 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.scale(s * ch.facing, s);
  ctx.rotate(lean);

  if (p.sit < 0.45) drawFeet(ctx, p, ink);

  ctx.save();
  ctx.translate(p.sway * 0.08, p.bob);

  const wearing = config.hasOuter && config.wearingOuter;
  if (wearing) drawTrain(ctx, p, config, ink);

  const cloth = wearing
    ? { color: pigmentHex(config.outerPigment), pattern: config.outerPattern }
    : { color: pigmentHex(config.pigment), pattern: config.pattern };

  const far = drawSode(ctx, -28, p.shoulderY + 4, sodeAngle(p, -1), p.sleeveLen, p.man ? 26 : 34, cloth, ink);
  cuffLining(ctx, far.x, far.y, config, ink);

  if (p.man) drawHakamaBody(ctx, p, config, ink);
  else drawKosode(ctx, p, config, ink);

  const nearAngle = sodeAngle(p, 1) + liftAngle(p, ch.pose);
  const near = drawSode(ctx, 28, p.shoulderY + 2, nearAngle, p.sleeveLen, p.man ? 24 : 32, cloth, ink);
  cuffLining(ctx, near.x, near.y, config, ink);
  const hand = handPoint(p, ch.pose, near);
  if (p.raise > 0.08 || ch.pose === "gesture" || ch.pose === "reach" || ch.pose === "adjust") {
    drawForearm(ctx, near, hand, ink);
  }
  drawHand(ctx, hand.x, hand.y, ink);

  if (!p.man) drawObi(ctx, p, config, ink);
  else drawManObi(ctx, p, ink);

  if (p.man) drawHaori(ctx, p, ink);

  drawCollar(ctx, p, config, ink);
  drawNeck(ctx, p, ink);

  const headBob = p.walking ? -p.bob * 0.4 : 0;
  ctx.save();
  ctx.translate(p.sway * 0.12, headBob);
  drawHead(ctx, p, config, ch, world, ink);
  ctx.restore();

  drawProp(ctx, ch, config, world, hand, p, ink);

  ctx.restore();
  ctx.restore();

  if (ch.say) {
    const headScreen = y + (p.headY - 48 + p.bob) * s;
    cartouche(ctx, x + ch.facing * 20 * s, headScreen, ch.say.text, ch.say.life, ink);
  }
}

function sodeAngle(p: Pose, side: number) {
  const swing = p.sleeve * 0.011 * side;
  return (side > 0 ? 0.22 : -0.18) + swing;
}

function liftAngle(p: Pose, pose: PoseName) {
  let target = -0.55;
  if (pose === "reach") target = 0.85;
  else if (pose === "adjust") target = -0.95;
  else if (pose === "gesture") target = -0.4;
  else if (pose === "smoke" || pose === "drink") target = -0.7;
  const k =
    pose === "gesture" ? 0.65 + Math.sin(p.raise * 6) * 0.2 : Math.min(1, Math.max(0, p.raise));
  if (pose === "stand" || pose === "walk" || pose === "sit") return 0;
  return target * k;
}

function pointOn(x: number, y: number, angle: number, length: number) {
  return { x: x + Math.sin(angle) * length, y: y + Math.cos(angle) * length };
}

function handPoint(p: Pose, pose: PoseName, opening: { x: number; y: number }) {
  let aim = { x: 10, y: p.headY + 34 };
  if (pose === "adjust") aim = { x: 2, y: p.neckY + 18 };
  else if (pose === "reach") aim = { x: 88, y: p.shoulderY + 8 };
  else if (pose === "gesture") aim = { x: 54, y: p.waistY - 6 };
  else if (pose === "smoke") aim = { x: 16, y: p.headY + 30 };
  const k =
    pose === "stand" || pose === "walk" || pose === "sit"
      ? 0
      : pose === "gesture"
        ? 0.7
        : Math.min(1, Math.max(0, p.raise));
  return {
    x: opening.x + (aim.x - opening.x) * k,
    y: opening.y + (aim.y - opening.y) * k,
  };
}

function drawSode(
  ctx: CanvasRenderingContext2D,
  pivotX: number,
  pivotY: number,
  angle: number,
  length: number,
  width: number,
  cloth: { color: string; pattern: PatternId },
  ink: Ink,
) {
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-width * 0.22, 2);
  ctx.lineTo(-width * 0.5, length * 0.22);
  ctx.lineTo(-width * 0.55, length);
  ctx.quadraticCurveTo(0, length + 7, width * 0.55, length);
  ctx.lineTo(width * 0.42, length * 0.16);
  ctx.closePath();
  fillCloth(ctx, cloth.color, cloth.pattern, ink.mis, 0.11);
  strokeInk(ctx, ink, 1.35);
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(-width * 0.08, length * 0.92);
  ctx.strokeStyle = "rgba(28,20,15,0.35)";
  ctx.lineWidth = ink.lw(0.8);
  ctx.stroke();
  ctx.restore();
  return pointOn(pivotX, pivotY, angle, length * 0.92);
}

function drawForearm(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  ink: Ink,
) {
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const nx = Math.cos(ang + Math.PI / 2) * 3.2;
  const ny = Math.sin(ang + Math.PI / 2) * 3.2;
  ctx.beginPath();
  ctx.moveTo(from.x + nx, from.y + ny);
  ctx.lineTo(to.x + nx, to.y + ny);
  ctx.lineTo(to.x - nx, to.y - ny);
  ctx.lineTo(from.x - nx, from.y - ny);
  ctx.closePath();
  ctx.fillStyle = HAND;
  ctx.fill();
  strokeInk(ctx, ink, 0.85);
}

function cuffLining(ctx: CanvasRenderingContext2D, x: number, y: number, config: CharConfig, ink: Ink) {
  ctx.fillStyle = pigmentHex(config.lining);
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 9, 5.5, 0.5, 0, Math.PI * 2);
  ctx.fill();
  strokeInk(ctx, ink, 0.9);
}

function drawTrain(ctx: CanvasRenderingContext2D, p: Pose, config: CharConfig, ink: Ink) {
  const hem = p.hemY + 18 - p.sit * 10;
  const inner = p.hemY + 4;
  ctx.beginPath();
  ctx.moveTo(-p.flare - 4, p.waistY + 6);
  ctx.lineTo(-p.flare - 22, hem);
  ctx.quadraticCurveTo(0, hem + 14, p.flare + 26, hem - 2);
  ctx.lineTo(p.flare + 2, p.waistY + 8);
  ctx.lineTo(p.flare * 0.55, inner);
  ctx.quadraticCurveTo(0, inner + 10, -p.flare * 0.55, inner);
  ctx.closePath();
  fillCloth(ctx, pigmentHex(config.outerPigment), config.outerPattern, ink.mis, 0.11);
  strokeInk(ctx, ink, 1.25);
}

function drawKosode(ctx: CanvasRenderingContext2D, p: Pose, config: CharConfig, ink: Ink) {
  const l = -p.flare - p.sway;
  const r = p.flare + 8 - p.sway * 0.35;
  const hem = p.hemY;
  ctx.beginPath();
  ctx.moveTo(-16, p.neckY + 8);
  ctx.lineTo(-32, p.shoulderY + 8);
  ctx.quadraticCurveTo(-38, p.waistY, l, hem);
  ctx.quadraticCurveTo(-10, hem + 16 + p.sit * 8, r, hem + 3);
  ctx.quadraticCurveTo(40, p.waistY, 30, p.shoulderY + 6);
  ctx.lineTo(12, p.neckY + 10);
  ctx.closePath();
  fillCloth(ctx, pigmentHex(config.pigment), config.pattern, ink.mis, 0.11);
  strokeInk(ctx, ink, 1.55);

  ctx.beginPath();
  ctx.moveTo(0, p.neckY + 16);
  ctx.quadraticCurveTo(12 + p.sway * 0.15, p.waistY, 8 + p.sway * 0.2, hem + 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink.lw(1.15);
  ctx.stroke();

  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(-10, p.waistY + 8);
  ctx.quadraticCurveTo(-18, (p.waistY + hem) / 2, l * 0.45, hem - 2);
  ctx.moveTo(16, p.waistY + 6);
  ctx.quadraticCurveTo(22, (p.waistY + hem) / 2, r * 0.55, hem);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (p.sit < 0.65) {
    ctx.fillStyle = "#f7f1e6";
    ctx.beginPath();
    ctx.moveTo(-8, hem - 2);
    ctx.lineTo(0, hem + 12);
    ctx.lineTo(10, hem - 1);
    ctx.closePath();
    ctx.fill();
    strokeInk(ctx, ink, 0.8);
  }
}

function drawHakamaBody(ctx: CanvasRenderingContext2D, p: Pose, config: CharConfig, ink: Ink) {
  ctx.beginPath();
  ctx.moveTo(-18, p.neckY + 6);
  ctx.lineTo(-34, p.shoulderY + 10);
  ctx.lineTo(-32, p.waistY + 8);
  ctx.lineTo(30, p.waistY + 6);
  ctx.lineTo(32, p.shoulderY + 8);
  ctx.lineTo(14, p.neckY + 8);
  ctx.closePath();
  fillCloth(ctx, pigmentHex(config.pigment), config.pattern, ink.mis, 0.11);
  strokeInk(ctx, ink, 1.45);

  const top = p.waistY + 4;
  const bot = p.hemY + 2;
  const spread = 8 + p.step * 6;
  ctx.beginPath();
  ctx.moveTo(-36, top);
  ctx.lineTo(-44 - spread, bot);
  ctx.lineTo(-4, bot + 4);
  ctx.lineTo(-6, top + 6);
  ctx.closePath();
  ctx.moveTo(6, top + 4);
  ctx.lineTo(6, bot + 4);
  ctx.lineTo(46 + p.step * 4, bot);
  ctx.lineTo(34, top);
  ctx.closePath();
  ctx.fillStyle = mix(pigmentHex(config.pigment), "#1a120e", 0.28);
  ctx.fill();
  strokeInk(ctx, ink, 1.25);

  ctx.strokeStyle = "rgba(243,232,214,0.4)";
  ctx.lineWidth = ink.lw(0.8);
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = side * (10 + i * 10);
      ctx.moveTo(x, top + 8);
      ctx.lineTo(x + side * p.step * 2, bot);
    }
  }
  ctx.stroke();
}

function drawObi(ctx: CanvasRenderingContext2D, p: Pose, config: CharConfig, ink: Ink) {
  const y = p.waistY - 2;
  ctx.beginPath();
  ctx.moveTo(-38, y);
  ctx.quadraticCurveTo(0, y + 8, 40, y - 2);
  ctx.lineTo(38, y + 26);
  ctx.quadraticCurveTo(0, y + 36, -36, y + 24);
  ctx.closePath();
  ctx.fillStyle = pigmentHex(config.obi);
  ctx.fill();
  strokeInk(ctx, ink, 1.15);

  const bow = config.frontObi ? 34 : -46;
  ctx.beginPath();
  ctx.moveTo(bow - 6, y + 4);
  ctx.lineTo(bow + 14, y - 12);
  ctx.lineTo(bow + 18, y + 16);
  ctx.lineTo(bow - 4, y + 18);
  ctx.closePath();
  ctx.fill();
  strokeInk(ctx, ink, 1);
  ctx.beginPath();
  ctx.moveTo(bow + 2, y - 2);
  ctx.lineTo(bow + 22, y - 16 - p.sit * 2);
  ctx.lineTo(bow + 16, y + 8);
  ctx.closePath();
  ctx.fill();
  strokeInk(ctx, ink, 0.95);
}

function drawManObi(ctx: CanvasRenderingContext2D, p: Pose, ink: Ink) {
  ctx.fillStyle = "#2a211c";
  ctx.fillRect(-32, p.waistY - 2, 64, 12);
  strokeInk(ctx, ink, 0.9);
}

function drawHaori(ctx: CanvasRenderingContext2D, p: Pose, ink: Ink) {
  const drawPanel = (sign: number) => {
    ctx.beginPath();
    ctx.moveTo(sign * 4, p.shoulderY + 2);
    ctx.lineTo(sign * 36, p.shoulderY + 16);
    ctx.lineTo(sign * 30, p.waistY + 4);
    ctx.lineTo(sign * 8, p.waistY);
    ctx.closePath();
    ctx.fillStyle = "#241c18";
    ctx.fill();
    strokeInk(ctx, ink, 1.15);
  };
  drawPanel(-1);
  drawPanel(1);
  const my = (p.shoulderY + p.waistY) / 2;
  ctx.strokeStyle = "#e7dcc6";
  ctx.lineWidth = ink.lw(1.1);
  ctx.beginPath();
  ctx.arc(-22, my, 6, 0, Math.PI * 2);
  ctx.moveTo(-22, my - 3.5);
  ctx.lineTo(-22, my + 3.5);
  ctx.moveTo(-25.5, my);
  ctx.lineTo(-18.5, my);
  ctx.stroke();
}

function drawCollar(ctx: CanvasRenderingContext2D, p: Pose, config: CharConfig, ink: Ink) {
  ctx.beginPath();
  ctx.moveTo(-2, p.neckY + 2);
  ctx.lineTo(-18, p.shoulderY + 36);
  ctx.lineTo(-8, p.shoulderY + 44);
  ctx.lineTo(1, p.neckY + 20);
  ctx.lineTo(14, p.shoulderY + 46);
  ctx.lineTo(22, p.shoulderY + 34);
  ctx.closePath();
  ctx.fillStyle = "#f7f3ea";
  ctx.fill();
  strokeInk(ctx, ink, 1.05);

  ctx.strokeStyle = pigmentHex(config.lining);
  ctx.lineWidth = ink.lw(1.3);
  ctx.beginPath();
  ctx.moveTo(-1, p.neckY + 8);
  ctx.lineTo(-13, p.shoulderY + 34);
  ctx.moveTo(3, p.neckY + 8);
  ctx.lineTo(16, p.shoulderY + 36);
  ctx.stroke();

  ctx.strokeStyle = INK;
  ctx.lineWidth = ink.lw(1);
  ctx.beginPath();
  ctx.moveTo(-2, p.neckY + 6);
  ctx.lineTo(-15, p.shoulderY + 36);
  ctx.moveTo(4, p.neckY + 6);
  ctx.lineTo(18, p.shoulderY + 36);
  ctx.stroke();
}

function drawNeck(ctx: CanvasRenderingContext2D, p: Pose, ink: Ink) {
  ctx.fillStyle = p.man ? "#e7cbb6" : "#f3e0d0";
  ctx.beginPath();
  ctx.moveTo(-7, p.neckY + 4);
  ctx.quadraticCurveTo(0, p.neckY + 28, 9, p.shoulderY + 6);
  ctx.lineTo(3, p.shoulderY + 2);
  ctx.quadraticCurveTo(-2, p.neckY + 22, -2, p.neckY + 6);
  ctx.closePath();
  ctx.fill();
  strokeInk(ctx, ink, 0.85);
}

function drawFeet(ctx: CanvasRenderingContext2D, p: Pose, ink: Ink) {
  const stride = p.walking ? 20 : 5;
  const liftL = p.walking ? Math.max(0, p.step) * 11 : 0;
  const liftR = p.walking ? Math.max(0, -p.step) * 11 : 0;
  const feet = [
    { x: -10 - p.step * stride, lift: liftL },
    { x: 14 + p.step * stride, lift: liftR },
  ];
  for (const foot of feet) {
    const fy = -foot.lift;
    ctx.fillStyle = TABI;
    ctx.beginPath();
    ctx.ellipse(foot.x, fy - 2, 8, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    strokeInk(ctx, ink, 0.85);
    ctx.strokeStyle = INK;
    ctx.lineWidth = ink.lw(0.7);
    ctx.beginPath();
    ctx.moveTo(foot.x - 1, fy - 5);
    ctx.lineTo(foot.x - 1, fy + 1);
    ctx.stroke();
    if (p.man) {
      ctx.fillStyle = "#2a211c";
      ctx.fillRect(foot.x - 7, fy + 1, 14, 3.2);
    }
  }
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  p: Pose,
  config: CharConfig,
  ch: SimChar,
  world: World,
  ink: Ink,
) {
  const y = p.headY;
  const hairSway = Math.sin(world.time * 1.2 + ch.x * 0.01) * (p.walking ? 3.5 : 1.4);

  if (p.man) drawChonmage(ctx, y, hairSway, ink);
  else drawWomanHairBack(ctx, config, y, hairSway, ink);

  ctx.fillStyle = p.man ? FACE_MAN : FACE;
  ctx.beginPath();
  ctx.ellipse(6, y + 10, p.man ? 26 : 29, p.man ? 36 : 40, 0.01, 0, Math.PI * 2);
  ctx.fill();
  if (ink.mis > 0.08) {
    ctx.save();
    ctx.translate(1.1 * ink.mis, 0);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#f0c8c4";
    ctx.beginPath();
    ctx.ellipse(6, y + 10, p.man ? 26 : 29, p.man ? 36 : 40, 0.01, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  strokeInk(ctx, ink, 1.35);

  if (p.man) drawPate(ctx, y, ink);
  else drawBangs(ctx, config, y, hairSway, ink);

  if (!p.man) ornament(ctx, config, y, hairSway, ink);

  const blink = (world.time * (config.drinkStyle === "sleepy" ? 0.7 : 1) + ch.x * 0.01) % 5.2;
  let open = blink < 0.14 ? 0.12 : 1;
  if (ch.tox > 0.2) open *= config.drinkStyle === "sleepy" ? 1 - ch.tox * 0.65 : 1 - ch.tox * 0.2;
  const talk = ch.say ? Math.abs(Math.sin(world.time * 7)) : 0;

  drawBrows(ctx, config, y, ink);
  bijinEye(ctx, 1, y - 4, open, ink, false);
  bijinEye(ctx, 17, y - 3, open, ink, false);

  ctx.strokeStyle = INK;
  ctx.lineWidth = ink.lw(0.9);
  ctx.beginPath();
  ctx.moveTo(11, y + 10);
  ctx.quadraticCurveTo(15, y + 16, 11, y + 18);
  ctx.stroke();

  const lip = 0.3 + config.lip * 0.7;
  ctx.fillStyle = `rgba(142, 42, 48, ${0.4 + lip * 0.55})`;
  ctx.beginPath();
  ctx.ellipse(11, y + 26, 3.6 + config.lip * 0.8, 1.4 + talk * 1.2 + config.lip * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!p.man) {
    ctx.strokeStyle = "#8e3038";
    ctx.lineWidth = ink.lw(0.7);
    ctx.beginPath();
    ctx.moveTo(8, y + 21);
    ctx.quadraticCurveTo(12, y + 19.2, 16, y + 21);
    ctx.stroke();
  }

  const flush = config.blush + ch.tox * 0.8;
  if (flush > 0.04) {
    ctx.fillStyle = `rgba(176, 72, 78, ${0.12 + flush * 0.28})`;
    ctx.beginPath();
    ctx.ellipse(-2, y + 14, 8, 4.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(24, y + 15, 7, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (config.beautyMark) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(22, y + 18, 1.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWomanHairBack(
  ctx: CanvasRenderingContext2D,
  config: CharConfig,
  y: number,
  sway: number,
  ink: Ink,
) {
  ctx.fillStyle = "#14110f";
  if (config.hair === "marumage") {
    ctx.beginPath();
    ctx.ellipse(-6 + sway, y - 32, 24, 14, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-10 + sway, y - 22, 16, 10, 0.1, 0, Math.PI * 2);
    ctx.fill();
    strokeInk(ctx, ink, 1);
    return;
  }
  const crush = config.hair === "tsubushi" ? 12 : 0;
  ctx.beginPath();
  ctx.ellipse(-2 + sway * 0.3, y - 40 + crush, 18, 20 - crush * 0.15, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10 + sway, y - 34 + crush, 14, 13, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4 + sway * 0.5, y - 48 + crush, 12, 10, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0c0a09";
  ctx.lineWidth = ink.lw(1.8);
  ctx.beginPath();
  ctx.moveTo(-4 + sway * 0.2, y - 50 + crush);
  ctx.quadraticCurveTo(2, y - 38 + crush, 12 + sway, y - 44 + crush);
  ctx.stroke();
}

function drawBangs(
  ctx: CanvasRenderingContext2D,
  config: CharConfig,
  y: number,
  sway: number,
  ink: Ink,
) {
  ctx.fillStyle = "#14110f";
  const crown = config.hair === "marumage" ? 28 : config.hair === "tsubushi" ? 30 : 38;
  ctx.beginPath();
  ctx.moveTo(-20, y - 2);
  ctx.quadraticCurveTo(-8, y - crown, 10, y - crown - 4);
  ctx.quadraticCurveTo(32, y - crown + 8, 32, y + 2);
  ctx.quadraticCurveTo(22, y - 12, 12, y - 8);
  ctx.quadraticCurveTo(2, y - 22, -8, y - 10);
  ctx.quadraticCurveTo(-16, y - 12, -20, y - 2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(22, y - 2);
  ctx.quadraticCurveTo(36 + sway, y + 16, 28 + sway * 0.5, y + 40);
  ctx.quadraticCurveTo(20, y + 18, 16, y);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-12, y);
  ctx.quadraticCurveTo(-24 - sway * 0.4, y + 18, -14, y + 36);
  ctx.quadraticCurveTo(-6, y + 16, -4, y + 2);
  ctx.closePath();
  ctx.fill();
  strokeInk(ctx, ink, 1.05);
}

function drawChonmage(ctx: CanvasRenderingContext2D, y: number, sway: number, ink: Ink) {
  ctx.fillStyle = "#16120f";
  ctx.beginPath();
  ctx.ellipse(-2, y - 8, 26, 28, 0, Math.PI * 0.05, Math.PI * 0.95);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2 + sway, y - 34, 8, 11, 0.5, 0, Math.PI * 2);
  ctx.fill();
  strokeInk(ctx, ink, 1);
}

function drawPate(ctx: CanvasRenderingContext2D, y: number, ink: Ink) {
  ctx.fillStyle = FACE_MAN;
  ctx.beginPath();
  ctx.ellipse(4, y - 16, 14, 11, 0, Math.PI, 0, true);
  ctx.fill();
  ctx.fillStyle = "#16120f";
  ctx.beginPath();
  ctx.moveTo(-16, y - 4);
  ctx.quadraticCurveTo(-6, y - 26, 8, y - 24);
  ctx.quadraticCurveTo(22, y - 20, 28, y);
  ctx.quadraticCurveTo(8, y - 14, -16, y - 4);
  ctx.fill();
  strokeInk(ctx, ink, 1);
}

function drawBrows(ctx: CanvasRenderingContext2D, config: CharConfig, y: number, ink: Ink) {
  const high = config.brow === "hikimayu";
  const by = y - (high ? 18 : 12);
  ctx.strokeStyle = high ? "#3a2a28" : INK;
  ctx.lineWidth = ink.lw(high ? 1.15 : 1.7);
  ctx.beginPath();
  if (high) {
    ctx.moveTo(-6, by);
    ctx.quadraticCurveTo(2, by - 3, 10, by + 1);
    ctx.moveTo(14, by + 1);
    ctx.quadraticCurveTo(22, by - 3, 30, by + 2);
  } else {
    ctx.moveTo(-4, by + 2);
    ctx.quadraticCurveTo(4, by - 3, 12, by + 1);
    ctx.moveTo(16, by + 1);
    ctx.quadraticCurveTo(24, by - 2, 30, by + 3);
  }
  ctx.stroke();
}

function bijinEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  open: number,
  ink: Ink,
  flip: boolean,
) {
  const s = flip ? -1 : 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink.lw(2.15);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, y + 1.5);
  ctx.quadraticCurveTo(x - 1 * s, y - 6.5 * open, x + 10 * s, y + 1);
  ctx.stroke();
  if (open > 0.35) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(x + 1.5 * s, y - 0.4 * open, 1.6, 2.1 * open, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fffaf4";
    ctx.fillRect(x + 0.4 * s, y - 1.6 * open, 1.3, 1.3);
    ctx.strokeStyle = "#9a3040";
    ctx.lineWidth = ink.lw(1.25);
    ctx.beginPath();
    ctx.moveTo(x + 8 * s, y + 0.5);
    ctx.lineTo(x + 13 * s, y + 3);
    ctx.stroke();
  }
}

function ornament(
  ctx: CanvasRenderingContext2D,
  config: CharConfig,
  y: number,
  sway: number,
  ink: Ink,
) {
  if (config.ornament === "none") return;
  const x = (config.hair === "marumage" ? -16 : 2) + sway;
  const oy = y - (config.hair === "marumage" ? 36 : 48);
  if (config.ornament === "flower") {
    ctx.fillStyle = "#8e3a30";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 5, oy + Math.sin(a) * 5, 3.2, 2, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#c4a15a";
    ctx.beginPath();
    ctx.arc(x, oy, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (config.ornament === "comb") {
    ctx.strokeStyle = "#c4a15a";
    ctx.lineWidth = ink.lw(1.5);
    ctx.beginPath();
    ctx.arc(x - 4, oy + 6, 11, Math.PI, 0);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#c4a15a";
    ctx.lineWidth = ink.lw(1.4);
    ctx.beginPath();
    ctx.moveTo(x - 18, oy + 8);
    ctx.lineTo(x + 16, oy - 2);
    ctx.stroke();
    ctx.fillStyle = "#8e3a30";
    ctx.beginPath();
    ctx.arc(x + 16, oy - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, ink: Ink) {
  ctx.fillStyle = HAND;
  ctx.beginPath();
  ctx.ellipse(x, y, 6.2, 7.4, 0.35, 0, Math.PI * 2);
  ctx.fill();
  strokeInk(ctx, ink, 0.9);
  ctx.strokeStyle = "rgba(28,20,15,0.45)";
  ctx.lineWidth = ink.lw(0.55);
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 2);
  ctx.lineTo(x - 2, y + 4);
  ctx.moveTo(x + 1.4, y - 3);
  ctx.lineTo(x + 1.4, y + 4);
  ctx.stroke();
}

function drawProp(
  ctx: CanvasRenderingContext2D,
  ch: SimChar,
  config: CharConfig,
  world: World,
  hand: { x: number; y: number },
  p: Pose,
  ink: Ink,
) {
  if (ch.hold === "cup") {
    const atMouth = p.raise > 0.72;
    drawSakeCup(ctx, atMouth ? 16 : hand.x + 8, atMouth ? p.headY + 26 : hand.y + 2, ink);
  }
  if (ch.hold === "pipe") {
    const atMouth = ch.pose === "smoke";
    drawKiseru(ctx, atMouth ? 20 : hand.x + 6, atMouth ? p.headY + 24 : hand.y, atMouth ? -0.9 : -0.35, ink);
    if (atMouth) smokeWisps(ctx, 30, p.headY + 10, world.time, ink);
  }
  if (ch.hold === "fan" && ch.pose !== "drink" && ch.pose !== "smoke" && p.raise < 0.45) {
    drawSensu(ctx, hand.x + 4, hand.y - 2, world.time, p.walking, ink);
  }
  void config;
}

function drawSakeCup(ctx: CanvasRenderingContext2D, x: number, y: number, ink: Ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#f4efe4";
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.lineTo(-7, -6);
  ctx.lineTo(7, -6);
  ctx.lineTo(9, 2);
  ctx.closePath();
  ctx.fill();
  strokeInk(ctx, ink, 0.95);
  ctx.fillStyle = "#8e3a30";
  ctx.fillRect(-6, -5, 12, 2.4);
  ctx.restore();
}

function drawKiseru(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  ink: Ink,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = "#3a2e24";
  ctx.lineWidth = ink.lw(1.5);
  ctx.beginPath();
  ctx.moveTo(-18, 2);
  ctx.quadraticCurveTo(0, -2, 20, -6);
  ctx.stroke();
  ctx.fillStyle = "#c4a15a";
  ctx.beginPath();
  ctx.ellipse(22, -7, 4, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
  strokeInk(ctx, ink, 0.7);
  ctx.restore();
}

function smokeWisps(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, ink: Ink) {
  ctx.save();
  ctx.strokeStyle = "rgba(50,44,38,0.4)";
  ctx.lineWidth = ink.lw(1);
  for (let i = 0; i < 3; i++) {
    const o = (time * 0.85 + i * 0.65) % 2;
    ctx.globalAlpha = 1 - o / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 8 + i * 3, y - 14 - o * 16, x + Math.sin(time + i) * 8, y - 28 - o * 18);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSensu(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  walking: boolean,
  ink: Ink,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.7 + Math.sin(time * (walking ? 2.4 : 1.3)) * (walking ? 0.16 : 0.1));
  ctx.fillStyle = "#f6f0e4";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 30, -1.15, 0.45);
  ctx.closePath();
  ctx.fill();
  strokeInk(ctx, ink, 1);
  ctx.strokeStyle = "#8e3a30";
  ctx.lineWidth = ink.lw(0.7);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -1.15 + (i / 5) * 1.6;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30);
  }
  ctx.stroke();
  ctx.restore();
}

export function cartouche(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  life: number,
  ink: Ink,
) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, life * 1.4) * (life > 4.2 ? Math.max(0, 5 - life) : 1);
  ctx.font = `${Math.max(12, ink.lw(13))}px "Shippori Mincho", Palatino, serif`;
  const width = Math.min(300, ctx.measureText(text).width + 28);
  const h = 34;
  let left = x - width / 2;
  if (left < 48) left = 48;
  if (left + width > 1552) left = 1552 - width;
  const top = Math.max(36, y - h);
  ctx.fillStyle = "rgba(243, 234, 216, 0.94)";
  ctx.fillRect(left, top, width, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink.lw(1);
  ctx.strokeRect(left, top, width, h);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, left + width / 2, top + h / 2 + 1);
  ctx.restore();
}
