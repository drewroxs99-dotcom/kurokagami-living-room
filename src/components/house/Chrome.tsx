import { useEffect, useState, type ReactNode } from "react";
import { Pause, Play, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { getWorld, injectPlan } from "@/ukiyo/live";
import { activityLine } from "@/ukiyo/sim";
import {
  PATTERNS,
  PIGMENTS,
  THEMES,
  TRAIT_LABELS,
  hourName,
  pigmentHex,
  roleLabel,
} from "@/ukiyo/palette";
import { useHouse } from "@/ukiyo/store";
import { sheet } from "@/ukiyo/draw";
import type { DrinkStyle, PatternId } from "@/ukiyo/types";
import { deleteAsset, listAssets, saveAsset, setActiveAssets, type AssetEvent, type CustomAsset } from "@/ukiyo/assets";

export function Chrome() {
  const panel = useHouse((s) => s.panel);
  const paused = useHouse((s) => s.paused);
  const sound = useHouse((s) => s.sound);
  const setPanel = useHouse((s) => s.setPanel);
  const setPaused = useHouse((s) => s.setPaused);
  const setSound = useHouse((s) => s.setSound);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  const selected = useHouse((s) => s.selected);
  const settings = useHouse((s) => s.settings);
  const focus = settings.chars.find((c) => c.id === selected) ?? settings.chars[0];
  const world = getWorld();
  const line = focus ? activityLine(world, settings, focus.id) : "";

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-50 px-2 pt-2 sm:px-4">
        <div className="ink-scroll flex items-center gap-3 pr-1 pl-5">
          <h1 className="shrink-0 font-display text-lg tracking-widest text-ink sm:text-xl">虚ろな家</h1>
          <span className="h-4 w-px shrink-0 bg-ink/35" aria-hidden />
          <p className="min-w-0 flex-1 truncate font-body text-sm tracking-wide text-ink">{line}</p>
          <div className="pointer-events-auto flex shrink-0 items-center">
            <IconButton label={sound ? "Silence the room" : "Room tone"} onClick={() => setSound(!sound)}>
              {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </IconButton>
            <IconButton label={paused ? "Continue" : "Hold still"} onClick={() => setPaused(!paused)}>
              {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
            </IconButton>
            <button
              type="button"
              className="flex size-11 items-center justify-center bg-vermilion text-sm text-paper"
              onClick={() => setPanel(!panel)}
              aria-label={panel ? "Close the house" : "Open the house"}
            >
              {panel ? "閉" : "家"}
            </button>
          </div>
        </div>
      </header>

      {paused ? (
        <p className="pointer-events-none absolute bottom-4 left-4 z-30 bg-paper px-3 py-2 font-display text-sm text-ink">
          Still
        </p>
      ) : null}

      {panel ? <Panel /> : null}
    </>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center text-ink"
    >
      {children}
    </button>
  );
}

function Panel() {
  const tab = useHouse((s) => s.tab);
  const setTab = useHouse((s) => s.setTab);
  const setPanel = useHouse((s) => s.setPanel);
  const settings = useHouse((s) => s.settings);
  const setEnv = useHouse((s) => s.setEnv);
  const restore = useHouse((s) => s.restore);
  const world = getWorld();

  return (
    <aside className="paper-scroll absolute inset-x-0 bottom-0 z-40 flex h-3/4 flex-col border-t border-line sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-96 sm:border-t-0 sm:border-l">
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div>
          <p className="font-display text-2xl leading-none tracking-widest text-ink">虚ろな家</p>
          <p className="mt-2 text-sm text-ink-soft">It keeps its own hours, whether or not you watch.</p>
        </div>
        <button
          type="button"
          aria-label="Close the house"
          onClick={() => setPanel(false)}
          className="flex size-11 items-center justify-center text-ink"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex gap-4 px-4">
        <TabButton active={tab === "room"} onClick={() => setTab("room")}>
          Room
        </TabButton>
        <TabButton active={tab === "people"} onClick={() => setTab("people")}>
          Household
        </TabButton>
        <TabButton active={tab === "assets"} onClick={() => setTab("assets")}>
          Artwork
        </TabButton>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-4 pb-6">
        {tab === "room" ? (
          <div className="flex flex-col gap-5">
            <fieldset>
              <legend className="mb-2 text-xs tracking-wide text-muted">Pigment of the hour</legend>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setEnv({ theme: theme.id })}
                    className={
                      "min-h-11 border px-2 text-left text-sm " +
                      (settings.env.theme === theme.id
                        ? "border-vermilion bg-paper-2 text-ink"
                        : "border-line text-ink-soft")
                    }
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <Slider
              label="Zoom"
              hint="Scroll the sheet, or drag the mats"
              min={0.65}
              max={2.2}
              step={0.05}
              value={settings.env.zoom}
              onChange={(zoom) => {
                sheet.x = 800;
                sheet.y = 450;
                setEnv({ zoom });
              }}
            />
            <Slider
              label="Hour"
              hint={hourName(settings.env.hour)}
              value={settings.env.hour}
              onChange={(hour) => setEnv({ hour })}
            />
            <Slider
              label="Lantern"
              hint={settings.env.lantern > 0.66 ? "Bright" : settings.env.lantern > 0.33 ? "Warm" : "Low"}
              value={settings.env.lantern}
              onChange={(lantern) => setEnv({ lantern })}
            />
            <Swatches
              label="Lantern paper"
              value={settings.env.lanternPaper}
              onChange={(lanternPaper) => setEnv({ lanternPaper })}
            />
            <Swatches
              label="Cushion dye"
              value={settings.env.wood}
              onChange={(wood) => setEnv({ wood })}
            />
            <Swatches
              label="Tea glaze"
              value={settings.env.glaze}
              onChange={(glaze) => setEnv({ glaze })}
            />
            <Slider
              label="How inhabited"
              hint={settings.env.activity > 0.66 ? "Lively" : settings.env.activity > 0.33 ? "Ordinary" : "Quiet"}
              value={settings.env.activity}
              onChange={(activity) => setEnv({ activity })}
            />

            <div>
              <p className="mb-2 text-xs tracking-wide text-muted">Time’s pace</p>
              <div className="grid grid-cols-4 gap-2">
                {[0.5, 1, 2, 4].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setEnv({ speed })}
                    className={
                      "min-h-11 border text-sm " +
                      (settings.env.speed === speed
                        ? "border-vermilion bg-paper-2 text-ink"
                        : "border-line text-ink-soft")
                    }
                  >
                    {speed === 0.5 ? "½" : `${speed}×`}
                  </button>
                ))}
              </div>
            </div>

            <Slider
              label="Paper age"
              value={settings.env.paperAge}
              onChange={(paperAge) => setEnv({ paperAge })}
            />
            <Slider
              label="Ink weight"
              value={settings.env.inkWeight}
              onChange={(inkWeight) => setEnv({ inkWeight })}
            />
            <Slider
              label="Misregistration"
              hint="The blocks drift"
              value={settings.env.misregister}
              onChange={(misregister) => setEnv({ misregister })}
            />

            <label className="flex flex-col gap-2">
              <span className="text-xs tracking-wide text-muted">Screen and cushion pattern</span>
              <select
                className="min-h-11 border border-line bg-paper-2 px-2 text-sm text-ink"
                value={settings.env.screen}
                onChange={(e) => setEnv({ screen: e.target.value as PatternId })}
              >
                {PATTERNS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <Toggle
              label="Kiseru smoke"
              on={settings.env.smoke}
              onClick={() => setEnv({ smoke: !settings.env.smoke })}
            />
            <Toggle
              label="Drifting petals"
              on={settings.env.petals}
              onClick={() => setEnv({ petals: !settings.env.petals })}
            />
            <Toggle
              label="Cat and dog"
              on={settings.env.animals}
              onClick={() => setEnv({ animals: !settings.env.animals })}
            />

            <fieldset>
              <legend className="mb-2 text-xs tracking-wide text-muted">Who is in the room</legend>
              <div className="flex flex-col gap-2">
                {settings.chars.map((c) => (
                  <Toggle
                    key={c.id}
                    label={c.name}
                    on={c.present}
                    onClick={() => useHouse.getState().patchChar(c.id, { present: !c.present })}
                  />
                ))}
              </div>
            </fieldset>

            <button type="button" className="min-h-11 border border-ink text-sm text-ink" onClick={restore}>
              Restore the first hour
            </button>
          </div>
        ) : tab === "people" ? (
          <People />
        ) : (
          <ArtworkLibrary />
        )}
      </div>
    </aside>
  );
}

