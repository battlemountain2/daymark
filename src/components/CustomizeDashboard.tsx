"use client";
import { useEffect, useRef, useState } from "react";
import {
  ACCENTS,
  PANELS,
  PALETTES,
  validPalette,
  panelPreference,
  spacePreference,
  type DashboardTab,
  type DashboardLayout,
} from "@/lib/dashboard-layout";
import {personalSettings} from "@/lib/personal-settings";
export default function CustomizeDashboard({
  tab,
  layout,
  onChange,
  onClose,
}: {
  tab: DashboardTab;
  layout: DashboardLayout;
  onChange: (key: string, value: unknown) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [space, setSpace] = useState(tab);
  const [savedPalette, setSavedPalette] = useState("forest");
  const [presetName,setPresetName]=useState("");
  const personal=personalSettings(layout);
  const presets=Object.entries(layout).filter(([key,value])=>key.startsWith('layout-preset:')&&value&&typeof value==='object').map(([id,value])=>({id,...value as {name:string;space:DashboardTab;values:DashboardLayout}})).filter(p=>p.space===space&&typeof p.name==='string'&&p.name.trim()&&p.values&&typeof p.values==='object'&&!Array.isArray(p.values));
  useEffect(() => {
    try { const p = localStorage.getItem("hb:pal") || localStorage.getItem("palette"); if (validPalette(p)) setSavedPalette(p); } catch {}
  }, []);
  const prefs = spacePreference(layout, space);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  const panels = PANELS.filter((p) => p.tabs.includes(space));
  const ordered = [...panels].sort(
    (a, b) =>
      (panelPreference(layout, space, a.id).order ?? PANELS.indexOf(a)) -
      (panelPreference(layout, space, b.id).order ?? PANELS.indexOf(b)),
  );
  function move(index: number, delta: number) {
    const next = [...ordered];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    next.forEach((p, i) =>
      onChange(`panel:${space}:${p.id}`, {
        ...panelPreference(layout, space, p.id),
        order: i,
      }),
    );
  }
  return (
    <dialog
      ref={ref}
      className="desk-dialog"
      aria-label="Customize Daymark"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="desk-dialog-head">
        <div>
          <h2>Customize</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Customize">
          ✕
        </button>
      </div>
      <label className="desk-field">
        Customize space
        <select
          value={space}
          onChange={(e) => setSpace(e.target.value as DashboardTab)}
        >
          {["main", "school", "media"].map((t) => (
            <option key={t} value={t}>
              {t[0].toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <p className="sub">
        Panels and spacing for {space}. Colors apply everywhere.
      </p>
      <details className="personal-setup"><summary>Personal defaults</summary>
        <label className="desk-field">Name in your greeting<input value={typeof layout.greetingName==='string'?layout.greetingName:personal.name} maxLength={40} onChange={e=>onChange('greetingName',e.target.value)}/></label>
        <label className="desk-field">Reading text<select value={personal.textSize} onChange={e=>onChange('textSize',e.target.value)}><option value="standard">Standard</option><option value="large">Larger</option></select></label>
        <label className="desk-field">Default workout unit<select value={personal.workoutUnit} onChange={e=>onChange('workoutUnit',e.target.value)}><option value="lb">Pounds · lb</option><option value="kg">Kilograms · kg</option></select></label>
        <label className="desk-field">Time to get to your next class<select value={personal.travelBuffer} onChange={e=>onChange('travelBuffer',Number(e.target.value))}>{[0,5,10,15,20,30,45].map(minutes=><option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label><p className="sub">Reserved before focus windows between campus classes. Online classes need no travel time.</p>
      </details>
      <label className="desk-field">
        Density
        <select
          value={prefs.density}
          onChange={(e) =>
            onChange(`space:${space}`, { ...prefs, density: e.target.value })
          }
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="airy">Airy</option>
        </select>
      </label>
      <div className="customize-panels">
        {ordered.map((p, i) => {
          const v = panelPreference(layout, space, p.id);
          return (
            <div key={p.id} className="customize-row">
              <label>
                <input
                  type="checkbox"
                  checked={!v.hidden}
                  onChange={(e) =>
                    onChange(`panel:${space}:${p.id}`, {
                      ...v,
                      hidden: !e.target.checked,
                    })
                  }
                />
                {p.title}
              </label>
              <div>
                <button
                  type="button"
                  aria-label={`Pin ${p.title} to sidebar`}
                  aria-pressed={v.pinned}
                  onClick={() => onChange(`panel:${space}:${p.id}`, {...v,pinned:!v.pinned})}
                >{v.pinned ? 'Pinned' : 'Pin'}</button>
                <button
                  type="button"
                  aria-label={`Move ${p.title} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${p.title} down`}
                  disabled={i === ordered.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <label className="desk-field">
        Shared palette
        <select value={typeof layout.palette === "string" ? layout.palette : savedPalette} onChange={(e) => onChange("palette", e.target.value)}>
          {PALETTES.map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
        </select>
      </label>
      <details className="personal-setup"><summary>Save or apply a layout</summary><p className="sub">Save panel order, visibility and spacing for {space}. Colors and personal defaults stay separate.</p>
        <form className="github-project-form" onSubmit={e=>{e.preventDefault();if(!presetName.trim())return;const values:DashboardLayout={[`space:${space}`]:spacePreference(layout,space)};panels.forEach(p=>values[`panel:${space}:${p.id}`]=panelPreference(layout,space,p.id));onChange(`layout-preset:${crypto.randomUUID()}`,{name:presetName.trim().slice(0,60),space,values});setPresetName('');}}><label className="desk-field">Layout name<input value={presetName} onChange={e=>setPresetName(e.target.value)} maxLength={60} required placeholder="Class days, weekend…"/></label><button type="submit">Save layout</button></form>
        {presets.map(preset=><button type="button" key={preset.id} onClick={()=>Object.entries(preset.values).forEach(([key,value])=>{if(key===`space:${space}`||panels.some(p=>key===`panel:${space}:${p.id}`))onChange(key,value);})}>Apply {preset.name}</button>)}
      </details>
      <label className="desk-field">
        Accent
        <select value={typeof layout.accent === "string" && layout.accent in ACCENTS ? layout.accent : "palette"} onChange={e => onChange("accent", e.target.value)}>
          <option value="palette">Palette default</option>
          {Object.keys(ACCENTS).map(a => <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>)}
        </select>
      </label>
      <label className="desk-field">
        Shared appearance
        <select
          value={
            typeof layout.appearance === "string" ? layout.appearance : "system"
          }
          onChange={(e) => onChange("appearance", e.target.value)}
        >
          <option value="system">Follow device</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() => {
          onChange(`space:${space}`, {});
          panels.forEach((p) =>
            onChange(`panel:${space}:${p.id}`, {
              ...panelPreference({},space,p.id),
            }),
          );
        }}
      >
        Reset this space
      </button>
    </dialog>
  );
}
