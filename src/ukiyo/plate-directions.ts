export type PlatePose = "stand" | "walk" | "sit";

// Direction each source plate faces before the renderer flips it.
export const PLATE_FACING: Record<string, Record<PlatePose, 1 | -1>> = {
  komachi: { stand: -1, walk: -1, sit: -1 },
  hanae: { stand: 1, walk: 1, sit: 1 },
  ofuku: { stand: -1, walk: -1, sit: -1 },
  arai: { stand: -1, walk: -1, sit: -1 },
  ume: { stand: -1, walk: 1, sit: 1 },
  kichi: { stand: -1, walk: -1, sit: -1 },
  otsu: { stand: -1, walk: -1, sit: -1 },
  jiro: { stand: 1, walk: 1, sit: 1 },
  saku: { stand: -1, walk: -1, sit: -1 },
  hei: { stand: 1, walk: 1, sit: 1 },
};

export function plateFacing(id: string, pose: PlatePose): 1 | -1 {
  return PLATE_FACING[id]?.[pose] ?? -1;
}

export function plateDrawSign(id: string, pose: PlatePose, facing: 1 | -1): 1 | -1 {
  return facing === plateFacing(id, pose) ? 1 : -1;
}