const ASSET_EVENTS: { id: AssetEvent; label: string }[] = [
  { id: "always", label: "Always" },
  { id: "sit", label: "Sitting" },
  { id: "walk", label: "Walking" },
  { id: "drink", label: "Drinking" },
  { id: "smoke", label: "Smoking" },
  { id: "manual", label: "Manual" },
];

function ArtworkLibrary() {
  const settings = useHouse((s) => s.settings);
  const selected = useHouse((s) => s.selected);
  const [assets, setAssets] = useState<CustomAsset[]>([]);
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      const next = await listAssets();
      setAssets(next);
      setActiveAssets(next);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the artwork library.");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const importFiles = async (files: FileList | null) => {
    if (!files) return;
    const supported = Array.from(files).filter((file) => ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type));
    if (supported.length !== files.length) setError("Only PNG, JPEG, WebP, and GIF images can be imported.");
    try {
      for (const file of supported) {
        await saveAsset({
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, ""),
          characterId: selected ?? "all",
          event: "drink",
          enabled: true,
          image: file,
        });
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this artwork.");
    }
  };

  const updateAsset = async (asset: CustomAsset, patch: Partial<CustomAsset>) => {
    const updated = { ...asset, ...patch };
    try {
      await saveAsset(updated);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this artwork.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-display text-xl text-ink">Artwork library</p>
        <p className="mt-1 text-sm text-ink-soft">Add transparent overlays and connect them to a character action. Original plates remain untouched.</p>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center justify-center border border-vermilion bg-paper-2 px-3 text-sm text-ink">
        Import images
        <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={(e) => { void importFiles(e.currentTarget.files); e.currentTarget.value = ""; }} />
      </label>
      {error ? <p role="alert" className="text-sm text-vermilion">{error}</p> : null}
      {assets.length === 0 ? <p className="text-sm text-ink-soft">No added artwork yet. Imported images are saved in this browser.</p> : null}
      {assets.map((asset) => (
        <div key={asset.id} className="flex flex-col gap-2 border border-line p-3">
          <div className="flex items-center gap-2">
            <AssetPreview asset={asset} />
            <input aria-label="Artwork name" className="min-h-10 min-w-0 flex-1 border border-line bg-paper-2 px-2 text-sm text-ink" value={asset.name} onChange={(e) => { void updateAsset(asset, { name: e.target.value }); }} />
            <button type="button" aria-label={`Remove ${asset.name}`} className="flex size-10 shrink-0 items-center justify-center text-ink" onClick={async () => { await deleteAsset(asset.id); await refresh(); }}><Trash2 className="size-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Artwork character" className="min-h-10 border border-line bg-paper-2 px-2 text-sm text-ink" value={asset.characterId} onChange={(e) => { void updateAsset(asset, { characterId: e.target.value }); }}>
              <option value="all">Every character</option>
              {settings.chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select aria-label="Artwork event" className="min-h-10 border border-line bg-paper-2 px-2 text-sm text-ink" value={asset.event} onChange={(e) => { void updateAsset(asset, { event: e.target.value as AssetEvent }); }}>
              {ASSET_EVENTS.map((event) => <option key={event.id} value={event.id}>{event.label}</option>)}
            </select>
          </div>
          <Toggle label={asset.enabled ? "Overlay enabled" : "Overlay hidden"} on={asset.enabled} onClick={() => { void updateAsset(asset, { enabled: !asset.enabled }); }} />
          <p className="text-xs text-ink-soft">Shown as a centered, non-destructive overlay on the character.</p>
        </div>
      ))}
    </div>
  );
}

function AssetPreview({ asset }: { asset: CustomAsset }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(asset.image);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [asset.id, asset.image]);
  return <img src={src} alt="" className="size-12 shrink-0 object-contain bg-paper-2" />;
}

