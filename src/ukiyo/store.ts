import { create } from "zustand";
import { getWorld, resetWorld } from "./live";
import { defaultSettings, normalizeSettings } from "./palette";
import type { CharConfig, EnvSettings, Settings, TraitKey } from "./types";

const KEY = "kurokagami-settings-v1";

type HouseState = {
  settings: Settings;
  panel: boolean;
  tab: "room" | "people" | "assets";
  selected: string | null;
  paused: boolean;
  sound: boolean;
  hydrated: boolean;
  hydrate: () => void;
  setEnv: (patch: Partial<EnvSettings>) => void;
  patchChar: (id: string, patch: Partial<CharConfig>) => void;
  setTrait: (id: string, key: TraitKey, value: number) => void;
  setPanel: (open: boolean) => void;
  setTab: (tab: "room" | "people" | "assets") => void;
  setSelected: (id: string | null) => void;
  setPaused: (paused: boolean) => void;
  setSound: (sound: boolean) => void;
  restore: () => void;
};

function persist(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* private mode */
  }
}

function releaseLongWait() {
  const world = getWorld();
  for (const ch of world.chars) {
    const task = ch.queue[0];
    if (task?.kind === "wait" && task.seconds - ch.taskTime > 0.8) {
      ch.queue.shift();
      ch.taskTime = 0;
    }
  }
}

export const useHouse = create<HouseState>((set, get) => ({
  settings: defaultSettings(),
  panel: false,
  tab: "room",
  selected: "komachi",
  paused: false,
  sound: false,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) set({ settings: normalizeSettings(JSON.parse(raw) as unknown), hydrated: true });
      else set({ hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setEnv: (patch) => {
    const settings = { ...get().settings, env: { ...get().settings.env, ...patch } };
    persist(settings);
    if ("activity" in patch || "speed" in patch || "smoke" in patch) releaseLongWait();
    set({ settings });
  },
  patchChar: (id, patch) => {
    const settings = {
      ...get().settings,
      chars: get().settings.chars.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    };
    persist(settings);
    set({ settings });
  },
  setTrait: (id, key, value) => {
    const settings = {
      ...get().settings,
      chars: get().settings.chars.map((c) =>
        c.id === id ? { ...c, traits: { ...c.traits, [key]: value } } : c,
      ),
    };
    persist(settings);
    releaseLongWait();
    set({ settings });
  },
  setPanel: (panel) => set({ panel }),
  setTab: (tab) => set({ tab }),
  setSelected: (selected) => set({ selected }),
  setPaused: (paused) => set({ paused }),
  setSound: (sound) => set({ sound }),
  restore: () => {
    const settings = defaultSettings();
    persist(settings);
    resetWorld(settings);
    set({ settings, selected: "komachi", paused: false });
  },
}));
