import { defaultSettings } from "./palette";
import { createWorld } from "./sim";
import type { PlanName, Settings, World } from "./types";

let world: World = createWorld(defaultSettings());

export function getWorld(): World {
  return world;
}

export function resetWorld(settings: Settings): World {
  world = createWorld(settings);
  return world;
}

export function injectPlan(id: string, plan: PlanName) {
  world.inject.push({ id, plan });
}