function People() {
  const settings = useHouse((s) => s.settings);
  const selected = useHouse((s) => s.selected);
  const setSelected = useHouse((s) => s.setSelected);
  const person = settings.chars.find((c) => c.id === selected) ?? settings.chars[0];
  if (!person) return null;
  const world = getWorld();

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2">
        {settings.chars.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c.id)}
            className={
              "flex min-h-11 items-center gap-2 border px-2 text-left text-sm " +
              (c.id === person.id ? "border-vermilion bg-paper-2 text-ink" : "border-line text-ink-soft")
            }
          >
            <span className="inline-block size-3" style={{ backgroundColor: pigmentHex(c.pigment) }} />
            {c.name}
          </button>
        ))}
      </div>

      <div>
        <p className="font-display text-xl text-ink">{person.name}</p>
        <p className="text-sm text-ink-soft">{roleLabel(person.role)}</p>
        <p className="mt-2 text-sm text-ink">{activityLine(world, settings, person.id)}</p>
      </div>

      <Swatches
        label="Kimono pigment"
        value={person.pigment}
        onChange={(pigment) => useHouse.getState().patchChar(person.id, { pigment })}
      />
      <PatternSelect
        label="Kimono pattern"
        value={person.pattern}
        onChange={(pattern) => useHouse.getState().patchChar(person.id, { pattern })}
      />
      <Swatches
        label="Lining"
        value={person.lining}
        onChange={(lining) => useHouse.getState().patchChar(person.id, { lining })}
      />
      <Swatches
        label="Obi"
        value={person.obi}
        onChange={(obi) => useHouse.getState().patchChar(person.id, { obi })}
      />

      <div>
        <p className="mb-2 text-xs tracking-wide text-muted">Temperament</p>
        <div className="flex flex-col gap-3">
          {TRAIT_LABELS.map((trait) => (
            <Slider
              key={trait.key}
              label={trait.label}
              hint={trait.hint}
              value={person.traits[trait.key]}
              onChange={(value) => useHouse.getState().setTrait(person.id, trait.key, value)}
            />
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs tracking-wide text-muted">When the cup takes hold</span>
        <select
          className="min-h-11 border border-line bg-paper-2 px-2 text-sm text-ink"
          value={person.drinkStyle}
          onChange={(e) =>
            useHouse.getState().patchChar(person.id, { drinkStyle: e.target.value as DrinkStyle })
          }
        >
          <option value="talkative">Talkative</option>
          <option value="sleepy">Sleepy</option>
          <option value="sentimental">Sentimental</option>
          <option value="cross">Cross</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        {person.present ? (
          <>
            <button
              type="button"
              className="min-h-11 border border-ink text-sm text-ink"
              onClick={() => injectPlan(person.id, "drink")}
            >
              Offer a cup
            </button>
            <button
              type="button"
              className="min-h-11 border border-ink text-sm text-ink"
              onClick={() => injectPlan(person.id, "smoke")}
            >
              Pass the pipe
            </button>
            <button
              type="button"
              className="min-h-11 border border-ink text-sm text-ink"
              onClick={() => injectPlan(person.id, "sit")}
            >
              Let them sit
            </button>
            <button
              type="button"
              className="min-h-11 border border-ink text-sm text-ink"
              onClick={() => injectPlan(person.id, "wander")}
            >
              Send walking
            </button>
            <button
              type="button"
              className="min-h-11 border border-ink text-sm text-ink"
              onClick={() => injectPlan(person.id, "converse")}
            >
              Seek company
            </button>
            <button
              type="button"
              className="min-h-11 border border-ink text-sm text-ink"
              onClick={() => injectPlan(person.id, "watch")}
            >
              Watch the room
            </button>
            <button
              type="button"
              className="min-h-11 border border-ink text-sm text-ink col-span-2"
              onClick={() => useHouse.getState().patchChar(person.id, { present: false })}
            >
              Ask them to step out
            </button>
          </>
        ) : (
          <button
            type="button"
            className="col-span-2 min-h-11 border border-ink text-sm text-ink"
            onClick={() => {
              useHouse.getState().patchChar(person.id, { present: true });
              injectPlan(person.id, "wander");
            }}
          >
            Call {person.name} in
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        Ten adults, each a different print. Cloth pigment and pattern stay on the garment. Scroll to come closer.
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "min-h-11 border-b-2 px-1 text-sm " +
        (active ? "border-vermilion text-ink" : "border-transparent text-muted")
      }
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex min-h-11 flex-col justify-center gap-2">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink">{label}</span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </span>
      <input
        className="ink-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Swatches({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs tracking-wide text-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {PIGMENTS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.name}
            aria-label={p.name}
            onClick={() => onChange(p.id)}
            className={
              "size-11 border " + (value === p.id ? "border-vermilion" : "border-line")
            }
            style={{ backgroundColor: p.hex }}
          />
        ))}
      </div>
    </fieldset>
  );
}

function PatternSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PatternId;
  onChange: (id: PatternId) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs tracking-wide text-muted">{label}</span>
      <select
        className="min-h-11 border border-line bg-paper-2 px-2 text-sm text-ink"
        value={value}
        onChange={(e) => onChange(e.target.value as PatternId)}
      >
        {PATTERNS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center justify-between gap-3 border border-line px-3 text-left"
      aria-pressed={on}
    >
      <span className="text-sm text-ink">{label}</span>
      <span className={"text-xs " + (on ? "text-vermilion" : "text-muted")}>{on ? "On" : "Off"}</span>
    </button>
  );
}
