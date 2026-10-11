"use client";
import Link from "next/link";
import {pinnedPanels, type DashboardLayout, type DashboardTab, type PanelId} from "@/lib/dashboard-layout";
type Props = {space: DashboardTab; layout: DashboardLayout; inert?: boolean; desk?: boolean; onSpace?: (tab:DashboardTab)=>void; onPanel?: (id:PanelId)=>void; onDesk?:()=>void; onNotebook?:()=>void; onCustomize?:()=>void};
export default function DeskSidebar({space,layout,inert,desk,onSpace,onPanel,onDesk,onNotebook,onCustomize}:Props) {
 const pins=pinnedPanels(layout,space);
 return <aside className="desk-rail" inert={inert}>
  <Link href="/?space=main" className="desk-brand" onClick={e=>{if(onSpace){e.preventDefault();onSpace("main");}}}>daymark</Link>
  <nav aria-label="Dashboard spaces">{(["main","school","media"] as const).map(t=>onSpace ? <button key={t} aria-current={space===t&&!desk?"page":undefined} aria-pressed={space===t&&!desk} onClick={()=>onSpace(t)}>{t[0].toUpperCase()+t.slice(1)}</button> : <Link key={t} href={`/?space=${t}`} aria-current={space===t?"page":undefined}>{t[0].toUpperCase()+t.slice(1)}</Link>)}</nav>
  <div className="desk-pins"><span className="mono sub">Pinned</span>{pins.map(p=>onPanel?<button key={p.id} onClick={()=>onPanel(p.id)}>{p.title}</button>:<Link key={p.id} href={`/?space=${space}#${p.id}`}>{p.title}</Link>)}{!pins.length&&onCustomize&&<button onClick={onCustomize}>Choose shortcuts</button>}</div>
  <div className="desk-rail-bottom">
   {onDesk?<button aria-pressed={desk} onClick={onDesk}>Desk mode</button>:<Link href={`/?space=${space}&desk=1`}>Desk mode</Link>}
   <Link href="/notebook">Notebook</Link>
   {onNotebook&&<button onClick={onNotebook}>Quick note</button>}
   {onCustomize?<button onClick={onCustomize}>Customize</button>:<Link href={`/?space=${space}&customize=1`}>Customize</Link>}
  </div>
 </aside>;
}
