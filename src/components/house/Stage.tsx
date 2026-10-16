import { useEffect, useRef } from "react";
import { setAmbience } from "@/ukiyo/audio";
import { clientToWorld, hitCharacter, layoutFor, renderFrame, sheet } from "@/ukiyo/draw";
import { getWorld } from "@/ukiyo/live";
import { stepWorld } from "@/ukiyo/sim";
import { listAssets, setActiveAssets } from "@/ukiyo/assets";
import { useHouse } from "@/ukiyo/store";

export function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hydrate = useHouse((s) => s.hydrate);
  const sound = useHouse((s) => s.sound);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let alive = true;
    listAssets().then((assets) => {
      if (alive) setActiveAssets(assets);
    }).catch(() => {
      if (alive) setActiveAssets([]);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setAmbience(sound);
    return () => setAmbience(false);
  }, [sound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const state = useHouse.getState();
      const world = getWorld();
      if (!state.paused) {
        stepWorld(world, dt, state.settings, {
          setWearing: (id, wearing) => {
            useHouse.getState().patchChar(id, { wearingOuter: wearing });
          },
        });
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const bw = Math.max(1, Math.floor(w * dpr));
        const bh = Math.max(1, Math.floor(h * dpr));
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw;
          canvas.height = bh;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderFrame(ctx, w, h, world, state.settings, state.selected);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    window.__kurokagami = {
      getWorld,
      getSettings: () => useHouse.getState().settings,
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        useHouse.getState().setPaused(!useHouse.getState().paused);
      } else if (e.key === "Escape") {
        useHouse.getState().setPanel(false);
      } else if (e.key === "h" || e.key === "H") {
        const open = useHouse.getState().panel;
        useHouse.getState().setPanel(!open);
      }
    };
    window.addEventListener("keydown", onKey);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const state = useHouse.getState();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const before = clientToWorld(rect.width, rect.height, px, py, state.settings.env.zoom);
      const zoom = Math.min(2.2, Math.max(0.65, state.settings.env.zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
      state.setEnv({ zoom });
      const after = clientToWorld(rect.width, rect.height, px, py, zoom);
      sheet.x += before.x - after.x;
      sheet.y += before.y - after.y;
      sheet.x = Math.min(1500, Math.max(100, sheet.x));
      sheet.y = Math.min(820, Math.max(80, sheet.y));
    };
    let drag: { x: number; y: number; ox: number; oy: number } | null = null;
    const onDown = (e: PointerEvent) => {
      const rect = canvas!.getBoundingClientRect();
      const state = useHouse.getState();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const world = clientToWorld(rect.width, rect.height, px, py, state.settings.env.zoom);
      if (hitCharacter(getWorld(), state.settings, world.x, world.y)) return;
      drag = { x: e.clientX, y: e.clientY, ox: sheet.x, oy: sheet.y };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const rect = canvas!.getBoundingClientRect();
      const lay = layoutFor(rect.width, rect.height);
      const s = lay.scale * useHouse.getState().settings.env.zoom;
      sheet.x = drag.ox - (e.clientX - drag.x) / s;
      sheet.y = drag.oy - (e.clientY - drag.y) / s;
    };
    const onUp = () => {
      drag = null;
    };
    canvas?.addEventListener("wheel", onWheel, { passive: false });
    canvas?.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas?.removeEventListener("wheel", onWheel);
      canvas?.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const pick = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const zoom = useHouse.getState().settings.env.zoom;
    const world = clientToWorld(rect.width, rect.height, clientX - rect.left, clientY - rect.top, zoom);
    const id = hitCharacter(getWorld(), useHouse.getState().settings, world.x, world.y);
    if (id) {
      useHouse.getState().setSelected(id);
      useHouse.getState().setTab("people");
      useHouse.getState().setPanel(true);
      canvas.style.cursor = "pointer";
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none"
      onClick={(e) => pick(e.clientX, e.clientY)}
      onMouseMove={(e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const zoom = useHouse.getState().settings.env.zoom;
        const world = clientToWorld(rect.width, rect.height, e.clientX - rect.left, e.clientY - rect.top, zoom);
        const id = hitCharacter(getWorld(), useHouse.getState().settings, world.x, world.y);
        canvas.style.cursor = id ? "pointer" : "default";
      }}
      aria-label="Kurokagami, a living woodblock interior"
    />
  );
}

declare global {
  interface Window {
    __kurokagami?: {
      getWorld: typeof getWorld;
      getSettings: () => ReturnType<typeof useHouse.getState>["settings"];
    };
  }
}
