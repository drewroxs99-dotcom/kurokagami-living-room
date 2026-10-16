export type AssetEvent = "always" | "sit" | "walk" | "drink" | "smoke" | "manual";

export type CustomAsset = {
  id: string;
  name: string;
  characterId: string | "all";
  event: AssetEvent;
  enabled: boolean;
  image: Blob;
};

const DB_NAME = "kurokagami-assets-v1";
const STORE_NAME = "assets";
const imageCache = new Map<string, HTMLImageElement>();
const objectUrls = new Map<string, string>();
let activeAssets: CustomAsset[] = [];

export function setActiveAssets(assets: CustomAsset[]) {
  activeAssets = assets;
}

export function getActiveAssets() {
  return activeAssets;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser does not support saved artwork."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the artwork library."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Artwork library request failed."));
  });
}

export async function listAssets(): Promise<CustomAsset[]> {
  const db = await openDb();
  try {
    return await requestResult(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll());
  } finally {
    db.close();
  }
}

export async function saveAsset(asset: CustomAsset): Promise<void> {
  const db = await openDb();
  try {
    await requestResult(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(asset));
  } finally {
    db.close();
  }
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await openDb();
  try {
    await requestResult(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(id));
  } finally {
    db.close();
  }
  const url = objectUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(id);
  imageCache.delete(id);
}

export function imageForAsset(asset: CustomAsset): HTMLImageElement {
  let image = imageCache.get(asset.id);
  if (image) return image;
  image = new Image();
  image.decoding = "async";
  const url = URL.createObjectURL(asset.image);
  objectUrls.set(asset.id, url);
  image.src = url;
  imageCache.set(asset.id, image);
  return image;
}

export function assetMatches(asset: CustomAsset, id: string, pose: string): boolean {
  if (!asset.enabled) return false;
  if (asset.characterId !== "all" && asset.characterId !== id) return false;
  if (asset.event === "always") return true;
  if (asset.event === "sit") return pose === "sit";
  if (asset.event === "walk") return pose === "walk";
  return pose === asset.event;
}
