import type { PatternId } from "./types";

const tiles = new Map<PatternId, HTMLCanvasElement | null>();

export function patternTile(id: PatternId): HTMLCanvasElement | null {
  if (id === "solid") return null;
  const hit = tiles.get(id);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 96;
  const g = c.getContext("2d");
  if (!g) return null;
  g.clearRect(0, 0, 96, 96);
  g.strokeStyle = "rgba(16,8,6,0.95)";
  g.fillStyle = "rgba(16,8,6,0.95)";
  g.lineWidth = 1.7;
  g.lineJoin = "round";
  g.lineCap = "round";
  if (id === "seigaiha") drawSeigaiha(g);
  else if (id === "asanoha") drawAsanoha(g);
  else if (id === "shima") drawShima(g);
  else if (id === "kikko") drawKikko(g);
  else if (id === "shippo") drawShippo(g);
  else if (id === "kanoko") drawKanoko(g);
  else if (id === "yagasuri") drawYagasuri(g);
  tiles.set(id, c);
  return c;
}

function drawSeigaiha(g: CanvasRenderingContext2D) {
  const r = 16;
  for (let row = -1; row < 5; row++) {
    for (let col = -1; col < 5; col++) {
      const x = col * r * 2 + (row % 2 ? r : 0);
      const y = row * r;
      g.beginPath();
      g.arc(x, y, r * 0.92, Math.PI, 0);
      g.stroke();
      g.beginPath();
      g.arc(x, y, r * 0.62, Math.PI, 0);
      g.stroke();
      g.beginPath();
      g.arc(x, y, r * 0.32, Math.PI, 0);
      g.stroke();
    }
  }
}

function drawAsanoha(g: CanvasRenderingContext2D) {
  const s = 32;
  g.lineWidth = 1.7;
  for (let y = 0; y <= 96; y += s) {
    for (let x = 0; x <= 96; x += s) {
      const cx = x + (Math.floor(y / s) % 2 ? s / 2 : 0);
      const cy = y;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a) * s * 0.5, cy + Math.sin(a) * s * 0.5);
        g.stroke();
      }
    }
  }
}

function drawShima(g: CanvasRenderingContext2D) {
  g.lineWidth = 3.2;
  for (let x = 4; x < 96; x += 16) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 96);
    g.stroke();
  }
}

function drawKikko(g: CanvasRenderingContext2D) {
  const w = 28;
  const h = 24;
  g.lineWidth = 1.5;
  for (let row = -1; row < 6; row++) {
    for (let col = -1; col < 5; col++) {
      const x = col * w + (row % 2 ? w / 2 : 0);
      const y = row * h * 0.75;
      hex(g, x + w / 2, y + h / 2, 13);
      g.stroke();
    }
  }
}

function hex(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

function drawShippo(g: CanvasRenderingContext2D) {
  g.lineWidth = 1.5;
  const s = 32;
  for (let y = 0; y <= 96; y += s) {
    for (let x = 0; x <= 96; x += s) {
      g.beginPath();
      g.arc(x, y, s * 0.48, 0, Math.PI * 2);
      g.stroke();
    }
  }
}

function drawKanoko(g: CanvasRenderingContext2D) {
  for (let y = 8; y < 96; y += 16) {
    for (let x = 8; x < 96; x += 16) {
      g.beginPath();
      g.arc(x, y, 2.4, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function drawYagasuri(g: CanvasRenderingContext2D) {
  g.lineWidth = 1.6;
  const s = 24;
  for (let y = 0; y < 96; y += s) {
    for (let x = 0; x < 96; x += s) {
      g.beginPath();
      g.moveTo(x + 4, y + s - 4);
      g.lineTo(x + s / 2, y + 4);
      g.lineTo(x + s - 4, y + s - 4);
      g.stroke();
      g.beginPath();
      g.moveTo(x + s / 2 - 3, y + 10);
      g.lineTo(x + s / 2 + 3, y + 10);
      g.stroke();
    }
  }
}
